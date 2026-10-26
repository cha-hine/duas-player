import { error, redirect } from '@sveltejs/kit';
import { link } from '#lib/i18n.ts';
import * as content from '#lib/server/content.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	// The Quran has its own pages, by surah: thousands of recitations make no single list
	if (params.slug === 'coran') redirect(308, link('/quran'));
	const category = await content.category(params.slug);
	if (!category) error(404);
	return { category, items: await content.itemsInCategory(category.id) };
};
