import * as content from '#lib/server/content.ts';
import type { LayoutServerLoad } from './$types';

// The "new additions" column shown next to every page
export const load: LayoutServerLoad = async () => ({ latest: await content.latest(12) });
