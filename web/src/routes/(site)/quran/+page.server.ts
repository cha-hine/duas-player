import * as content from '#lib/server/content.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [surahs, reciters] = await Promise.all([content.surahs(), content.quranReciters()]);
	return { surahs, reciters };
};
