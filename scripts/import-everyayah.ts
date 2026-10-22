// Imports Quran recitations from EveryAyah (everyayah.com, also versebyversequran.com): its
// recordings are one MP3 per verse, so each surah is rebuilt as one track whose verse timings
// are exact (the sum of the verses before), synced and playable without the home agent.
//
//   cd scripts
//   $env:SAKINA_EMAIL = "you@example.com"; $env:SAKINA_PASSWORD = "..."
//   node import-everyayah.ts [--reciters alafasy,husary] [--surahs 1,112-114] [--draft]
//
// Needs the surahs in the text library first (import-quran.ts). Tracks already imported (same
// slug) are skipped, so the script can be stopped and run again. A surah whose recording does
// not have the same verses as the text (some Warsh surahs) is skipped for that reciter.
import { joinMp3, readMp3, type Mp3Part } from './mp3.ts';

const API = process.env.SAKINA_API ?? 'https://sakina-api.toophan.net';
/** The site receives large files in pieces (Cloudflare refuses bodies over 100 MB). */
const SITE = process.env.SAKINA_SITE ?? 'https://sakina.toophan.net';
const EMAIL = process.env.SAKINA_EMAIL;
const PASSWORD = process.env.SAKINA_PASSWORD;
const DATA = 'https://everyayah.com/data';
const CHUNK = 32 * 1024 * 1024;
const PARALLEL = 6;
/** Surahs recited without a basmala line before them: Al-Fatiha (it is verse 1) and At-Tawba. */
const NO_BASMALA = new Set([1, 9]);

type Style = 'murattal' | 'mujawwad' | 'muallim' | 'warsh' | 'translation';
type Recitation = {
	/** EveryAyah folders, best first; the next one fills a surah the first lacks. */
	folders: string[];
	reciter: { slug: string; fr: string; ar: string };
	style: Style;
	language: string;
	/** Shown after the surah name when the recitation is not a plain murattal. */
	label?: { fr: string; ar: string };
};

const r = (slug: string, fr: string, ar: string) => ({ slug, fr, ar });
const MUJAWWAD = { fr: 'mujawwad', ar: 'مجوّد' };

