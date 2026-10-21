// PocketBase access for the bot, as a superuser on the internal network (no Cloudflare limit).
import { openAsBlob } from 'node:fs';
import { config } from './config.ts';

export type Collection = 'tracks' | 'videos';
export type Category = { id: string; slug: string; name_fr: string; name_ar: string; description_fr: string };
export type MediaRecord = { id: string; title_fr: string; status: string; processing_error?: string };

const TOKEN_TTL_MS = 60 * 60 * 1000;
let token = '';
let tokenAt = 0;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
	if (!token || Date.now() - tokenAt > TOKEN_TTL_MS) {
		const res = await fetch(`${config.pbUrl}/api/collections/_superusers/auth-with-password`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ identity: config.pbEmail, password: config.pbPassword })
		});
		if (!res.ok) throw new Error(`PocketBase login failed (${res.status}): check PB_EMAIL / PB_PASSWORD`);
		token = (await res.json()).token;
		tokenAt = Date.now();
	}
	const res = await fetch(`${config.pbUrl}${path}`, {
		...init,
		headers: { Authorization: token, ...init.headers }
	});
	if (res.status === 401) token = '';
	if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${await res.text()}`);
	return res.status === 204 ? (undefined as T) : res.json();
}

/** Throws with a readable message when the service account cannot log in. */
export async function checkLogin(): Promise<void> {
	await categories();
}

const filter = (expr: string) => `filter=${encodeURIComponent(expr)}`;
const quote = (value: string) => JSON.stringify(value);

export async function categories(): Promise<Category[]> {
	return (await request<{ items: Category[] }>('/api/collections/categories/records?sort=order&perPage=200')).items;
}

/** Existing track or video imported from the same source, if any. */
export async function findByOrigin(origin: string): Promise<{ collection: Collection; record: MediaRecord } | null> {
	for (const collection of ['tracks', 'videos'] as const) {
		const { items } = await request<{ items: MediaRecord[] }>(
			`/api/collections/${collection}/records?perPage=1&${filter(`origin_url=${quote(origin)}`)}`
		);
		if (items[0]) return { collection, record: items[0] };
	}
	return null;
}

export async function uniqueSlug(collection: Collection, base: string): Promise<string> {
	for (let n = 1; ; n++) {
		const slug = n === 1 ? base : `${base}-${n}`;
		const { totalItems } = await request<{ totalItems: number }>(
			`/api/collections/${collection}/records?perPage=1&${filter(`slug=${quote(slug)}`)}`
		);
		if (totalItems === 0) return slug;
	}
}

/** Finds a reciter by French or Arabic name, creating it when unknown. */
export async function reciterId(nameFr: string | null, nameAr: string | null, slug: string): Promise<string> {
	const conditions = [nameFr && `name_fr=${quote(nameFr)}`, nameAr && `name_ar=${quote(nameAr)}`, `slug=${quote(slug)}`]
		.filter(Boolean)
		.join(' || ');
	const { items } = await request<{ items: { id: string }[] }>(`/api/collections/reciters/records?perPage=1&${filter(conditions)}`);
	if (items[0]) return items[0].id;
	const created = await request<{ id: string }>('/api/collections/reciters/records', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ slug, name_fr: nameFr || nameAr, name_ar: nameAr || nameFr })
	});
	return created.id;
}

/** Creates a track or video, streaming the media file from disk. */
export async function createMedia(
	collection: Collection,
	data: Record<string, string | boolean>,
	file: { path: string; name: string; type: string }
): Promise<MediaRecord> {
	const form = new FormData();
	for (const [key, value] of Object.entries(data)) form.set(key, String(value));
	form.set(collection === 'tracks' ? 'audio' : 'source', await openAsBlob(file.path, { type: file.type }), file.name);
	return request(`/api/collections/${collection}/records`, { method: 'POST', body: form });
}

export const getMedia = (collection: Collection, id: string) =>
	request<MediaRecord>(`/api/collections/${collection}/records/${id}`);

export const deleteMedia = (collection: Collection, id: string) =>
	request<void>(`/api/collections/${collection}/records/${id}`, { method: 'DELETE' });
