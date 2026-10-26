import { error } from '@sveltejs/kit';
import * as content from '#lib/server/content.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const number = Number(params.n);
	if (!Number.isInteger(number) || number < 1 || number > 114) error(404);
	const [surah, all] = await Promise.all([content.surah(number), content.surahs()]);
	if (!surah) error(404);
	const neighbour = (n: number) => all.find((s) => s.number === n) ?? null;
	return { surah, previous: neighbour(number - 1), next: neighbour(number + 1) };
};
