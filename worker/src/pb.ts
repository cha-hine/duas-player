// Minimal PocketBase client for the worker, authenticated as a dedicated superuser.
import { createWriteStream, openAsBlob } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream } from 'node:stream/web';

export type MediaRecord = {
	id: string;
	collectionName: 'tracks' | 'videos';
	status: string;
	[field: string]: unknown;
};

/** A file to send in a PATCH: read from disk, never loaded into memory. */
export type FileUpload = { path: string; name: string; type: string };

const PB_URL = process.env.PB_URL ?? 'http://127.0.0.1:8090';
const EMAIL = process.env.PB_WORKER_EMAIL ?? '';
const PASSWORD = process.env.PB_WORKER_PASSWORD ?? '';
const TOKEN_TTL_MS = 60 * 60 * 1000;

let token = '';
let tokenAt = 0;

async function authHeader(): Promise<Record<string, string>> {
	if (!token || Date.now() - tokenAt > TOKEN_TTL_MS) {
		const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ identity: EMAIL, password: PASSWORD })
		});
		if (!res.ok) throw new Error(`Worker login failed (${res.status}): check PB_WORKER_EMAIL / PB_WORKER_PASSWORD`);
		token = (await res.json()).token;
		tokenAt = Date.now();
	}
	return { Authorization: token };
}

async function request(path: string, init: RequestInit = {}) {
	const res = await fetch(`${PB_URL}${path}`, {
		...init,
		headers: { ...(await authHeader()), ...init.headers }
	});
	if (res.status === 401) token = '';
	if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${await res.text()}`);
	return res;
}

export async function waitForPocketBase(retryMs = 5000): Promise<void> {
	for (;;) {
		try {
			if ((await fetch(`${PB_URL}/api/health`)).ok) return;
		} catch {
			// not up yet
		}
		console.log(`[worker] waiting for PocketBase at ${PB_URL}...`);
		await new Promise((resolve) => setTimeout(resolve, retryMs));
	}
}

export async function listByStatus(collection: string, status: string): Promise<MediaRecord[]> {
	const filter = encodeURIComponent(`status="${status}"`);
	const res = await request(`/api/collections/${collection}/records?filter=${filter}&sort=created&perPage=50`);
	return (await res.json()).items;
}

/** Updates fields, optionally with files streamed from disk. */
export async function update(
	record: MediaRecord,
	data: Record<string, unknown>,
	files: Record<string, FileUpload> = {}
): Promise<MediaRecord> {
	const url = `/api/collections/${record.collectionName}/records/${record.id}`;
	if (Object.keys(files).length === 0) {
		const res = await request(url, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(data)
		});
		return res.json();
	}
	const form = new FormData();
	for (const [key, value] of Object.entries(data)) {
		form.set(key, typeof value === 'string' ? value : JSON.stringify(value));
	}
	for (const [field, file] of Object.entries(files)) {
		form.set(field, await openAsBlob(file.path, { type: file.type }), file.name);
	}
	return (await request(url, { method: 'PATCH', body: form })).json();
}

/** Downloads a record's file to `dest`. */
export async function download(record: MediaRecord, field: string, dest: string): Promise<void> {
	const filename = record[field] as string;
	const res = await request(`/api/files/${record.collectionName}/${record.id}/${encodeURIComponent(filename)}`);
	await pipeline(Readable.fromWeb(res.body as ReadableStream), createWriteStream(dest));
}
