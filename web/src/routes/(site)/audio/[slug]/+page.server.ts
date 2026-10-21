import { error } from '@sveltejs/kit';
import * as content from '#lib/server/content.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const item = await content.item('audio', params.slug);
	if (!item) error(404);
	return { item, related: await content.related(item) };
};
