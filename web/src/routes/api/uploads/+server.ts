import { json } from '@sveltejs/kit';
import { createUpload } from '#lib/server/uploads.ts';
import { handleUploadErrors, requireSuperuser } from './guard.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	await requireSuperuser(request);
	const { filename, size, type } = await request.json();
	return handleUploadErrors(async () =>
		json(await createUpload(filename, size, type), { status: 201 })
	);
};
