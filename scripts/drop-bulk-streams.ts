// Removes the worker's streaming copy (.m4a) from the recitations imported in bulk: their MP3s
// play as they are (the site falls back to "audio" when "stream" is empty), and the copies took
// 82 GB of a 197 GB disk. Status, timings and waveform stay as they are.
// Lists what it would remove unless --apply is given.
//
//   cd scripts
//   $env:SAKINA_EMAIL = "you@example.com"; $env:SAKINA_PASSWORD = "..."
//   node drop-bulk-streams.ts [--apply]

const API = process.env.SAKINA_API ?? 'https://sakina-api.toophan.net';
const EMAIL = process.env.SAKINA_EMAIL;
const PASSWORD = process.env.SAKINA_PASSWORD;
/** Imported by import-everyayah.ts, like BULK in web/src/lib/server/content.ts. */
const FILTER = '(submitted_by = "EveryAyah" || submitted_by = "Le-Coran.com") && stream != ""';
const apply = process.argv.includes('--apply');

if (!EMAIL || !PASSWORD) {
	console.error('Usage: set SAKINA_EMAIL and SAKINA_PASSWORD, then');
	console.error('  node drop-bulk-streams.ts [--apply]');
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
		if (res.ok) return res.json();
		const text = await res.text();
		if (attempt >= 5 || res.status < 500) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${text}`);
		await new Promise((r) => setTimeout(r, attempt * 2000));
	}
}

const page = (perPage: number) =>
	api(`/api/collections/tracks/records?perPage=${perPage}&fields=id,slug&filter=${encodeURIComponent(FILTER)}`);

const { totalItems } = await page(1);
console.log(`${totalItems} bulk recitations have a streaming copy.`);
if (!apply) {
	console.log('Nothing removed: run again with --apply to remove them.');
	process.exit(0);
}

let done = 0;
// Removed records leave the filter, so the first page is always the next batch
for (let batch = (await page(100)).items; batch.length; batch = (await page(100)).items) {
	for (const { id, slug } of batch as { id: string; slug: string }[]) {
		await api(`/api/collections/tracks/records/${id}`, { method: 'PATCH', body: JSON.stringify({ stream: null }) });
		done++;
		if (done % 100 === 0) console.log(`  ${done}/${totalItems} (${slug})`);
	}
}
console.log(`Done: ${done} streaming copies removed.`);
