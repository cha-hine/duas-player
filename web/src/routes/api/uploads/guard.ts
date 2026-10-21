import { json } from '@sveltejs/kit';
import { UploadError } from '#lib/server/uploads.ts';

export { requireSuperuser } from '#lib/server/auth.ts';

/** Turns an UploadError into a JSON response the uploader can act on. */
export async function handleUploadErrors(fn: () => Promise<Response>): Promise<Response> {
	try {
		return await fn();
	} catch (e) {
		if (e instanceof UploadError) {
			return json({ message: e.message, ...(e.body as object) }, { status: e.status });
		}
		throw e;
	}
}