const CATALOGUE: Recitation[] = [
	{ folders: ['Alafasy_128kbps', 'Alafasy_64kbps'], reciter: r('alafasy', 'Mishary Alafasy', 'مشاري راشد العفاسي'), style: 'murattal', language: 'ar' },
	{ folders: ['Abdul_Basit_Murattal_192kbps', 'Abdul_Basit_Murattal_64kbps', 'AbdulSamad_64kbps_QuranExplorer.Com'], reciter: r('abdul-basit', 'Abdul Basit Abdus-Samad', 'عبد الباسط عبد الصمد'), style: 'murattal', language: 'ar' },
	{ folders: ['Abdul_Basit_Mujawwad_128kbps'], reciter: r('abdul-basit', 'Abdul Basit Abdus-Samad', 'عبد الباسط عبد الصمد'), style: 'mujawwad', language: 'ar', label: MUJAWWAD },
	{ folders: ['Husary_128kbps', 'Husary_64kbps'], reciter: r('husary', 'Mahmoud Khalil Al-Husary', 'محمود خليل الحصري'), style: 'murattal', language: 'ar' },
	{ folders: ['Husary_128kbps_Mujawwad', 'Husary_Mujawwad_64kbps'], reciter: r('husary', 'Mahmoud Khalil Al-Husary', 'محمود خليل الحصري'), style: 'mujawwad', language: 'ar', label: MUJAWWAD },
	{ folders: ['Husary_Muallim_128kbps'], reciter: r('husary', 'Mahmoud Khalil Al-Husary', 'محمود خليل الحصري'), style: 'muallim', language: 'ar', label: { fr: 'enseignement', ar: 'المعلّم' } },
	{ folders: ['Minshawy_Murattal_128kbps', 'Menshawi_32kbps'], reciter: r('minshawi', 'Mohamed Siddiq Al-Minshawi', 'محمد صديق المنشاوي'), style: 'murattal', language: 'ar' },
	{ folders: ['Minshawy_Mujawwad_192kbps', 'Minshawy_Mujawwad_64kbps'], reciter: r('minshawi', 'Mohamed Siddiq Al-Minshawi', 'محمد صديق المنشاوي'), style: 'mujawwad', language: 'ar', label: MUJAWWAD },
	{ folders: ['Abdurrahmaan_As-Sudais_192kbps', 'Abdurrahmaan_As-Sudais_64kbps'], reciter: r('sudais', 'Abdurrahman As-Sudais', 'عبد الرحمن السديس'), style: 'murattal', language: 'ar' },
	{ folders: ['Saood_ash-Shuraym_128kbps', 'Saood_ash-Shuraym_64kbps'], reciter: r('shuraim', 'Saud Ash-Shuraim', 'سعود الشريم'), style: 'murattal', language: 'ar' },
	{ folders: ['MaherAlMuaiqly128kbps', 'Maher_AlMuaiqly_64kbps'], reciter: r('muaiqly', 'Maher Al-Muaiqly', 'ماهر المعيقلي'), style: 'murattal', language: 'ar' },
	{ folders: ['Abu_Bakr_Ash-Shaatree_128kbps', 'Abu_Bakr_Ash-Shaatree_64kbps'], reciter: r('shatri', 'Abu Bakr Ash-Shatri', 'أبو بكر الشاطري'), style: 'murattal', language: 'ar' },
	{ folders: ['Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net', 'ahmed_ibn_ali_al_ajamy_128kbps', 'Ahmed_ibn_Ali_al-Ajamy_64kbps_QuranExplorer.Com'], reciter: r('ajamy', 'Ahmed Al-Ajamy', 'أحمد بن علي العجمي'), style: 'murattal', language: 'ar' },
	{ folders: ['Ghamadi_40kbps'], reciter: r('ghamdi', 'Saad Al-Ghamdi', 'سعد الغامدي'), style: 'murattal', language: 'ar' },
	{ folders: ['Hani_Rifai_192kbps', 'Hani_Rifai_64kbps'], reciter: r('rifai', 'Hani Ar-Rifai', 'هاني الرفاعي'), style: 'murattal', language: 'ar' },
	{ folders: ['Hudhaify_128kbps', 'Hudhaify_64kbps', 'Hudhaify_32kbps'], reciter: r('hudhaify', 'Ali Al-Hudhaify', 'علي الحذيفي'), style: 'murattal', language: 'ar' },
	{ folders: ['Ibrahim_Akhdar_64kbps', 'Ibrahim_Akhdar_32kbps'], reciter: r('akhdar', 'Ibrahim Al-Akhdar', 'إبراهيم الأخضر'), style: 'murattal', language: 'ar' },
	{ folders: ['Mohammad_al_Tablaway_128kbps', 'Mohammad_al_Tablaway_64kbps'], reciter: r('tablawi', 'Mohammad At-Tablawi', 'محمد محمود الطبلاوي'), style: 'murattal', language: 'ar' },
	{ folders: ['Muhammad_Ayyoub_128kbps', 'Muhammad_Ayyoub_64kbps', 'Muhammad_Ayyoub_32kbps'], reciter: r('ayyub', 'Muhammad Ayyub', 'محمد أيوب'), style: 'murattal', language: 'ar' },
	{ folders: ['Muhammad_Jibreel_128kbps', 'Muhammad_Jibreel_64kbps'], reciter: r('jibreel', 'Muhammad Jibreel', 'محمد جبريل'), style: 'murattal', language: 'ar' },
	{ folders: ['Mustafa_Ismail_48kbps'], reciter: r('mustafa-ismail', 'Mustafa Ismail', 'مصطفى إسماعيل'), style: 'murattal', language: 'ar' },
	{ folders: ['Abdullah_Basfar_192kbps', 'Abdullah_Basfar_64kbps', 'Abdullah_Basfar_32kbps'], reciter: r('basfar', 'Abdullah Basfar', 'عبد الله بصفر'), style: 'murattal', language: 'ar' },
	{ folders: ['Salaah_AbdulRahman_Bukhatir_128kbps'], reciter: r('bukhatir', 'Salah Bukhatir', 'صلاح بو خاطر'), style: 'murattal', language: 'ar' },
	{ folders: ['Muhsin_Al_Qasim_192kbps'], reciter: r('muhsin-al-qasim', 'Muhsin Al-Qasim', 'محسن القاسم'), style: 'murattal', language: 'ar' },
	{ folders: ['Abdullaah_3awwaad_Al-Juhaynee_128kbps'], reciter: r('juhany', 'Abdullah Al-Juhany', 'عبد الله عواد الجهني'), style: 'murattal', language: 'ar' },
	{ folders: ['Salah_Al_Budair_128kbps'], reciter: r('budair', 'Salah Al-Budair', 'صلاح البدير'), style: 'murattal', language: 'ar' },
	{ folders: ['Abdullah_Matroud_128kbps'], reciter: r('matroud', 'Abdullah Al-Matroud', 'عبد الله المطرود'), style: 'murattal', language: 'ar' },
	{ folders: ['Ahmed_Neana_128kbps'], reciter: r('neana', 'Ahmed Neana', 'أحمد نعينع'), style: 'murattal', language: 'ar' },
	{ folders: ['Muhammad_AbdulKareem_128kbps'], reciter: r('muhammad-abdulkareem', 'Muhammad Abdul Kareem', 'محمد عبد الكريم'), style: 'murattal', language: 'ar' },
	{ folders: ['khalefa_al_tunaiji_64kbps'], reciter: r('tunaiji', 'Khalifa At-Tunaiji', 'خليفة الطنيجي'), style: 'murattal', language: 'ar' },
	{ folders: ['mahmoud_ali_al_banna_32kbps'], reciter: r('banna', 'Mahmoud Ali Al-Banna', 'محمود علي البنا'), style: 'murattal', language: 'ar' },
	{ folders: ['Karim_Mansoori_40kbps'], reciter: r('karim-mansouri', 'Karim Mansouri', 'كريم منصوري'), style: 'murattal', language: 'ar' },
	{ folders: ['Parhizgar_48kbps'], reciter: r('parhizgar', 'Shahriar Parhizgar', 'شهريار پرهيزگار'), style: 'murattal', language: 'ar' },
	{ folders: ['Khaalid_Abdullaah_al-Qahtaanee_192kbps'], reciter: r('qahtani', 'Khalid Al-Qahtani', 'خالد القحطاني'), style: 'murattal', language: 'ar' },
	{ folders: ['Yasser_Ad-Dussary_128kbps'], reciter: r('dossari', 'Yasser Ad-Dossari', 'ياسر الدوسري'), style: 'murattal', language: 'ar' },
	{ folders: ['Nasser_Alqatami_128kbps'], reciter: r('qatami', 'Nasser Al-Qatami', 'ناصر القطامي'), style: 'murattal', language: 'ar' },
	{ folders: ['Ali_Hajjaj_AlSuesy_128kbps'], reciter: r('suwaisi', 'Ali Hajjaj As-Suwaisi', 'علي حجاج السويسي'), style: 'murattal', language: 'ar' },
	{ folders: ['Sahl_Yassin_128kbps'], reciter: r('sahl-yassin', 'Sahl Yassin', 'سهل ياسين'), style: 'murattal', language: 'ar' },
	{ folders: ['aziz_alili_128kbps'], reciter: r('alili', 'Aziz Alili', 'عزيز عليلي'), style: 'murattal', language: 'ar' },
	{ folders: ['Yaser_Salamah_128kbps'], reciter: r('yaser-salamah', 'Yaser Salamah', 'ياسر سلامة'), style: 'murattal', language: 'ar' },
	{ folders: ['Akram_AlAlaqimy_128kbps'], reciter: r('alaqimy', 'Akram Al-Alaqimy', 'أكرم العلاقمي'), style: 'murattal', language: 'ar' },
	{ folders: ['Ali_Jaber_64kbps'], reciter: r('ali-jaber', 'Ali Jaber', 'علي جابر'), style: 'murattal', language: 'ar' },
	{ folders: ['Fares_Abbad_64kbps'], reciter: r('fares-abbad', 'Fares Abbad', 'فارس عباد'), style: 'murattal', language: 'ar' },
	{ folders: ['Ayman_Sowaid_64kbps'], reciter: r('ayman-suwaid', 'Ayman Suwaid', 'أيمن سويد'), style: 'murattal', language: 'ar' },
	// Warsh 'an Nafi': the text shown is Hafs; surahs whose verses are counted differently are skipped
	{ folders: ['warsh/warsh_ibrahim_aldosary_128kbps'], reciter: r('ibrahim-dosary', 'Ibrahim Ad-Dosary', 'إبراهيم الدوسري'), style: 'warsh', language: 'ar', label: { fr: 'warsh', ar: 'ورش' } },
	{ folders: ['warsh/warsh_yassin_al_jazaery_64kbps'], reciter: r('yassin-al-jazairi', 'Yassin Al-Jazairi', 'ياسين الجزائري'), style: 'warsh', language: 'ar', label: { fr: 'warsh', ar: 'ورش' } },
	{ folders: ['warsh/warsh_Abdul_Basit_128kbps'], reciter: r('abdul-basit', 'Abdul Basit Abdus-Samad', 'عبد الباسط عبد الصمد'), style: 'warsh', language: 'ar', label: { fr: 'warsh', ar: 'ورش' } },
	// Recited translations (verse by verse, sometimes after the Arabic)
	{ folders: ['MultiLanguage/Basfar_Walk_192kbps'], reciter: r('basfar', 'Abdullah Basfar', 'عبد الله بصفر'), style: 'translation', language: 'en', label: { fr: 'avec traduction anglaise (Ibrahim Walk)', ar: 'مع الترجمة الإنجليزية' } },
	{ folders: ['English/Sahih_Intnl_Ibrahim_Walk_192kbps'], reciter: r('ibrahim-walk', 'Ibrahim Walk', 'إبراهيم ووك'), style: 'translation', language: 'en', label: { fr: 'traduction anglaise (Sahih International)', ar: 'الترجمة الإنجليزية' } },
	{ folders: ['translations/Makarem_Kabiri_16Kbps'], reciter: r('kabiri', 'Kabiri', 'کبیری'), style: 'translation', language: 'fa', label: { fr: 'traduction persane (Makarem)', ar: 'الترجمة الفارسية' } },
	{ folders: ['translations/Fooladvand_Hedayatfar_40Kbps'], reciter: r('hedayatfar', 'Hedayatfar', 'هدایت‌فر'), style: 'translation', language: 'fa', label: { fr: 'traduction persane (Fooladvand)', ar: 'الترجمة الفارسية' } },
	{ folders: ['translations/urdu_shamshad_ali_khan_46kbps'], reciter: r('shamshad-ali-khan', 'Shamshad Ali Khan', 'شمشاد علی خان'), style: 'translation', language: 'ur', label: { fr: 'traduction ourdoue', ar: 'الترجمة الأردية' } },
	{ folders: ['translations/urdu_farhat_hashmi'], reciter: r('farhat-hashmi', 'Farhat Hashmi', 'فرحت ہاشمی'), style: 'translation', language: 'ur', label: { fr: 'traduction ourdoue mot à mot', ar: 'الترجمة الأردية' } },
	{ folders: ['translations/azerbaijani/balayev'], reciter: r('balayev', 'Balayev', 'بالايف'), style: 'translation', language: 'az', label: { fr: 'traduction azérie', ar: 'الترجمة الأذرية' } },
	{ folders: ['translations/besim_korkut_ajet_po_ajet'], reciter: r('besim-korkut', 'Besim Korkut', 'بسيم كوركوت'), style: 'translation', language: 'other', label: { fr: 'traduction bosniaque', ar: 'الترجمة البوسنية' } }
];

