// Content shapes shared by the server loaders and the pages.
import { isLanguage, type Language } from '#lib/languages.ts';
import { getLocale } from '#lib/paraglide/runtime.js';
import type { Line } from '#lib/text-languages.ts';

export type Category = {
	id: string;
	slug: string;
	name_fr: string;
	name_ar: string;
	description_fr: string;
	description_ar: string;
	icon: string;
};

export type Reciter = {
	id: string;
	slug: string;
	name_fr: string;
	name_ar: string;
	bio_fr: string;
	bio_ar: string;
	photoUrl: string | null;
};

export type { Line };

export type MediaItem = {
	kind: 'audio' | 'video';
	id: string;
	slug: string;
	title_fr: string;
	title_ar: string;
	description_fr: string;
	description_ar: string;
	language: Language | null;
	duration: number;
	created: string;
	category: Category | null;
	reciter: Reciter | null;
	/** Video poster, or null for audio. */
	posterUrl: string | null;
	/** Audio: loudness-normalised stream (or the original while processing). */
	audioUrl: string | null;
	/** Video: HLS master playlist. */
	hlsUrl: string | null;
	lines: Line[];
};

export const toLanguage = (value: string): Language | null => (isLanguage(value) ? value : null);

const isArabic = () => getLocale() === 'ar';

/** Title in the interface language, falling back to the other one. */
export const title = (item: Pick<MediaItem, 'title_fr' | 'title_ar'>) =>
	isArabic() ? item.title_ar || item.title_fr : item.title_fr || item.title_ar;

/** The title in the other language, when it differs. */
export function otherTitle(item: Pick<MediaItem, 'title_fr' | 'title_ar'>): string {
	const other = isArabic() ? item.title_fr : item.title_ar;
	return other && other !== title(item) ? other : '';
}

export const name = (x: { name_fr: string; name_ar: string }) =>
	isArabic() ? x.name_ar || x.name_fr : x.name_fr || x.name_ar;

export const localized = (fr: string, ar: string) => (isArabic() ? ar || fr : fr || ar);

/** 75 -> "1:15", 3725 -> "1:02:05" */
export function formatDuration(seconds: number): string {
	if (!seconds) return '';
	const s = Math.round(seconds);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = String(s % 60).padStart(2, '0');
	return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

export const itemPath = (item: Pick<MediaItem, 'kind' | 'slug'>) => `/${item.kind}/${item.slug}`;
