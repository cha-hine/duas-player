import { error, json } from '@sveltejs/kit';
import { isSuperuser } from '#lib/server/pocketbase.ts';
import { UploadError } from '#lib/server/uploads.ts';

/** Returns the caller's token, or throws 401 unless it belongs to a superuser. */
export async function requireSuperuser(request: Request): Promise<string> {
	const token = request.headers.get('authorization');
	if (!(await isSuperuser(token))) error(401, 'Superuser login required');
	return token!;
}

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