// ——— Arguments ———

function arg(name: string): string | undefined {
	const i = process.argv.indexOf(`--${name}`);
	return i >= 0 ? process.argv[i + 1] : undefined;
}
/** "1,112-114" -> [1, 112, 113, 114] */
function numbers(spec: string | undefined): number[] {
	if (!spec) return Array.from({ length: 114 }, (_, i) => i + 1);
	return spec.split(',').flatMap((part) => {
		const [a, b] = part.split('-').map(Number);
		return Array.from({ length: (b || a) - a + 1 }, (_, i) => a + i);
	});
}
const onlyReciters = arg('reciters')?.split(',');
const surahList = numbers(arg('surahs'));
const published = !process.argv.includes('--draft');
if (!EMAIL || !PASSWORD) {
	console.error('Set SAKINA_EMAIL and SAKINA_PASSWORD (see the top of this file).');
	process.exit(1);
}

// ——— Sakina API ———

const auth = await fetch(`${API}/api/collections/_superusers/auth-with-password`, {
	method: 'POST',
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify({ identity: EMAIL, password: PASSWORD })
});
if (!auth.ok) {
	console.error(`Login failed (${auth.status}).`);
	process.exit(1);
}
const token: string = (await auth.json()).token;

async function call(url: string, init: RequestInit = {}) {
	for (let attempt = 1; ; attempt++) {
		const res = await fetch(url, { ...init, headers: { Authorization: token, ...init.headers } });
		if (res.ok) return res.status === 204 ? null : res.json();
		const text = await res.text();
		if (attempt >= 5 || res.status < 500) throw new Error(`${init.method ?? 'GET'} ${url} -> ${res.status} ${text}`);
		await new Promise((r) => setTimeout(r, 5000 * attempt));
	}
}
const json = (method: string, body: unknown) => ({
	method,
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify(body)
});
const pbFilter = (expr: string) => `filter=${encodeURIComponent(expr)}`;
const first = async (collection: string, expr: string, fields = '') =>
	(await call(`${API}/api/collections/${collection}/records?perPage=1&${pbFilter(expr)}${fields ? `&fields=${fields}` : ''}`)).items[0];

