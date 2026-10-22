import { json } from '@sveltejs/kit';
import * as content from '#lib/server/content.ts';
import type { RequestHandler } from './$types';

// The Quran translations of a language listeners can choose from.
export const GET: RequestHandler = async ({ params, setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=3600' });
	return json(await content.translators(params.language));
};
