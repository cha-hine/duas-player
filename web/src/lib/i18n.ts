import { resolve } from '$app/paths';
import { localizeHref } from '#lib/paraglide/runtime.js';

/**
 * resolve() for a path built at run time (a localized one): its typed form checks literal
 * routes, which a computed string cannot be, and stops working once the site has many routes.
 */
export const resolvePath = resolve as (path: string) => string;

/** Link to a page in the current language, e.g. link('/quran') -> '/ar/quran' in Arabic. */
export function link(path: string): string {
	return resolvePath(localizeHref(path));
}