type TextLine = { n?: number; ar?: string; [lang: string]: string | number | undefined };

const coran = await first('categories', 'slug="coran"');
if (!coran) throw new Error('Category "coran" not found');

const texts = new Map<number, { id: string; title_fr: string; title_ar: string; lines: TextLine[] }>();
for (const t of (await call(`${API}/api/collections/texts/records?perPage=200&${pbFilter('slug ~ "sourate-"')}`)).items) {
	texts.set(Number(String(t.slug).replace('sourate-', '')), t);
}
if (texts.size < 114) throw new Error(`Only ${texts.size} surahs in the text library: run import-quran.ts first`);

const reciterIds = new Map<string, string>();
async function reciterId(rc: Recitation['reciter']): Promise<string> {
	if (reciterIds.has(rc.slug)) return reciterIds.get(rc.slug)!;
	const found = await first('reciters', `slug="${rc.slug}"`, 'id');
	const id = found?.id ?? (await call(`${API}/api/collections/reciters/records`, json('POST', { slug: rc.slug, name_fr: rc.fr, name_ar: rc.ar }))).id;
	reciterIds.set(rc.slug, id);
	return id;
}

/** Sends the file through the site's chunked upload, which creates the track. */
async function upload(file: Uint8Array<ArrayBuffer>, filename: string, data: Record<string, string | boolean>) {
	const status = await call(`${SITE}/api/uploads`, json('POST', { filename, size: file.length, type: 'audio/mpeg' }));
	for (let offset = 0; offset < file.length; offset += CHUNK) {
		await call(`${SITE}/api/uploads/${status.id}`, {
			method: 'PUT',
			headers: { 'Upload-Offset': String(offset), 'content-type': 'application/offset+octet-stream' },
			body: file.subarray(offset, offset + CHUNK)
		});
	}
	return call(`${SITE}/api/uploads/${status.id}/complete`, json('POST', { collection: 'tracks', data }));
}

