// Languages of synced text lines. A line holds one text per language, e.g.
// { start: 12.4, end: 18, ar: '…', fr: '…', gu: '…' }; listeners choose which ones to show.
// `lang` is the HTML language tag (transliteration is Arabic written in Latin letters).

export const TEXT_LANGUAGES = {
	ar: {
		native: 'العربية',
		fr: 'Arabe',
		short: 'Ar',
		lang: 'ar',
		dir: 'rtl',
		font: 'var(--font-quran)'
	},
	translit: {
		native: 'Translittération',
		fr: 'Translittération',
		short: 'Tr',
		lang: 'ar-Latn',
		dir: 'ltr',
		font: 'var(--font-latin)'
	},
	fr: {
		native: 'Français',
		fr: 'Français',
		short: 'Fr',
		lang: 'fr',
		dir: 'ltr',
		font: 'var(--font-display-latin)'
	},
	en: {
		native: 'English',
		fr: 'Anglais',
		short: 'En',
		lang: 'en',
		dir: 'ltr',
		font: 'var(--font-display-latin)'
	},
	gu: {
		native: 'ગુજરાતી',
		fr: 'Gujarati',
		short: 'Gu',
		lang: 'gu',
		dir: 'ltr',
		font: 'var(--font-gujarati)'
	},
	ur: {
		native: 'اردو',
		fr: 'Ourdou',
		short: 'Ur',
		lang: 'ur',
		dir: 'rtl',
		font: 'var(--font-urdu)'
	},
	fa: {
		native: 'فارسی',
		fr: 'Persan',
		short: 'Fa',
		lang: 'fa',
		dir: 'rtl',
		font: 'var(--font-arabic)'
	}
} as const;

export type TextLanguage = keyof typeof TEXT_LANGUAGES;

/** Display order: Arabic first, then the others as listed above. */
export const TEXT_LANGUAGE_CODES = Object.keys(TEXT_LANGUAGES) as TextLanguage[];

/** `n`: verse number of a Quran line (none for the basmala or for other texts). */
export type Line = { start: number; end: number; n?: number } & Partial<
	Record<TextLanguage, string>
>;

/** A line of the text library: the same, without timings. */
export type TextLine = { n?: number } & Partial<Record<TextLanguage, string>>;

/** Languages that have text in at least one line, in display order. */
export function lineLanguages(lines: TextLine[]): TextLanguage[] {
	return TEXT_LANGUAGE_CODES.filter((code) => lines.some((line) => line[code]?.trim()));
}

/** Text saved without timings yet (every line at 0): readable on the page, not shown by the player. */
export const isSynced = (lines: Line[]) => lines.some((line) => line.end > 0);
