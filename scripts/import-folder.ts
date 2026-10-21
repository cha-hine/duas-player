// Bulk-imports a folder of audio/video files into Sakina, through the chunked upload API
// (so large files pass Cloudflare). Sub-folders name the category:
//
//   mes-fichiers/
//     douas/doua-kumayl.mp3
//     latmiyat/ya-hussein.mp4
//
//   $env:SAKINA_EMAIL = "you@example.com"; $env:SAKINA_PASSWORD = "..."
//   node scripts/import-folder.ts mes-fichiers [--publish]
//
// Titles come from file names (the Arabic title starts as a copy: edit it in the admin panel).
// Files whose slug already exists are skipped, so the script can be re-run safely.
import { open, readdir, stat } from 'node:fs/promises';
import { extname, join, parse } from 'node:path';

const SITE = process.env.SAKINA_SITE ?? 'https://sakina.toophan.net';
const API = process.env.SAKINA_API ?? 'https://sakina-api.toophan.net';
const EMAIL = process.env.SAKINA_EMAIL;
const PASSWORD = process.env.SAKINA_PASSWORD;
const CHUNK_SIZE = 32 * 1024 * 1024; // must match web/src/lib/upload-protocol.ts

const AUDIO: Record<string, string> = {
	'.mp3': 'audio/mpeg',
	'.m4a': 'audio/mp4',
	'.aac': 'audio/aac',
	'.wav': 'audio/wav',
	'.ogg': 'audio/ogg',
	'.opus': 'audio/opus',
	'.flac': 'audio/flac'
};
const VIDEO: Record<string, string> = {
	'.mp4': 'video/mp4',
	'.mov': 'video/quicktime',
	'.webm': 'video/webm',
	'.mkv': 'video/x-matroska'
};

const args = process.argv.slice(2);
const folder = args.find((a) => !a.startsWith('--'));
const publish = args.includes('--publish');
if (!folder || !EMAIL || !PASSWORD) {
	console.error('Usage: set SAKINA_EMAIL and SAKINA_PASSWORD, then: node scripts/import-folder.ts <folder> [--publish]');
	process.exit(1);
}

const slugify = (text: string) =>
	text
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 120);

const titleFrom = (name: string) => {
	const t = name.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
	return t.charAt(0).toUpperCase() + t.slice(1);
};

const auth = await fetch(`${API}/api/collections/_superusers/auth-with-password`, {
	method: 'POST',
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify({ identity: EMAIL, password: PASSWORD })
});
if (!auth.ok) {
	console.error(`Login failed (${auth.status}). With two-step login (MFA) on, use the /admin page instead.`);
	process.exit(1);
}
const { token } = await auth.json();
const headers = { Authorization: token, Origin: SITE };

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
	const res = await fetch(url, { ...init, headers: { ...headers, ...init.headers } });
	const body = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body)}`);
	return body as T;
}

const categories = await api<{ items: { id: string; slug: string }[] }>(
	`${API}/api/collections/categories/records?perPage=200`
);
const categoryBySlug = new Map(categories.items.map((c) => [c.slug, c.id]));

async function exists(collection: string, slug: string) {
	const list = await api<{ totalItems: number }>(
		`${API}/api/collections/${collection}/records?perPage=1&filter=${encodeURIComponent(`slug="${slug}"`)}`
	);
	return list.totalItems > 0;
}

async function upload(path: string, size: number, type: string, filename: string) {
	const { id } = await api<{ id: string }>(`${SITE}/api/uploads`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ filename, size, type })
	});
	const file = await open(path);
	try {
		let offset = 0;
		while (offset < size) {
			const buf = Buffer.alloc(Math.min(CHUNK_SIZE, size - offset));
			await file.read(buf, 0, buf.length, offset);
			for (let attempt = 1; ; attempt++) {
				try {
					({ offset } = await api<{ offset: number }>(`${SITE}/api/uploads/${id}`, {
						method: 'PUT',
						headers: { 'upload-offset': String(offset), 'content-type': 'application/octet-stream' },
						body: buf
					}));
					break;
				} catch (e) {
					if (attempt >= 5) throw e;
					await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
				}
			}
			process.stdout.write(`\r  ${Math.floor((offset / size) * 100)} %`);
		}
		process.stdout.write('\n');
	} finally {
		await file.close();
	}
	return id;
}

let imported = 0;
let skipped = 0;
for (const entry of await readdir(folder, { withFileTypes: true })) {
	if (!entry.isDirectory()) continue;
	const categoryId = categoryBySlug.get(entry.name);
	if (!categoryId) {
		console.warn(`! folder "${entry.name}" does not match a category slug (${[...categoryBySlug.keys()].join(', ')}), skipped`);
		continue;
	}
	for (const name of await readdir(join(folder, entry.name))) {
		const ext = extname(name).toLowerCase();
		const collection = AUDIO[ext] ? 'tracks' : VIDEO[ext] ? 'videos' : null;
		if (!collection) continue;

		const path = join(folder, entry.name, name);
		const base = parse(name).name;
		const slug = slugify(base);
		if (await exists(collection, slug)) {
			console.log(`= ${entry.name}/${name} (already imported)`);
			skipped++;
			continue;
		}

		console.log(`+ ${entry.name}/${name}`);
		const { size } = await stat(path);
		const id = await upload(path, size, AUDIO[ext] ?? VIDEO[ext], name);
		const title = titleFrom(base);
		await api(`${SITE}/api/uploads/${id}/complete`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				collection,
				data: { title_fr: title, title_ar: title, slug, category: categoryId, published: publish, status: 'pending' }
			})
		});
		imported++;
	}
}

console.log(`Done: ${imported} imported, ${skipped} already there.`);
