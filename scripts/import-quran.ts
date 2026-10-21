// Fills the text library with the 114 surahs, one line per verse (plus the basmala as the
// first line of every surah recited with it), ready to be synced with any recitation in
// /admin/textes.
//
//   cd scripts; npm install
//   $env:SAKINA_EMAIL = "you@example.com"; $env:SAKINA_PASSWORD = "..."
//   node import-quran.ts --xlsx C:\path\41-traductions-Coran.xlsx --fr Fakhri [--translit] [--tanzil en.qarai,ur.najafi]
//
// Arabic: Tanzil Project Uthmani text, downloaded verbatim (its terms forbid changing it and
// ask to credit tanzil.net). French (and transliteration): the chosen translator from the
// "41 traductions du Coran" spreadsheet. --tanzil adds Tanzil translations (non-commercial use).
// Surahs already in the library (same slug) are updated, so the script can be re-run.
import ExcelJS from 'exceljs';

const API = process.env.SAKINA_API ?? 'https://sakina-api.toophan.net';
const EMAIL = process.env.SAKINA_EMAIL;
const PASSWORD = process.env.SAKINA_PASSWORD;
const TANZIL_TEXT =
	'https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true';
/** Tanzil translation language prefix -> text language in Sakina */
const TANZIL_LANGUAGES: Record<string, string> = { en: 'en', ur: 'ur', fa: 'fa', fr: 'fr' };
/** Surahs without a separate basmala line: Al-Fatiha (it is verse 1) and At-Tawba. */
const NO_BASMALA = new Set([1, 9]);

function arg(name: string): string | undefined {
	const i = process.argv.indexOf(`--${name}`);
	return i >= 0 ? process.argv[i + 1] : undefined;
}
const xlsxPath = arg('xlsx');
const translator = arg('fr');
const withTranslit = process.argv.includes('--translit');
const tanzilIds = (arg('tanzil') ?? '').split(',').filter(Boolean);
if (!xlsxPath || !translator || !EMAIL || !PASSWORD) {
	console.error('Usage: set SAKINA_EMAIL and SAKINA_PASSWORD, then');
	console.error(
		'  node import-quran.ts --xlsx <file.xlsx> --fr <translator> [--translit] [--tanzil en.qarai,ur.najafi]'
	);
	process.exit(1);
}

type Verses = Map<string, string>; // "sura|aya" -> text

