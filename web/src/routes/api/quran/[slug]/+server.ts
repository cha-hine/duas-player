import { error, json } from '@sveltejs/kit';
import { recitationSlug } from '#lib/quran.ts';
import * as content from '#lib/server/content.ts';
import type { RequestHandler } from './$types';

// One surah's recitation by its address (e.g. sourate-003-alafasy), for the player to go on
// from one surah to the next with the same reciter.
export const GET: RequestHandler = async ({ params, setHeaders }) => {
	if (!recitationSlug(params.slug)) error(404);
	const item = await content.item('audio', params.slug);
	if (!item) error(404);
	setHeaders({ 'cache-control': 'public, max-age=300' });
	return json(item);
};