// ——— EveryAyah ———

/** The MP3 at `url`, or null when the folder does not have it. */
async function mp3(url: string): Promise<Mp3Part | null> {
	for (let attempt = 1; ; attempt++) {
		try {
			const res = await fetch(url);
			if (res.status === 404) return null;
			if (!res.ok) throw new Error(`${url} -> ${res.status}`);
			return readMp3(new Uint8Array(await res.arrayBuffer()));
		} catch (e) {
			if (attempt >= 4) throw e;
			await new Promise((r) => setTimeout(r, 3000 * attempt));
		}
	}
}

const file = (folder: string, sura: number, aya: number) =>
	`${DATA}/${folder}/${String(sura).padStart(3, '0')}${String(aya).padStart(3, '0')}.mp3`;

/** Runs `tasks` with at most PARALLEL at once, keeping their order. */
async function limited<T>(tasks: (() => Promise<T>)[]): Promise<T[]> {
	const out = new Array<T>(tasks.length);
	let next = 0;
	await Promise.all(
		Array.from({ length: PARALLEL }, async () => {
			while (next < tasks.length) {
				const i = next++;
				out[i] = await tasks[i]();
			}
		})
	);
	return out;
}

/**
 * The verses of `sura` from the first folder that has them all, recorded alike (frames are
 * joined without re-encoding, so one sample rate) and without an extra verse (another verse
 * count), with the basmala before them when recorded alike. `why` says why none fits.
 */
async function recording(rec: Recitation, sura: number, verses: number) {
	const why: string[] = [];
	for (const folder of rec.folders) {
		if ((await mp3(file(folder, sura, verses + 1))) !== null) {
			why.push(`${folder}: more than ${verses} verses`);
			continue;
		}
		const parts = await limited(Array.from({ length: verses }, (_, i) => () => mp3(file(folder, sura, i + 1))));
		const missing = parts.filter((p) => p === null).length;
		if (missing) {
			why.push(`${folder}: ${missing} verses missing`);
			continue;
		}
		const found = parts as Mp3Part[];
		const alike = (p: Mp3Part | null) =>
			!!p && p.sampleRate === found[0].sampleRate && p.samplesPerFrame === found[0].samplesPerFrame;
		if (!found.every(alike)) {
			why.push(`${folder}: verses recorded at different sample rates`);
			continue;
		}
		let basmala: Mp3Part | null = null;
		if (!NO_BASMALA.has(sura)) {
			basmala = await mp3(file(folder, sura, 0));
			if (!alike(basmala)) basmala = await mp3(file(folder, 1, 1));
			if (!alike(basmala)) basmala = null;
		}
		return { folder, basmala, verses: found, why };
	}
	return { why };
}

