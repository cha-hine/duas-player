// Shared between the browser uploader and the server.
//
// Cloudflare's proxy rejects request bodies over 100 MB, so large files are sent
// in chunks and reassembled on the server before being handed to PocketBase:
//
//   POST   /api/uploads               { filename, size, type }  -> { id, offset: 0 }
//   GET    /api/uploads/:id                                     -> { id, offset, size }
//   PUT    /api/uploads/:id           Upload-Offset: n, body = chunk -> { offset }
//   POST   /api/uploads/:id/complete  CompleteRequest           -> PocketBase record
//   DELETE /api/uploads/:id                                     -> 204
//
// Every request carries the superuser token in the Authorization header.

export const CHUNK_SIZE = 32 * 1024 * 1024;
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024 * 1024;

/** Where the finished file goes: which collection and file field. */
export const UPLOAD_TARGETS = {
	tracks: 'audio',
	videos: 'source'
} as const;

export type UploadCollection = keyof typeof UPLOAD_TARGETS;

export type UploadStatus = { id: string; offset: number; size: number };

export type CompleteRequest = {
	collection: UploadCollection;
	/** Update this record instead of creating a new one. */
	recordId?: string;
	/** Other record fields, e.g. title_fr, category. */
	data: Record<string, string | number | boolean>;
};
