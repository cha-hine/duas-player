import { error } from '@sveltejs/kit';
import * as content from '#lib/server/content.ts';
import type { PageServerLoad } from './$types';

// Until the Quran module (Phase 7), the Coran page lists the "coran" category
export const load: PageServerLoad = async () => {
	const category = await content.category('coran');
	if (!category) error(404);
	return { category, items: await content.itemsInCategory(category.id) };
};
