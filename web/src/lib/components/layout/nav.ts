import type { Component } from 'svelte';
import BookOpen from '@lucide/svelte/icons/book-open';
import HandHeart from '@lucide/svelte/icons/hand-heart';
import House from '@lucide/svelte/icons/house';
import Tv from '@lucide/svelte/icons/tv';
import { m } from '#lib/paraglide/messages.js';

export type NavItem = {
	/** Unlocalized path, e.g. '/coran' */
	path: string;
	label: () => string;
	icon: Component;
};

export const navItems: NavItem[] = [
	{ path: '/', label: m.nav_home, icon: House },
	{ path: '/coran', label: m.nav_quran, icon: BookOpen },
	{ path: '/invocations', label: m.nav_duas, icon: HandHeart },
	{ path: '/tv', label: m.nav_tv, icon: Tv }
];

/** True when `current` (unlocalized) is `path` or a page inside it. */
export function isActive(path: string, current: string): boolean {
	return path === '/' ? current === '/' : current === path || current.startsWith(`${path}/`);
}
