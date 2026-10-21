// Reads public content from PocketBase over the internal network (published records only,
// enforced by the collections' rules) and shapes it for the pages.
import PocketBase, { type RecordModel } from 'pocketbase';
import { PUBLIC_PB_URL } from '$app/env/public';
import { toLanguage, type Category, type Line, type MediaItem, type Reciter } from '#lib/media.ts';
import { normalizeSearch } from '#lib/search.ts';
import { PB_URL } from './pocketbase.ts';

type Collection = 'tracks' | 'videos';
const COLLECTIONS: Collection[] = ['tracks', 'videos'];
const READY = 'status = "ready"';
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

export const latest = (limit: number) => listItems('id != ""', {}, limit);

export async function categories(): Promise<Category[]> {
	return (await client().collection('categories').getFullList({ sort: 'order,name_fr' })).map(
		toCategory
	);
}

/** Number of ready items per category id. */
export async function categoryCounts(): Promise<Record<string, number>> {
	const pb = client();
	const counts: Record<string, number> = {};
	for (const c of COLLECTIONS) {
		const rows = await pb.collection(c).getFullList({ filter: READY, fields: 'category' });
		for (const row of rows) counts[row.category] = (counts[row.category] ?? 0) + 1;
	}
	return counts;
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

let surahCache: { at: number; list: import('#lib/quran.ts').SurahSummary[] } | null = null;
const SURAH_CACHE_MS = 10 * 60 * 1000;

/** The 114 surahs (from the text library), with verse and recitation counts. */
export async function surahs(): Promise<import('#lib/quran.ts').SurahSummary[]> {
	if (surahCache && Date.now() - surahCache.at < SURAH_CACHE_MS) return surahCache.list;
	const pb = client();
	const [texts, recitations] = await Promise.all([
		pb.collection('texts').getFullList({
			filter: 'slug ~ "sourate-"',
			sort: 'slug',
			fields: 'id,slug,title_fr,title_ar,lines'
		}),
		pb
			.collection('tracks')
			.getFullList({ filter: `${READY} && text.slug ~ "sourate-"`, fields: 'text' })
	]);
	const counts: Record<string, number> = {};
	for (const r of recitations) counts[r.text] = (counts[r.text] ?? 0) + 1;
	const list = texts.map((t) => ({
		number: Number(String(t.slug).replace('sourate-', '')),
		id: t.id,
		title_fr: t.title_fr,
		title_ar: t.title_ar,
		verses: (t.lines as Line[]).filter((l) => l.n).length,
		recitations: counts[t.id] ?? 0
	}));
	surahCache = { at: Date.now(), list };
	return list;
}

/** One surah's text and its synced recitations (audio playable with the verses). */
export async function surah(number: number) {
	const pb = client();
	const slug = `sourate-${String(number).padStart(3, '0')}`;
	const found = await pb
		.collection('texts')
		.getList(1, 1, { filter: pb.filter('slug = {:slug}', { slug }) });
	const text = found.items[0];
	if (!text) return null;
	const recitations = await pb.collection('tracks').getFullList({
		filter: pb.filter(`${READY} && text = {:id}`, { id: text.id }),
		sort: '-created',
		expand: ITEM_EXPAND,
		fields: ITEM_FIELDS
	});
	return {
		number,
		title_fr: text.title_fr as string,
		title_ar: text.title_ar as string,
		source: { label: text.source as string, url: text.source_url as string },
		lines: (text.lines ?? []) as Line[],
		recitations: recitations.map(toItem)
	};
}
