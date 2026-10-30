// Imports Quran recitations from EveryAyah (everyayah.com, also versebyversequran.com): its
// recordings are one MP3 per verse, so each surah is rebuilt as one track whose verse timings
// are exact (the sum of the verses before), synced and playable without the home agent.
//
//   cd scripts
//   $env:SAKINA_EMAIL = "you@example.com"; $env:SAKINA_PASSWORD = "..."
//   node import-everyayah.ts [--reciters alafasy,husary] [--surahs 1,112-114] [--draft] [--repair]
//     [--leclerc D:/coran-francais-verset-par-verset --xlsx C:/path/41-traductions-Coran.xlsx]
//
// --leclerc adds Youssouf Leclerc reading the French translation (Hamidullah, revised edition),
// from Le-Coran.com, in a local folder named like EveryAyah's; its tracks show that translation,
// read from the "41 traductions du Coran" spreadsheet (--xlsx), instead of the library's.
//
// Needs the surahs in the text library first (import-quran.ts). Tracks already imported (same
// slug) are skipped, so the script can be stopped and run again; those that failed are done
// again. A surah whose recording does not have the same verses as the text (some Warsh surahs)
// is skipped for that reciter.
//
// --repair downloads the verses of the tracks already there too and replaces those whose verse
// files hold frame-like junk, which the earlier MP3 reader joined into the audio (playback
// stopping or crackling mid-surah, verses drifting from the text), or whose cut-off verses
// can now be taken from another folder.
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import ExcelJS from 'exceljs';
import { joinMp3, readMp3, type Mp3Part } from './mp3.ts';

const API = process.env.SAKINA_API ?? 'https://sakina-api.toophan.net';
/** The site receives large files in pieces (Cloudflare refuses bodies over 100 MB). */
const SITE = process.env.SAKINA_SITE ?? 'https://sakina.toophan.net';
const EMAIL = process.env.SAKINA_EMAIL;
const PASSWORD = process.env.SAKINA_PASSWORD;
const DATA = 'https://everyayah.com/data';
/** Small enough to pass within Cloudflare's 100 s per request on a slow upload. */
const CHUNK = 8 * 1024 * 1024;
const PARALLEL = 6;
/** Surahs recited without a basmala line before them: Al-Fatiha (it is verse 1) and At-Tawba. */
const NO_BASMALA = new Set([1, 9]);

type Style = 'murattal' | 'mujawwad' | 'muallim' | 'warsh' | 'translation';
type Recitation = {
	/** EveryAyah folders (or local ones), best first; the next one fills a surah the first lacks. */
	folders: string[];
	reciter: { slug: string; fr: string; ar: string };
	style: Style;
	language: string;
	/** Shown after the surah name when the recitation is not a plain murattal. */
	label?: { fr: string; ar: string };
	/** Where the recordings come from, when not EveryAyah. */
	source?: { name: string; url: string };
	/** French translation read aloud, from the spreadsheet, shown instead of the library's. */
	french?: string;
};

const r = (slug: string, fr: string, ar: string) => ({ slug, fr, ar });

