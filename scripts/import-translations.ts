// Fills the "translations" collection with every translation of the "41 traductions du Coran"
// spreadsheet: one record per translator and surah (basmala and verses), which listeners
// choose from in the text settings. Records already there are updated, so it can run again.
//
//   cd scripts
//   $env:SAKINA_EMAIL = "you@example.com"; $env:SAKINA_PASSWORD = "..."
//   node import-translations.ts --xlsx C:\path\41-traductions-Coran.xlsx [--only Hamidullah,Masson]
import ExcelJS from 'exceljs';

const API = process.env.SAKINA_API ?? 'https://sakina-api.toophan.net';
const EMAIL = process.env.SAKINA_EMAIL;
const PASSWORD = process.env.SAKINA_PASSWORD;
const LANGUAGE = 'fr';
/** Columns of the spreadsheet that are not French translations. */
const NOT_TRANSLATIONS = new Set(['a- arabe', 'a- Translittération', 'undefined', '']);

function arg(name: string): string | undefined {
	const i = process.argv.indexOf(`--${name}`);
	return i >= 0 ? process.argv[i + 1] : undefined;
}
const xlsxPath = arg('xlsx');
const only = arg('only')?.split(',');
if (!xlsxPath || !EMAIL || !PASSWORD) {
	console.error('Usage: set SAKINA_EMAIL and SAKINA_PASSWORD, then');
	console.error('  node import-translations.ts --xlsx <file.xlsx> [--only Hamidullah,Masson]');
	process.exit(1);
}

const slugify = (name: string) =>
	name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

function cell(value: unknown): string {
	if (value == null) return '';
	if (typeof value !== 'object') return String(value);
	const v = value as { richText?: { text: string }[]; text?: string; result?: unknown };
	if (v.richText) return v.richText.map((t) => t.text).join('');
	return String(v.text ?? v.result ?? '');
}

console.log('Reading the spreadsheet...');
const book = new ExcelJS.Workbook();
await book.xlsx.readFile(xlsxPath);
const sheet = book.getWorksheet('Traductions Coran');
if (!sheet) throw new Error('Sheet "Traductions Coran" not found');
/** translator -> "sura|aya" -> text (aya 0 = surah title, 0.5 = basmala) */
const byTranslator = new Map<string, Map<string, string>>();
sheet.eachRow((row, r) => {
	if (r === 1) return;
	const values = row.values as unknown[];
	const translator = cell(values[4]).trim();
	if (NOT_TRANSLATIONS.has(translator) || (only && !only.includes(translator))) return;
	if (!byTranslator.has(translator)) byTranslator.set(translator, new Map());
	byTranslator.get(translator)!.set(`${cell(values[2])}|${cell(values[3])}`, cell(values[5]).trim());
});
console.log(`  ${byTranslator.size} translations`);

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
	for (let attempt = 1; ; attempt++) {
		const res = await fetch(`${API}${path}`, { ...init, headers: { ...headers, ...init.headers } });
		if (res.ok) return res.json();
		const text = await res.text();
		if (attempt >= 5 || res.status < 500) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${text}`);
		await new Promise((r) => setTimeout(r, 4000 * attempt));
	}
}

for (const [name, verses] of byTranslator) {
	const translator = slugify(name);
	const filter = encodeURIComponent(`language="${LANGUAGE}" && translator="${translator}"`);
	const existing = new Map<number, string>(
		(await api(`/api/collections/translations/records?perPage=200&fields=id,surah&filter=${filter}`)).items.map(
			(r: { id: string; surah: number }) => [r.surah, r.id]
		)
	);
	for (let sura = 1; sura <= 114; sura++) {
		const text: { basmala?: string; verses: string[] } = { verses: [] };
		const basmala = verses.get(`${sura}|0.5`);
		if (basmala) text.basmala = basmala;
		for (let aya = 1; verses.has(`${sura}|${aya}`); aya++) text.verses.push(verses.get(`${sura}|${aya}`)!);
		const data = {
			language: LANGUAGE,
			translator,
			translator_name: name,
			surah: sura,
			text,
			source: `« 41 traductions du Coran » v1.10 — ${name}`
		};
		const id = existing.get(sura);
		await api(`/api/collections/translations/records${id ? `/${id}` : ''}`, {
			method: id ? 'PATCH' : 'POST',
			body: JSON.stringify(data)
		});
	}
	console.log(`  ${name}: 114 surahs`);
}
console.log('Done.');
