// Keeps the Quran part of the site simple: the French translations listeners choose from are
// cut down to TRANSLATIONS, and the recitations imported in bulk (import-everyayah.ts) to one
// per well-known reciter (RECITATIONS, as at the end of their slugs). Reciters left without
// any track are removed too. Lists what it would remove unless --apply is given.
//
//   cd scripts
//   $env:SAKINA_EMAIL = "you@example.com"; $env:SAKINA_PASSWORD = "..."
//   node prune-quran.ts [--apply]

const API = process.env.SAKINA_API ?? 'https://sakina-api.toophan.net';
const EMAIL = process.env.SAKINA_EMAIL;
const PASSWORD = process.env.SAKINA_PASSWORD;
const TRANSLATIONS = ['hamidullah', 'hamidullah-revise', 'fakhri', 'bonaud'];
/** Same list as the CATALOGUE of import-everyayah.ts, so a new import does not bring the others back. */
const RECITATIONS = [
	'alafasy',
	'abdul-basit',
	'husary',
	'minshawi',
	'sudais',
	'shuraim',
	'muaiqly',
	'ghamdi',
	'ajamy',
	'shatri',
	'youssouf-leclerc-translation-fr'
];
/** Imported by import-everyayah.ts, like BULK in web/src/lib/server/content.ts. */
const BULK = '(submitted_by = "EveryAyah" || submitted_by = "Le-Coran.com")';
const apply = process.argv.includes('--apply');

if (!EMAIL || !PASSWORD) {
	console.error('Usage: set SAKINA_EMAIL and SAKINA_PASSWORD, then');
	console.error('  node prune-quran.ts [--apply]');
	process.exit(1);
}

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
		if (res.ok) return res.status === 204 ? null : res.json();
		const text = await res.text();
		if (attempt >= 5 || res.status < 500) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${text}`);
		await new Promise((r) => setTimeout(r, attempt * 2000));
	}
}
async function all(collection: string, filter: string, fields: string) {
	const items: Record<string, string>[] = [];
	for (let page = 1; ; page++) {
		const res = await api(
			`/api/collections/${collection}/records?perPage=500&page=${page}&skipTotal=1&fields=${fields}&filter=${encodeURIComponent(filter)}`
		);
		items.push(...res.items);
		if (res.items.length < 500) return items;
	}
}
async function remove(collection: string, ids: string[]) {
	let done = 0;
	for (const id of ids) {
		await api(`/api/collections/${collection}/records/${id}`, { method: 'DELETE' });
		if (++done % 100 === 0) console.log(`  ${done} / ${ids.length}`);
	}
}

// ——— Translations ———

const translations = await all('translations', 'language = "fr"', 'id,translator,translator_name');
const extraTranslations = translations.filter((t) => !TRANSLATIONS.includes(t.translator));
const names = [...new Set(extraTranslations.map((t) => t.translator_name))].sort();
console.log(`Translations: keeping ${TRANSLATIONS.join(', ')}; removing ${names.length} (${extraTranslations.length} records)`);
console.log(`  ${names.join(', ')}`);

// ——— Recitations ———

const tracks = await all('tracks', `${BULK} && slug ~ "sourate-"`, 'id,slug,reciter');
const recitation = (slug: string) => slug.replace(/^sourate-\d{3}-/, '');
const extraTracks = tracks.filter((t) => !RECITATIONS.includes(recitation(t.slug)));
const counts = new Map<string, number>();
for (const t of extraTracks) counts.set(recitation(t.slug), (counts.get(recitation(t.slug)) ?? 0) + 1);
console.log(`\nRecitations: keeping ${tracks.length - extraTracks.length} tracks; removing ${extraTracks.length}:`);
for (const [name, n] of [...counts].sort()) console.log(`  ${name}: ${n}`);

// Reciters whose every track goes, with no video either
const kept = new Set(tracks.filter((t) => !extraTracks.includes(t)).map((t) => t.reciter));
const candidates = [...new Set(extraTracks.map((t) => t.reciter))].filter((id) => !kept.has(id));
const emptyReciters: Record<string, string>[] = [];
for (const id of candidates) {
	const others = [...(await all('tracks', `reciter = "${id}" && !${BULK}`, 'id')), ...(await all('videos', `reciter = "${id}"`, 'id'))];
	if (others.length === 0) emptyReciters.push(await api(`/api/collections/reciters/records/${id}?fields=id,name_fr`));
}
console.log(`\nReciters left without tracks, removed: ${emptyReciters.map((r) => r.name_fr).join(', ') || 'none'}`);

if (!apply) {
	console.log('\nNothing removed: run again with --apply.');
	process.exit(0);
}
console.log('\nRemoving translations...');
await remove('translations', extraTranslations.map((t) => t.id));
console.log('Removing recitations...');
await remove('tracks', extraTracks.map((t) => t.id));
console.log('Removing reciters...');
await remove('reciters', emptyReciters.map((r) => r.id));
console.log('Done.');
