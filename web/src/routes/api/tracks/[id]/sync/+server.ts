import { error, json } from '@sveltejs/kit';
import { trackSync } from '#lib/server/content.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, setHeaders }) => {
	const sync = await trackSync(params.id);
	if (!sync) error(404);
	setHeaders({ 'cache-control': 'public, max-age=300' });
	return json(sync);
};
