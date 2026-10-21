import PocketBase from 'pocketbase';
import { PUBLIC_PB_URL } from '$app/env/public';

/** Browser-side PocketBase client for the admin pages. The login is kept in localStorage. */
export const pb = new PocketBase(PUBLIC_PB_URL);

/** Lower-case, accent-free, dash-separated: "Adhkar du matin" -> "adhkar-du-matin". */
export function slugify(text: string): string {
	return text
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 120);
}
