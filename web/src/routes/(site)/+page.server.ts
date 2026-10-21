import * as content from '#lib/server/content.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [latest, categories, counts] = await Promise.all([
		content.latest(8),
		content.categories(),
		content.categoryCounts()
	]);
	return { latest, categories, counts };
};
