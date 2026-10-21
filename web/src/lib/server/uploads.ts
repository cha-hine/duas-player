import { randomUUID } from 'node:crypto';
import { createWriteStream, openAsBlob } from 'node:fs';
import { mkdir, readFile, readdir, rm, stat, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { UPLOAD_DIR as UPLOAD_DIR_ENV } from '$app/env/private';
import {
	CHUNK_SIZE,
	MAX_UPLOAD_SIZE,
	UPLOAD_TARGETS,
	type CompleteRequest,
	type UploadStatus
} from '#lib/upload-protocol.ts';
import { PB_URL } from './pocketbase.ts';

const UPLOAD_DIR = UPLOAD_DIR_ENV ?? join(tmpdir(), 'sakina-uploads');
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const ID_PATTERN = /^[0-9a-f-]{36}$/;

type Meta = { id: string; filename: string; type: string; size: number; createdAt: number };

export class UploadError extends Error {
	constructor(
		public status: number,
		message: string,
		public body?: unknown
	) {
		super(message);
	}
}

const metaPath = (id: string) => join(UPLOAD_DIR, `${id}.json`);
const dataPath = (id: string) => join(UPLOAD_DIR, `${id}.part`);

async function readMeta(id: string): Promise<Meta> {
	if (!ID_PATTERN.test(id)) throw new UploadError(404, 'Unknown upload');
	try {
		return JSON.parse(await readFile(metaPath(id), 'utf8'));
	} catch {
		throw new UploadError(404, 'Unknown upload');
	}
}

async function currentOffset(id: string): Promise<number> {
	return (await stat(dataPath(id))).size;
}

/** Removes uploads left unfinished for more than a day. */
async function sweep() {
	const now = Date.now();
	for (const name of await readdir(UPLOAD_DIR)) {
		if (!name.endsWith('.json')) continue;
		const id = name.slice(0, -5);
		const meta = await readMeta(id).catch(() => null);
		if (!meta || now - meta.createdAt > MAX_AGE_MS) await removeUpload(id);
	}
}

export async function createUpload(
	filename: string,
	size: number,
	type: string
): Promise<UploadStatus> {
	if (!filename || !Number.isSafeInteger(size) || size <= 0) {
		throw new UploadError(400, 'filename and size are required');
	}
	if (size > MAX_UPLOAD_SIZE) throw new UploadError(413, 'File too large');

	await mkdir(UPLOAD_DIR, { recursive: true });
	await sweep();

	const id = randomUUID();
	const meta: Meta = {
		id,
		filename,
		type: type || 'application/octet-stream',
		size,
		createdAt: Date.now()
	};
	await writeFile(dataPath(id), '');
	await writeFile(metaPath(id), JSON.stringify(meta));
	return { id, offset: 0, size };
}

export async function getStatus(id: string): Promise<UploadStatus> {
	const meta = await readMeta(id);
	return { id, offset: await currentOffset(id), size: meta.size };
}

/** Appends one chunk. `offset` must match what the server already has, so a retried chunk is never written twice. */
export async function appendChunk(
	id: string,
	offset: number,
	body: ReadableStream<Uint8Array> | null
): Promise<UploadStatus> {
	const meta = await readMeta(id);
	const before = await currentOffset(id);
	if (offset !== before) {
		throw new UploadError(409, 'Offset mismatch', { offset: before, size: meta.size });
	}
	if (!body) throw new UploadError(400, 'Empty chunk');

	await pipeline(
		Readable.fromWeb(body as import('node:stream/web').ReadableStream),
		createWriteStream(dataPath(id), { flags: 'a' })
	);

	const after = await currentOffset(id);
	if (after - before > CHUNK_SIZE || after > meta.size) {
		await truncate(dataPath(id), before);
		throw new UploadError(413, 'Chunk too large');
	}
	return { id, offset: after, size: meta.size };
}

/** Sends the reassembled file to PocketBase (internal network) and returns the saved record. */
export async function completeUpload(
	id: string,
	token: string,
	request: CompleteRequest
): Promise<unknown> {
	const meta = await readMeta(id);
	const offset = await currentOffset(id);
	if (offset !== meta.size) {
		throw new UploadError(409, 'Upload incomplete', { offset, size: meta.size });
	}

	const field = UPLOAD_TARGETS[request.collection];
	if (!field) throw new UploadError(400, 'Unknown collection');

	const form = new FormData();
	for (const [key, value] of Object.entries(request.data ?? {})) {
		if (key !== field) form.set(key, String(value));
	}
	// File-backed blob: streamed from disk, never loaded into memory
	form.set(field, await openAsBlob(dataPath(id), { type: meta.type }), meta.filename);

	const url = request.recordId
		? `${PB_URL}/api/collections/${request.collection}/records/${encodeURIComponent(request.recordId)}`
		: `${PB_URL}/api/collections/${request.collection}/records`;
	const res = await fetch(url, {
		method: request.recordId ? 'PATCH' : 'POST',
		headers: { Authorization: token },
		body: form
	});
	const record = await res.json().catch(() => ({}));
	// On a validation error the file is kept, so the form can be fixed and completed again
	if (!res.ok) throw new UploadError(res.status, 'PocketBase rejected the record', record);

	await removeUpload(id);
	return record;
}

export async function removeUpload(id: string) {
	await rm(dataPath(id), { force: true });
	await rm(metaPath(id), { force: true });
}
