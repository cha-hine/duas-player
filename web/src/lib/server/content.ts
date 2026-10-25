// Reads public content from PocketBase over the internal network (published records only,
// enforced by the collections' rules) and shapes it for the pages.
import PocketBase, { type RecordModel } from 'pocketbase';
import { PUBLIC_PB_URL } from '$app/env/public';
import { toLanguage, type Category, type Line, type MediaItem, type Reciter } from '#lib/media.ts';
import { normalizeSearch } from '#lib/search.ts';
import { PB_URL } from './pocketbase.ts';

type Collection = 'tracks' | 'videos';
const COLLECTIONS: Collection[] = ['tracks', 'videos'];
/** Recitations imported in bulk (scripts/import-everyayah.ts). */
const BULK = ['EveryAyah', 'Le-Coran.com'];
const FROM_BULK = BULK.map((name) => `submitted_by = "${name}"`).join(' || ');
/**
 * Playable: processed by the worker, or imported in bulk (verse-joined MP3s that play as they
 * are, with exact timings, while the worker gets to them one by one).
 */
const READY = `(status = "ready" || (status != "error" && (${FROM_BULK})))`;
const EXPAND = 'category,reciter';
const ITEM_EXPAND = 'category,reciter,text';
// Lists leave out the heavy fields (waveform, energy, synced text, search text)
const LIST_FIELDS =
	'id,collectionName,slug,title_fr,title_ar,description_fr,description_ar,language,duration,created,' +
	'poster,stream,audio,hls_path,expand.category.*,expand.reciter.*';
const ITEM_FIELDS = `${LIST_FIELDS},lines,expand.text.source,expand.text.source_url`;
/** Upper bound per collection for one listing; plenty until the library grows a lot. */
const LIST_MAX = 500;

function client() {
	const pb = new PocketBase(PB_URL);
	pb.autoCancellation(false);
	return pb;
}

const fileUrl = (r: RecordModel, file: string, thumb?: string) =>
	file
		? `${PUBLIC_PB_URL}/api/files/${r.collectionName}/${r.id}/${encodeURIComponent(file)}${thumb ? `?thumb=${thumb}` : ''}`
		: null;

export const toCategory = (r: RecordModel): Category => ({
	id: r.id,
	slug: r.slug,
	name_fr: r.name_fr,
	name_ar: r.name_ar,
	description_fr: r.description_fr ?? '',
	description_ar: r.description_ar ?? '',
	icon: r.icon ?? ''
});

const toReciter = (r: RecordModel): Reciter => ({
	id: r.id,
	slug: r.slug,
	name_fr: r.name_fr,
	name_ar: r.name_ar,
	bio_fr: r.bio_fr ?? '',
	bio_ar: r.bio_ar ?? '',
	photoUrl: fileUrl(r, r.photo, '600x600')
});

function toItem(r: RecordModel): MediaItem {
	const isAudio = r.collectionName === 'tracks';
	return {
		kind: isAudio ? 'audio' : 'video',
		id: r.id,
		slug: r.slug,
		title_fr: r.title_fr,
		title_ar: r.title_ar,
		description_fr: r.description_fr ?? '',
		description_ar: r.description_ar ?? '',
		language: toLanguage(r.language ?? ''),
		duration: r.duration ?? 0,
		created: r.created,
		category: r.expand?.category ? toCategory(r.expand.category) : null,
		reciter: r.expand?.reciter ? toReciter(r.expand.reciter) : null,
		posterUrl: isAudio ? null : fileUrl(r, r.poster, '640x360'),
		audioUrl: isAudio ? fileUrl(r, r.stream || r.audio) : null,
		hlsUrl: !isAudio && r.hls_path ? `${PUBLIC_PB_URL}/media/${r.hls_path}` : null,
		lines: isAudio && Array.isArray(r.lines) ? (r.lines as Line[]) : [],
		textSource: r.expand?.text?.source
			? { label: r.expand.text.source, url: r.expand.text.source_url ?? '' }
			: null
	};
}

const newestFirst = (a: MediaItem, b: MediaItem) => b.created.localeCompare(a.created);

