import { json } from '@sveltejs/kit';
import { completeUpload } from '#lib/server/uploads.ts';
import { handleUploadErrors, requireSuperuser } from '../../guard.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params }) => {
	const token = await requireSuperuser(request);
	const body = await request.json();
	return handleUploadErrors(async () => json(await completeUpload(params.id, token, body)));
};