const CATALOGUE: Recitation[] = [
	{ folders: ['Alafasy_128kbps', 'Alafasy_64kbps'], reciter: r('alafasy', 'Mishary Alafasy', 'مشاري راشد العفاسي'), style: 'murattal', language: 'ar' },
	{ folders: ['Abdul_Basit_Murattal_192kbps', 'Abdul_Basit_Murattal_64kbps', 'AbdulSamad_64kbps_QuranExplorer.Com'], reciter: r('abdul-basit', 'Abdul Basit Abdus-Samad', 'عبد الباسط عبد الصمد'), style: 'murattal', language: 'ar' },
	{ folders: ['Husary_128kbps', 'Husary_64kbps'], reciter: r('husary', 'Mahmoud Khalil Al-Husary', 'محمود خليل الحصري'), style: 'murattal', language: 'ar' },
	{ folders: ['Minshawy_Murattal_128kbps', 'Menshawi_32kbps'], reciter: r('minshawi', 'Mohamed Siddiq Al-Minshawi', 'محمد صديق المنشاوي'), style: 'murattal', language: 'ar' },
	{ folders: ['Abdurrahmaan_As-Sudais_192kbps', 'Abdurrahmaan_As-Sudais_64kbps'], reciter: r('sudais', 'Abdurrahman As-Sudais', 'عبد الرحمن السديس'), style: 'murattal', language: 'ar' },
	{ folders: ['Saood_ash-Shuraym_128kbps', 'Saood_ash-Shuraym_64kbps'], reciter: r('shuraim', 'Saud Ash-Shuraim', 'سعود الشريم'), style: 'murattal', language: 'ar' },
	{ folders: ['MaherAlMuaiqly128kbps', 'Maher_AlMuaiqly_64kbps'], reciter: r('muaiqly', 'Maher Al-Muaiqly', 'ماهر المعيقلي'), style: 'murattal', language: 'ar' },
	{ folders: ['Abu_Bakr_Ash-Shaatree_128kbps', 'Abu_Bakr_Ash-Shaatree_64kbps'], reciter: r('shatri', 'Abu Bakr Ash-Shatri', 'أبو بكر الشاطري'), style: 'murattal', language: 'ar' },
	{ folders: ['Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net', 'ahmed_ibn_ali_al_ajamy_128kbps', 'Ahmed_ibn_Ali_al-Ajamy_64kbps_QuranExplorer.Com'], reciter: r('ajamy', 'Ahmed Al-Ajamy', 'أحمد بن علي العجمي'), style: 'murattal', language: 'ar' },
	{ folders: ['Ghamadi_40kbps'], reciter: r('ghamdi', 'Saad Al-Ghamdi', 'سعد الغامدي'), style: 'murattal', language: 'ar' }
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
const leclercDir = arg('leclerc');
if (leclercDir) {
	CATALOGUE.push({
		folders: [leclercDir],
		reciter: r('youssouf-leclerc', 'Youssouf Leclerc', 'يوسف لوكلير'),
		style: 'translation',
		language: 'fr',
		label: { fr: 'traduction française (Hamidullah)', ar: 'الترجمة الفرنسية' },
		source: { name: 'Le-Coran.com', url: 'https://www.le-coran.com/' },
		french: 'Hamidullah révisé'
	});
}
const onlyReciters = arg('reciters')?.split(',');
const surahList = numbers(arg('surahs'));
const published = !process.argv.includes('--draft');
const repair = process.argv.includes('--repair');
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
	let offset = 0;
	for (let failures = 0; offset < file.length; ) {
		try {
			offset = (
				await call(`${SITE}/api/uploads/${status.id}`, {
					method: 'PUT',
					headers: { 'Upload-Offset': String(offset), 'content-type': 'application/offset+octet-stream' },
					body: file.subarray(offset, offset + CHUNK)
				})
			).offset;
		} catch (e) {
			// A cut-off chunk may be partly saved: carry on from what the server has
			if (++failures > 5) throw e;
			await new Promise((r) => setTimeout(r, 5000 * failures));
			offset = (await call(`${SITE}/api/uploads/${status.id}`)).offset;
		}
	}
	return call(`${SITE}/api/uploads/${status.id}/complete`, json('POST', { collection: 'tracks', data }));
}

// ——— EveryAyah ———

