// Quran helpers shared by the reading pages and the player.

/** 255 -> "٢٥٥" (Arabic-Indic digits). */
export const arabicNumber = (n: number) =>
	String(n).replace(/\d/g, (d) => String.fromCodePoint(0x0660 + Number(d)));

/** End-of-verse sign with its number; Quran fonts draw the number inside the sign. */
export const verseMark = (n: number) => String.fromCodePoint(0x06dd) + arabicNumber(n);

/** "sourate-002" -> 2 */
export const surahNumber = (slug: string) => Number(slug.replace('sourate-', ''));

export const surahSlug = (n: number) => `sourate-${String(n).padStart(3, '0')}`;

export type SurahSummary = {
	number: number;
	id: string;
	title_fr: string;
	title_ar: string;
	verses: number;
	recitations: number;
};