/** Ready items from both collections matching `filter`, newest first. */
async function listItems(filter: string, params: Record<string, unknown> = {}, limit = LIST_MAX) {
	const pb = client();
	const lists = await Promise.all(
		COLLECTIONS.map((c) =>
			pb.collection(c).getList(1, limit, {
				filter: pb.filter(`${READY} && (${filter})`, params),
				sort: '-created',
				expand: EXPAND,
				fields: LIST_FIELDS
			})
		)
	);
	return lists
		.flatMap((l) => l.items.map(toItem))
		.sort(newestFirst)
		.slice(0, limit);
}

export async function categories(): Promise<Category[]> {
	return (await client().collection('categories').getFullList({ sort: 'order,name_fr' })).map(
		toCategory
	);
}

export async function category(slug: string): Promise<Category | null> {
	const pb = client();
	const list = await pb
		.collection('categories')
		.getList(1, 1, { filter: pb.filter('slug = {:slug}', { slug }) });
	return list.items[0] ? toCategory(list.items[0]) : null;
}

export const itemsInCategory = (id: string) => listItems('category = {:id}', { id });

export async function item(kind: 'audio' | 'video', slug: string): Promise<MediaItem | null> {
	const pb = client();
	const list = await pb.collection(kind === 'audio' ? 'tracks' : 'videos').getList(1, 1, {
		filter: pb.filter(`${READY} && slug = {:slug}`, { slug }),
		// Audio may come with a library text, credited on its page
		expand: kind === 'audio' ? ITEM_EXPAND : EXPAND,
		fields: ITEM_FIELDS
	});
	return list.items[0] ? toItem(list.items[0]) : null;
}

/** Other items of the same category, for "more like this". */
export async function related(of: MediaItem, limit = 8): Promise<MediaItem[]> {
	if (!of.category) return [];
	const items = await listItems(
		'category = {:cat} && id != {:id}',
		{ cat: of.category.id, id: of.id },
		limit
	);
	return items;
}

export async function reciter(
	slug: string
): Promise<{ reciter: Reciter; items: MediaItem[] } | null> {
	const pb = client();
	const list = await pb
		.collection('reciters')
		.getList(1, 1, { filter: pb.filter('slug = {:slug}', { slug }) });
	if (!list.items[0]) return null;
	const found = toReciter(list.items[0]);
	return { reciter: found, items: await listItems('reciter = {:id}', { id: found.id }) };
}

/** Every word must appear in the normalised search text (accents and Arabic vowels ignored). */
export async function search(query: string, limit = 60): Promise<MediaItem[]> {
	const words = normalizeSearch(query).split(' ').filter(Boolean).slice(0, 6);
	if (words.length === 0) return [];
	const filter = words.map((_, i) => `search ~ {:w${i}}`).join(' && ');
	const params = Object.fromEntries(words.map((w, i) => [`w${i}`, w]));
	return listItems(filter, params, limit);
}

/** Synced text and loudness envelope of a track, fetched by the player when it starts. */
export async function trackSync(id: string): Promise<{ lines: Line[]; energy: number[] } | null> {
	const pb = client();
	try {
		const r = await pb.collection('tracks').getOne(id, { fields: 'lines,energy' });
		return {
			lines: Array.isArray(r.lines) ? (r.lines as Line[]) : [],
			energy: Array.isArray(r.energy) ? (r.energy as number[]) : []
		};
	} catch {
		return null;
	}
}

// ——— Quran: the surahs of the text library and the recitations synced with them ———

type QuranIndex = {
	surahs: import('#lib/quran.ts').SurahSummary[];
	/** Reciters with at least one synced surah, with how many. */
	reciters: (Reciter & { surahs: number })[];
};
let quranCache: { at: number; index: QuranIndex } | null = null;
const QURAN_CACHE_MS = 10 * 60 * 1000;

/** The 114 surahs (from the text library), with verse and recitation counts. */
export const surahs = async () => (await quranIndex()).surahs;

/** Reciters of the Quran, by name. */
export const quranReciters = async () => (await quranIndex()).reciters;

