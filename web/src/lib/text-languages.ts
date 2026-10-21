// Languages of synced text lines. A line holds one text per language, e.g.
// { start: 12.4, end: 18, ar: '…', fr: '…', gu: '…' }; listeners choose which ones to show.
// `lang` is the HTML language tag (transliteration is Arabic written in Latin letters).

export const TEXT_LANGUAGES = {
	ar: {
		native: 'العربية',
		fr: 'Arabe',
		short: 'ع',
		lang: 'ar',
		dir: 'rtl',
		font: 'var(--font-quran)'
	},
	translit: {
		native: 'Translittération',
		fr: 'Translittération',
		short: 'Abc',
		lang: 'ar-Latn',
		dir: 'ltr',
		font: 'var(--font-latin)'
	},
	fr: {
		native: 'Français',
		fr: 'Français',
		short: 'FR',
		lang: 'fr',
		dir: 'ltr',
		font: 'var(--font-display-latin)'
	},
	en: {
		native: 'English',
		fr: 'Anglais',
		short: 'EN',
		lang: 'en',
		dir: 'ltr',
		font: 'var(--font-display-latin)'
	},
	gu: {
		native: 'ગુજરાતી',
		fr: 'Gujarati',
		short: 'ગુ',
		lang: 'gu',
		dir: 'ltr',
		font: 'var(--font-gujarati)'
	},
	ur: {
		native: 'اردو',
		fr: 'Ourdou',
		short: 'اردو',
		lang: 'ur',
		dir: 'rtl',
		font: 'var(--font-urdu)'
	},
	fa: {
		native: 'فارسی',
		fr: 'Persan',
		short: 'فا',
		lang: 'fa',
		dir: 'rtl',
		font: 'var(--font-arabic)'
	}
} as const;

export type TextLanguage = keyof typeof TEXT_LANGUAGES;

/** Display order: Arabic first, then the others as listed above. */
export const TEXT_LANGUAGE_CODES = Object.keys(TEXT_LANGUAGES) as TextLanguage[];

export type Line = { start: number; end: number } & Partial<Record<TextLanguage, string>>;

/** A line of the text library: the same, without timings. */
export type TextLine = Partial<Record<TextLanguage, string>>;

/** Languages that have text in at least one line, in display order. */
export function lineLanguages(lines: TextLine[]): TextLanguage[] {
	return TEXT_LANGUAGE_CODES.filter((code) => lines.some((line) => line[code]?.trim()));
}

/** Text saved without timings yet (every line at 0): readable on the page, not shown by the player. */
export const isSynced = (lines: Line[]) => lines.some((line) => line.end > 0);
