import { json } from '@sveltejs/kit';
import { appendChunk, getStatus, removeUpload } from '#lib/server/uploads.ts';
import { handleUploadErrors, requireSuperuser } from '../guard.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, params }) => {
	await requireSuperuser(request);
	return handleUploadErrors(async () => json(await getStatus(params.id)));
};

export const PUT: RequestHandler = async ({ request, params }) => {
	await requireSuperuser(request);
	const offset = Number(request.headers.get('upload-offset'));
	return handleUploadErrors(async () => json(await appendChunk(params.id, offset, request.body)));
};

export const DELETE: RequestHandler = async ({ request, params }) => {
	await requireSuperuser(request);
	await removeUpload(params.id);
	return new Response(null, { status: 204 });
};
