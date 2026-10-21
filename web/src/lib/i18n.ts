import type { Path } from '$app/types';
import { resolve } from '$app/paths';
import { localizeHref } from '#lib/paraglide/runtime.js';

/** Link to a page in the current language, e.g. link('/coran') -> '/ar/coran' in Arabic. */
export function link(path: string): string {
	return resolve(localizeHref(path) as Path);
}