/** Tanzil "sura|aya|text" files (comment lines start with #). */
async function tanzil(url: string): Promise<{ verses: Verses; notice: string }> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`${url} -> ${res.status}`);
	const verses: Verses = new Map();
	const notice: string[] = [];
	for (const line of (await res.text()).split('\n')) {
		if (line.startsWith('#')) notice.push(line.replace(/^#\s?/, ''));
		else if (line.trim()) {
			const [sura, aya, ...text] = line.split('|');
			verses.set(`${sura}|${aya}`, text.join('|').trim());
		}
	}
	return { verses, notice: notice.join('\n') };
}

function cell(value: unknown): string {
	if (value == null) return '';
	if (typeof value !== 'object') return String(value);
	const v = value as { richText?: { text: string }[]; text?: string; result?: unknown };
	if (v.richText) return v.richText.map((t) => t.text).join('');
	return String(v.text ?? v.result ?? '');
}

/** Spreadsheet rows of the given translators, keyed "sura|aya" (aya 0 = title, 0.5 = basmala). */
async function spreadsheet(path: string, keys: string[]): Promise<Map<string, Verses>> {
	const book = new ExcelJS.Workbook();
	await book.xlsx.readFile(path);
	const sheet = book.getWorksheet('Traductions Coran');
	if (!sheet) throw new Error('Sheet "Traductions Coran" not found');
	const out = new Map(keys.map((k) => [k, new Map<string, string>()]));
	sheet.eachRow((row, r) => {
		if (r === 1) return;
		const values = row.values as unknown[];
		const target = out.get(cell(values[4]));
		if (target) target.set(`${cell(values[2])}|${cell(values[3])}`, cell(values[5]).trim());
	});
	return out;
}

const titleCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

console.log('Downloading the Tanzil Uthmani text...');
const arabic = await tanzil(TANZIL_TEXT);
console.log(`  ${arabic.verses.size} verses`);

const extra: { lang: string; id: string; verses: Verses }[] = [];
for (const id of tanzilIds) {
	const lang = TANZIL_LANGUAGES[id.split('.')[0]];
	if (!lang) {
		console.warn(`! ${id}: language not used by Sakina, skipped`);
		continue;
	}
	console.log(`Downloading Tanzil translation ${id}...`);
	extra.push({ lang, id, verses: (await tanzil(`https://tanzil.net/trans/${id}`)).verses });
}

console.log(`Reading ${translator}${withTranslit ? ' and the transliteration' : ''} from the spreadsheet...`);
const sheetKeys = ['a- arabe', translator, ...(withTranslit ? ['a- Translittération'] : [])];
const sheet = await spreadsheet(xlsxPath, sheetKeys);
const french = sheet.get(translator)!;
if (french.size === 0) {
	console.error(`Translator "${translator}" not found in the spreadsheet.`);
	process.exit(1);
}
const titles = sheet.get('a- arabe')!;
const translit = sheet.get('a- Translittération');

const auth = await fetch(`${API}/api/collections/_superusers/auth-with-password`, {
	method: 'POST',
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify({ identity: EMAIL, password: PASSWORD })
});
if (!auth.ok) {
	console.error(`Login failed (${auth.status}).`);
	process.exit(1);
}
const headers = { Authorization: (await auth.json()).token, 'content-type': 'application/json' };
async function api(path: string, init: RequestInit = {}) {
	const res = await fetch(`${API}${path}`, { ...init, headers: { ...headers, ...init.headers } });
	if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${await res.text()}`);
	return res.json();
}
const filter = (expr: string) => `filter=${encodeURIComponent(expr)}`;
const coran = (await api(`/api/collections/categories/records?${filter('slug="coran"')}`)).items[0];

const source = [
	'Texte arabe : Tanzil Project (https://tanzil.net), texte uthmani reproduit sans modification.',
	`Traduction française : ${translator}, d'après « 41 traductions du Coran » v1.10.`,
	withTranslit ? 'Translittération : transliteration.org, d’après le même recueil.' : '',
	extra.length ? `Traductions Tanzil (usage non commercial) : ${extra.map((e) => e.id).join(', ')}.` : ''
]
	.filter(Boolean)
	.join(' ');

for (let sura = 1; sura <= 114; sura++) {
	/** One line: verse `aya` of the spreadsheet with the Tanzil verse `key` ("sura|aya"). */
	const line = (aya: string, key: string) => {
		const out: Record<string, string | number> = { ar: arabic.verses.get(key) ?? '' };
		// Verse number (the basmala line, aya 0.5, has none)
		if (Number.isInteger(Number(aya))) out.n = Number(aya);
		const tl = translit?.get(`${sura}|${aya}`);
		if (tl) out.translit = tl;
		const fr = french.get(`${sura}|${aya}`);
		if (fr) out.fr = fr;
		for (const e of extra) {
			const t = e.verses.get(key);
			if (t) out[e.lang] = t;
		}
		return out;
	};
	const lines = [];
	// The basmala as recited before the surah; its text is verse 1:1
	if (!NO_BASMALA.has(sura)) lines.push(line('0.5', '1|1'));
	for (let aya = 1; arabic.verses.has(`${sura}|${aya}`); aya++) {
		lines.push(line(String(aya), `${sura}|${aya}`));
	}

	const slug = `sourate-${String(sura).padStart(3, '0')}`;
	const data = {
		slug,
		title_fr: `Sourate ${sura} — ${titleCase(french.get(`${sura}|0`) ?? '')}`,
		title_ar: titles.get(`${sura}|0`) ?? '',
		category: coran?.id ?? '',
		lines,
		source,
		source_url: 'https://tanzil.net'
	};
	const existing = (await api(`/api/collections/texts/records?${filter(`slug="${slug}"`)}`)).items[0];
	if (existing) {
		await api(`/api/collections/texts/records/${existing.id}`, { method: 'PATCH', body: JSON.stringify(data) });
	} else {
		await api('/api/collections/texts/records', { method: 'POST', body: JSON.stringify(data) });
	}
	process.stdout.write(`\r  ${sura}/114 ${data.title_fr.padEnd(50)}`);
}
console.log('\nDone: the surahs are in /admin/bibliotheque (category Coran).');
console.log('\nTanzil notice, to keep with the text:\n' + arabic.notice.split('\n').slice(0, 14).join('\n'));
