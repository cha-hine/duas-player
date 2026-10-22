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

/** "sourate-002-husary-mujawwad" -> { number: 2, variant: "-husary-mujawwad" }; null otherwise. */
export function recitationSlug(slug: string): { number: number; variant: string } | null {
	const found = /^sourate-(\d{3})(-[a-z0-9-]+)$/.exec(slug);
	const number = found ? Number(found[1]) : 0;
	return found && number >= 1 && number <= 114 ? { number, variant: found[2] } : null;
}

/** The same recitation of the surah `step` away (next: 1, previous: -1), if there is one. */
export function neighbourRecitation(slug: string, step: 1 | -1): string | null {
	const parsed = recitationSlug(slug);
	const number = (parsed?.number ?? 0) + step;
	if (!parsed || number < 1 || number > 114) return null;
	return `sourate-${String(number).padStart(3, '0')}${parsed.variant}`;
}

/**
 * The surah a track recites, for the translation the listener chose; null for other tracks
 * and for recited translations (their own text is what is heard).
 */
export function surahOfTrack(slug: string): number | null {
	const parsed = recitationSlug(slug);
	return parsed && !parsed.variant.includes('-translation-') ? parsed.number : null;
}