// ——— Import ———

const slugOf = (rec: Recitation, sura: number) =>
	`sourate-${String(sura).padStart(3, '0')}-${rec.reciter.slug}${rec.style === 'murattal' ? '' : `-${rec.style}`}` +
	(rec.style === 'translation' ? `-${rec.language}` : '');

const chosen = CATALOGUE.filter((rec) => !onlyReciters || onlyReciters.includes(rec.reciter.slug));
const started = Date.now();
let done = 0;
let sent = 0;
const skipped: string[] = [];

/** Builds and uploads one surah of one recitation; returns false when EveryAyah lacks it. */
async function importSurah(rec: Recitation, reciter: string, sura: number, slug: string) {
	const text = texts.get(sura)!;
	const verseLines = text.lines.filter((l) => l.n);
	const found = await recording(rec, sura, verseLines.length);
	if (!found.verses) {
		console.log(`  ${sura}: skipped (${found.why.join('; ')})`);
		return false;
	}

	// Lines of the text with their exact times; the basmala line only when it is recorded
	const parts: Mp3Part[] = [];
	const lines: (TextLine & { start: number; end: number })[] = [];
	let at = 0;
	const add = (line: TextLine, part: Mp3Part) => {
		parts.push(part);
		lines.push({ ...line, start: Math.round(at * 100) / 100, end: Math.round((at + part.seconds) * 100) / 100 });
		at += part.seconds;
	};
	const basmalaLine = text.lines.find((l) => !l.n);
	if (basmalaLine && found.basmala) add(basmalaLine, found.basmala);
	const verses = found.verses;
	verseLines.forEach((line, i) => add(line, verses[i]));
	const audio = joinMp3(parts);

	const record = await upload(audio, `${slug}.mp3`, {
		title_fr: `${text.title_fr}${rec.label ? ` (${rec.label.fr})` : ''}`,
		title_ar: `${text.title_ar}${rec.label ? ` (${rec.label.ar})` : ''}`,
		slug,
		category: coran.id,
		reciter,
		language: rec.language,
		published,
		status: 'pending',
		origin_url: `${DATA}/${found.folder}/`,
		submitted_by: 'EveryAyah'
	});
	// Text and timings together: already synced, so not queued for the home agent
	await call(`${API}/api/collections/tracks/records/${record.id}`, json('PATCH', { text: text.id, lines }));

	done++;
	sent += audio.length;
	const minutes = (Date.now() - started) / 60000;
	console.log(
		`  ${sura}: ${lines.length} lines, ${(at / 60).toFixed(1)} min, ${(audio.length / 1e6).toFixed(1)} MB` +
			` · total ${done} tracks, ${(sent / 1e9).toFixed(2)} GB in ${minutes.toFixed(0)} min`
	);
	return true;
}

for (const rec of chosen) {
	const reciter = await reciterId(rec.reciter);
	const name = `${rec.reciter.fr}${rec.label ? ` (${rec.label.fr})` : ''}`;
	console.log(`\n== ${name}`);
	for (const sura of surahList) {
		const slug = slugOf(rec, sura);
		try {
			const existing = await first('tracks', `slug="${slug}"`, 'id,text');
			if (existing?.text) continue;
			// Stopped between the upload and its timings last time: done again
			if (existing) await call(`${API}/api/collections/tracks/records/${existing.id}`, { method: 'DELETE' });
			if (!(await importSurah(rec, reciter, sura, slug))) skipped.push(slug);
		} catch (e) {
			// One surah failing (network, server) does not stop the import; a new run retries it
			console.log(`  ${sura}: FAILED ${e instanceof Error ? e.message : e}`);
			skipped.push(slug);
		}
	}
}
console.log(`\nDone: ${done} tracks imported, ${skipped.length} skipped or failed${skipped.length ? `:\n  ${skipped.join('\n  ')}` : '.'}`);