/** The MP3 at `url` (or local path), or null when the folder does not have it. */
async function mp3(url: string): Promise<Mp3Part | null> {
	if (!url.startsWith('http')) {
		try {
			return readMp3(new Uint8Array(await readFile(url)));
		} catch (e) {
			if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
			throw e;
		}
	}
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

const isLocal = (folder: string) => isAbsolute(folder);
const file = (folder: string, sura: number, aya: number) => {
	const name = `${String(sura).padStart(3, '0')}${String(aya).padStart(3, '0')}.mp3`;
	return isLocal(folder) ? join(folder, name) : `${DATA}/${folder}/${name}`;
};

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
 * Tells whether a verse recording is cut off: under a quarter of the surah's usual time per
 * letter of its text (verses of at least 20 letters, so short ones never count).
 */
function cutOff(parts: Mp3Part[], letters: number[]) {
	const pace = parts.map((p, i) => (letters[i] >= 20 ? p.seconds / letters[i] : NaN)).filter((v) => !isNaN(v)).sort((a, b) => a - b);
	const usual = pace[Math.floor(pace.length / 2)] ?? 0;
	return (p: Mp3Part, i: number) => letters[i] >= 20 && p.seconds / letters[i] < usual / 4;
}

/** ffmpeg on this computer (FFMPEG names another one), or null: odd verses are then not re-encoded. */
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
let ffmpegFound: Promise<boolean> | undefined;
const hasFfmpeg = () =>
	(ffmpegFound ??= new Promise((resolve) => {
		const child = spawn(FFMPEG, ['-version'], { stdio: 'ignore' });
		child.on('error', () => resolve(false));
		child.on('close', (code) => resolve(code === 0));
	}));

/** The verse at `url` re-encoded like `like` (sample rate, channels, bitrate), so it can be joined. */
async function encodeLike(url: string, like: Mp3Part): Promise<Mp3Part> {
	const input = isLocal(url) ? await readFile(url) : new Uint8Array(await (await fetch(url)).arrayBuffer());
	// Only the sound: some verses carry a cover picture, which the tagless output cannot hold
	const args = ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-map', '0:a:0', '-ar', String(like.sampleRate), '-ac', like.mono ? '1' : '2'];
	args.push('-c:a', 'libmp3lame', '-b:a', `${Math.round(like.kbps)}k`, '-write_xing', '0', '-id3v2_version', '0', '-f', 'mp3', 'pipe:1');
	const child = spawn(FFMPEG, args, { stdio: ['pipe', 'pipe', 'pipe'] });
	const out: Buffer[] = [];
	const err: Buffer[] = [];
	child.stdout.on('data', (d: Buffer) => out.push(d));
	child.stderr.on('data', (d: Buffer) => err.push(d));
	child.stdin.end(input);
	const code = await new Promise<number | null>((resolve) => child.on('close', resolve));
	if (code !== 0) throw new Error(`ffmpeg ${url}: ${Buffer.concat(err).toString().slice(-300)}`);
	return readMp3(new Uint8Array(Buffer.concat(out)));
}

/**
 * The verses of `sura` from the first folder that has them all, without an extra verse (another
 * verse count), with the basmala before them when recorded alike. `why` says why none fits.
 * Frames are joined without re-encoding, so one layout (sample rate, channels): the few verses
 * recorded otherwise are taken from another folder recorded like the rest, or re-encoded with
 * ffmpeg when there is one.
 * Some EveryAyah files are cut off (a 15 s verse kept as 0.3 s): such a verse is taken from
 * another folder of the recitation when one has it whole; `cut` lists those left as they are.
 */
async function recording(rec: Recitation, sura: number, letters: number[]) {
	const verses = letters.length;
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
		const layout = (p: Mp3Part) => `${p.sampleRate}/${p.samplesPerFrame}/${p.mono}`;
		const counts = new Map<string, number>();
		for (const p of found) counts.set(layout(p), (counts.get(layout(p)) ?? 0) + 1);
		const usual = [...counts].sort((a, b) => b[1] - a[1])[0][0];
		const like = found.find((p) => layout(p) === usual)!;
		const alike = (p: Mp3Part | null) => !!p && layout(p) === usual;
		const odd = found.flatMap((p, i) => (alike(p) ? [] : [i]));
		let reencoded = 0;
		for (const i of odd) {
			for (const other of rec.folders.filter((f) => f !== folder)) {
				const p = await mp3(file(other, sura, i + 1));
				if (alike(p)) {
					found[i] = p!;
					break;
				}
			}
			if (!alike(found[i]) && (await hasFfmpeg())) {
				found[i] = await encodeLike(file(folder, sura, i + 1), like);
				reencoded++;
			}
		}
		const still = found.filter((p) => !alike(p)).length;
		if (still) {
			why.push(`${folder}: ${still} verses recorded at another sample rate (install ffmpeg to re-encode them)`);
			continue;
		}
		if (reencoded) console.log(`  ${sura}: ${reencoded} verses re-encoded like the others`);
		let basmala: Mp3Part | null = null;
		if (!NO_BASMALA.has(sura)) {
			basmala = await mp3(file(folder, sura, 0));
			if (!alike(basmala)) basmala = await mp3(file(folder, 1, 1));
			if (!alike(basmala)) basmala = null;
		}
		const isCut = cutOff(found, letters);
		const cut: number[] = [];
		let patched = 0;
		for (let i = 0; i < verses; i++) {
			if (!isCut(found[i], i)) continue;
			let whole: Mp3Part | null = null;
			for (const other of rec.folders.filter((f) => f !== folder)) {
				const p = await mp3(file(other, sura, i + 1));
				if (alike(p) && !isCut(p!, i)) {
					whole = p;
					break;
				}
			}
			if (whole) {
				found[i] = whole;
				patched++;
			} else cut.push(i + 1);
		}
		return { folder, basmala, verses: found, why, patched, cut };
	}
	return { why };
}

// ——— Import ———

const slugOf = (rec: Recitation, sura: number) =>
	`sourate-${String(sura).padStart(3, '0')}-${rec.reciter.slug}${rec.style === 'murattal' ? '' : `-${rec.style}`}` +
	(rec.style === 'translation' ? `-${rec.language}` : '');

const chosen = CATALOGUE.filter((rec) => !onlyReciters || onlyReciters.includes(rec.reciter.slug));

