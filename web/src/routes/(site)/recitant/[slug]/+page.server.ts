import { error } from '@sveltejs/kit';
import * as content from '#lib/server/content.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const found = await content.reciter(params.slug);
	if (!found) error(404);
	return found;
};
