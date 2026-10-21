import { CHUNK_SIZE, type CompleteRequest, type UploadStatus } from '#lib/upload-protocol.ts';

const MAX_RETRIES = 5;
const resumeKey = (file: File) => `sakina-upload:${file.name}:${file.size}:${file.lastModified}`;

export class UploadFailed extends Error {
	constructor(
		message: string,
		public status: number,
		public body: Record<string, unknown> = {}
	) {
		super(message);
	}
}

export type Progress = { sent: number; total: number };

function storage(): Storage | null {
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}

async function call<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
	const res = await fetch(path, { ...init, headers: { Authorization: token, ...init.headers } });
	const body = await res.json().catch(() => ({}));
	if (!res.ok) throw new UploadFailed(body.message ?? res.statusText, res.status, body);
	return body as T;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Starts a new upload, or resumes the previous one for this exact file. */
async function startOrResume(file: File, token: string): Promise<UploadStatus> {
	const saved = storage()?.getItem(resumeKey(file));
	if (saved) {
		try {
			return await call<UploadStatus>(`/api/uploads/${saved}`, token);
		} catch {
			storage()?.removeItem(resumeKey(file));
		}
	}
	const status = await call<UploadStatus>('/api/uploads', token, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ filename: file.name, size: file.size, type: file.type })
	});
	storage()?.setItem(resumeKey(file), status.id);
	return status;
}

/**
 * Sends `file` in chunks (each under Cloudflare's 100 MB limit), retrying failed
 * chunks, then asks the server to create the PocketBase record.
 */
export async function uploadFile(
	file: File,
	token: string,
	complete: CompleteRequest,
	onProgress: (p: Progress) => void
): Promise<Record<string, unknown>> {
	const status = await startOrResume(file, token);
	const id = status.id;
	let offset = status.offset;
	onProgress({ sent: offset, total: file.size });

	let failures = 0;
	while (offset < file.size) {
		const chunk = file.slice(offset, offset + CHUNK_SIZE);
		try {
			({ offset } = await call<UploadStatus>(`/api/uploads/${id}`, token, {
				method: 'PUT',
				headers: { 'upload-offset': String(offset), 'content-type': 'application/octet-stream' },
				body: chunk
			}));
			failures = 0;
			onProgress({ sent: offset, total: file.size });
		} catch (e) {
			// The server tells us where it really is; carry on from there
			if (e instanceof UploadFailed && e.status === 409 && typeof e.body.offset === 'number') {
				offset = e.body.offset;
				continue;
			}
			if (e instanceof UploadFailed && (e.status === 401 || e.status === 404 || e.status === 413))
				throw e;
			if (++failures > MAX_RETRIES) throw e;
			await wait(1000 * 2 ** failures);
		}
	}

	const record = await call<Record<string, unknown>>(`/api/uploads/${id}/complete`, token, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(complete)
	});
	storage()?.removeItem(resumeKey(file));
	return record;
}
