import { redirect } from '@sveltejs/kit';
import { localizeHref } from '#lib/paraglide/runtime.js';
import type { RequestHandler } from './$types';

// The former Douas page is now the "douas" category
export const GET: RequestHandler = () => redirect(301, localizeHref('/categorie/douas'));
