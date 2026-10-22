import { error, json } from '@sveltejs/kit';
import * as content from '#lib/server/content.ts';
import type { RequestHandler } from './$types';

// One surah in the translation a listener chose: its basmala and verses.
export const GET: RequestHandler = async ({ params, setHeaders }) => {
	const surah = Number(params.surah);
	if (!Number.isInteger(surah) || surah < 1 || surah > 114) error(404);
	const text = await content.surahTranslation(params.language, params.translator, surah);
	if (!text) error(404);
	setHeaders({ 'cache-control': 'public, max-age=86400' });
	return json(text);
};
