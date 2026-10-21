import type { Component } from 'svelte';
import BookOpen from '@lucide/svelte/icons/book-open';
import Drum from '@lucide/svelte/icons/drum';
import Folder from '@lucide/svelte/icons/folder';
import HandHeart from '@lucide/svelte/icons/hand-heart';
import Landmark from '@lucide/svelte/icons/landmark';
import Mic from '@lucide/svelte/icons/mic';
import MoonStar from '@lucide/svelte/icons/moon-star';
import ScrollText from '@lucide/svelte/icons/scroll-text';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Sunrise from '@lucide/svelte/icons/sunrise';
import Users from '@lucide/svelte/icons/users';

// Icons available for categories (the `icon` field in PocketBase holds the name)
const ICONS: Record<string, Component> = {
	'book-open': BookOpen,
	drum: Drum,
	'hand-heart': HandHeart,
	landmark: Landmark,
	mic: Mic,
	'moon-star': MoonStar,
	'scroll-text': ScrollText,
	sparkles: Sparkles,
	sunrise: Sunrise,
	users: Users
};

export const categoryIcon = (name: string | undefined): Component =>
	(name && ICONS[name]) || Folder;
