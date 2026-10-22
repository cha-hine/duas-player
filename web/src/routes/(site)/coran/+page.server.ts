import * as content from '#lib/server/content.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [surahs, category] = await Promise.all([content.surahs(), content.category('coran')]);
	return {
		surahs,
		recitations: category ? await content.itemsInCategory(category.id) : []
	};
};