async function quranIndex(): Promise<QuranIndex> {
	if (quranCache && Date.now() - quranCache.at < QURAN_CACHE_MS) return quranCache.index;
	const pb = client();
	const [texts, recitations, reciters] = await Promise.all([
		pb.collection('texts').getFullList({
			filter: 'slug ~ "sourate-"',
			sort: 'slug',
			fields: 'id,slug,title_fr,title_ar,lines'
		}),
		// Counted by the database: listing the tracks themselves loads their lines too (~37 s)
		pb.collection('quran_recitation_counts').getFullList({ fields: 'text,reciter,n' }),
		pb.collection('reciters').getFullList({ sort: 'name_fr' })
	]);
	const counts: Record<string, number> = {};
	const byReciter: Record<string, number> = {};
	for (const r of recitations) {
		counts[r.text] = (counts[r.text] ?? 0) + r.n;
		if (r.reciter) byReciter[r.reciter] = (byReciter[r.reciter] ?? 0) + r.n;
	}
	const list = texts.map((t) => ({
		number: Number(String(t.slug).replace('sourate-', '')),
		id: t.id,
		title_fr: t.title_fr,
		title_ar: t.title_ar,
		verses: (t.lines as Line[]).filter((l) => l.n).length,
		recitations: counts[t.id] ?? 0
	}));
	const index: QuranIndex = {
		surahs: list,
		reciters: reciters
			.filter((r) => byReciter[r.id])
			.map((r) => ({ ...toReciter(r), surahs: byReciter[r.id] }))
	};
	quranCache = { at: Date.now(), index };
	return index;
}

/**
 * One surah's text and its synced recitations, without their lines (dozens of reciters times
 * hundreds of verses): the page loads the timings of the one chosen.
 */
export async function surah(number: number) {
	const pb = client();
	const slug = `sourate-${String(number).padStart(3, '0')}`;
	const found = await pb
		.collection('texts')
		.getList(1, 1, { filter: pb.filter('slug = {:slug}', { slug }) });
	const text = found.items[0];
	if (!text) return null;
	const recitations = (
		await pb.collection('tracks').getFullList({
			filter: pb.filter(`${READY} && text = {:id}`, { id: text.id }),
			sort: 'title_fr',
			expand: EXPAND,
			fields: LIST_FIELDS
		})
	)
		.map(toItem)
		.sort((a, b) => (a.reciter?.name_fr ?? '').localeCompare(b.reciter?.name_fr ?? ''));
	return {
		number,
		title_fr: text.title_fr as string,
		title_ar: text.title_ar as string,
		source: { label: text.source as string, url: text.source_url as string },
		lines: (text.lines ?? []) as Line[],
		recitations
	};
}

// ——— Quran translations to choose from (one record per translator and surah) ———

export type Translator = { id: string; name: string };
export type SurahTranslation = { basmala?: string; verses: string[] };

const translatorCache = new Map<string, { at: number; list: Translator[] }>();

/** Translators of a language, by name (cached like the Quran index). */
export async function translators(language: string): Promise<Translator[]> {
	const cached = translatorCache.get(language);
	if (cached && Date.now() - cached.at < QURAN_CACHE_MS) return cached.list;
	const pb = client();
	const rows = await pb.collection('translations').getFullList({
		filter: pb.filter('language = {:language} && surah = 1', { language }),
		sort: 'translator_name',
		fields: 'translator,translator_name'
	});
	const list = rows.map((r) => ({ id: r.translator as string, name: r.translator_name as string }));
	translatorCache.set(language, { at: Date.now(), list });
	return list;
}

/** One surah in one translation, or null. */
export async function surahTranslation(
	language: string,
	translator: string,
	surah: number
): Promise<SurahTranslation | null> {
	const pb = client();
	const found = await pb.collection('translations').getList(1, 1, {
		filter: pb.filter('language = {:language} && translator = {:translator} && surah = {:surah}', {
			language,
			translator,
			surah
		}),
		fields: 'text'
	});
	return (found.items[0]?.text as SurahTranslation | undefined) ?? null;
}