/** Verses of the translations read aloud, keyed "sura|aya" (aya 0.5: the basmala). */
const translations = new Map<string, Map<string, string>>();
const wanted = [...new Set(chosen.flatMap((rec) => (rec.french ? [rec.french] : [])))];
if (wanted.length) {
	const xlsx = arg('xlsx');
	if (!xlsx) throw new Error(`--xlsx is needed for the ${wanted.join(', ')} translation`);
	const book = new ExcelJS.Workbook();
	await book.xlsx.readFile(xlsx);
	const sheet = book.getWorksheet('Traductions Coran');
	if (!sheet) throw new Error('Sheet "Traductions Coran" not found');
	for (const name of wanted) translations.set(name, new Map());
	sheet.eachRow((row, i) => {
		if (i === 1) return;
		const v = row.values as unknown[];
		translations.get(String(v[4]))?.set(`${v[2]}|${v[3]}`, String(v[5] ?? '').trim());
	});
	for (const [name, verses] of translations) {
		if (verses.size === 0) throw new Error(`Translation "${name}" not found in the spreadsheet`);
	}
}
const started = Date.now();
let done = 0;
let sent = 0;
const skipped: string[] = [];

/**
 * Builds and uploads one surah of one recitation; returns false when EveryAyah lacks it.
 * `replace` is the track already there: replaced when it failed, or when its verses had stray
 * frames (joined into the audio by the earlier MP3 reader); otherwise left as it is.
 */
async function importSurah(rec: Recitation, reciter: string, sura: number, slug: string, replace?: { id: string; status: string }) {
	const text = texts.get(sura)!;
	const verseLines = text.lines.filter((l) => l.n);
	const letters = verseLines.map((l) => String(l.ar ?? '').replace(/[\sً-ٰٟۖ-ۭ]/g, '').length);
	const found = await recording(rec, sura, letters);
	if (!found.verses) {
		console.log(`  ${sura}: skipped (${found.why.join('; ')})`);
		return false;
	}
	if (found.cut.length) console.log(`  ${sura}: verses ${found.cut.join(', ')} cut off at EveryAyah, in no other folder`);
	if (replace) {
		const stray = [found.basmala, ...found.verses].reduce((n, p) => n + (p?.stray ?? 0), 0);
		if (replace.status !== 'error' && stray === 0 && found.patched === 0) return true;
		const why = replace.status === 'error' ? ['failed before'] : [];
		if (stray) why.push(`${stray} stray frames`);
		if (found.patched) why.push(`${found.patched} cut-off verses taken from another folder`);
		console.log(`  ${sura}: replaced (${why.join(', ')})`);
		await call(`${API}/api/collections/tracks/records/${replace.id}`, { method: 'DELETE' });
	}

	// Lines of the text with their exact times; the basmala line only when it is recorded
	const parts: Mp3Part[] = [];
	const lines: (TextLine & { start: number; end: number })[] = [];
	let at = 0;
	const read = rec.french ? translations.get(rec.french)! : null;
	const add = (line: TextLine, part: Mp3Part) => {
		parts.push(part);
		// The translation heard, when it is not the library's (the basmala line is aya 0.5)
		const heard = read?.get(`${sura}|${line.n ?? 0.5}`);
		lines.push({ ...line, ...(heard ? { fr: heard } : {}), start: Math.round(at * 100) / 100, end: Math.round((at + part.seconds) * 100) / 100 });
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
		origin_url: rec.source?.url ?? `${DATA}/${found.folder}/`,
		submitted_by: rec.source?.name ?? 'EveryAyah'
	});
	// Text, timings and duration together: already synced (not queued for the home agent) and
	// listed with its length before the worker gets to it
	await call(`${API}/api/collections/tracks/records/${record.id}`, json('PATCH', { text: text.id, lines, duration: Math.round(at * 100) / 100 }));

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
			const existing = await first('tracks', `slug="${slug}"`, 'id,text,status');
			const complete = existing?.text ? existing : undefined;
			if (complete && !repair && complete.status !== 'error') continue;
			// Stopped between the upload and its timings last time: done again
			if (existing && !complete) await call(`${API}/api/collections/tracks/records/${existing.id}`, { method: 'DELETE' });
			if (!(await importSurah(rec, reciter, sura, slug, complete))) skipped.push(slug);
		} catch (e) {
			// One surah failing (network, server) does not stop the import; a new run retries it
			console.log(`  ${sura}: FAILED ${e instanceof Error ? e.message : e}`);
			skipped.push(slug);
		}
	}
}
console.log(`\nDone: ${done} tracks imported, ${skipped.length} skipped or failed${skipped.length ? `:\n  ${skipped.join('\n  ')}` : '.'}`);
