import * as content from '#lib/server/content.ts';
import type { PageServerLoad } from './$types';

// The latest additions come from the site layout (right-hand column)
export const load: PageServerLoad = async () => {
	const [categories, counts] = await Promise.all([content.categories(), content.categoryCounts()]);
	return { categories, counts };
};
