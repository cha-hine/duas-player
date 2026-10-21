/** Spoken languages of tracks and videos (the `language` select in PocketBase). */
export const LANGUAGES = {
	ar: { native: 'العربية', fr: 'Arabe' },
	fa: { native: 'فارسی', fr: 'Persan' },
	ur: { native: 'اردو', fr: 'Ourdou' },
	en: { native: 'English', fr: 'Anglais' },
	fr: { native: 'Français', fr: 'Français' },
	tr: { native: 'Türkçe', fr: 'Turc' },
	az: { native: 'Azərbaycanca', fr: 'Azéri' },
	other: { native: '…', fr: 'Autre' }
} as const;

export type Language = keyof typeof LANGUAGES;

export const isLanguage = (value: string | undefined): value is Language =>
	!!value && value in LANGUAGES;
