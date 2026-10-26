import { redirect } from '@sveltejs/kit';
import { link } from '#lib/i18n.ts';
import type { RequestHandler } from './$types';

// The Quran pages moved from /coran to /quran: old links and bookmarks still work.
export const GET: RequestHandler = ({ params, url }) =>
	redirect(308, link(`/quran${params.rest ? `/${params.rest}` : ''}`) + url.search);
