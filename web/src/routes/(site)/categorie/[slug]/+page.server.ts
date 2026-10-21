import { error } from '@sveltejs/kit';
import * as content from '#lib/server/content.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const category = await content.category(params.slug);
	if (!category) error(404);
	return { category, items: await content.itemsInCategory(category.id) };
};
