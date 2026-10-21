import type { Component } from 'svelte';
import BookOpen from '@lucide/svelte/icons/book-open';
import House from '@lucide/svelte/icons/house';
import Library from '@lucide/svelte/icons/library';
import Tv from '@lucide/svelte/icons/tv';
import { m } from '#lib/paraglide/messages.js';

export type NavItem = {
	/** Unlocalized path, e.g. '/coran' */
	path: string;
	label: () => string;
	icon: Component;
	/** Other paths that belong to this section. */
	also?: string[];
};

export const navItems: NavItem[] = [
	{ path: '/', label: m.nav_home, icon: House },
	{ path: '/coran', label: m.nav_quran, icon: BookOpen },
	{
		path: '/bibliotheque',
		label: m.nav_library,
		icon: Library,
		also: ['/categorie', '/audio', '/video', '/recitant', '/recherche']
	},
	{ path: '/tv', label: m.nav_tv, icon: Tv }
];

const within = (path: string, current: string) =>
	current === path || current.startsWith(`${path}/`);

/** True when `current` (unlocalized) is the item's page or a page inside its section. */
export function isActive(item: NavItem, current: string): boolean {
	if (item.path === '/') return current === '/';
	return within(item.path, current) || (item.also ?? []).some((p) => within(p, current));
}
