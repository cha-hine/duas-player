// Quran translations listeners choose in the text settings (e.g. one of 41 French ones),
// fetched per surah when needed and kept for the visit. Without a choice, the library's own
// translation shows.
import { settings } from '#lib/player/settings.svelte.ts';
import type { Line, TextLanguage, TextLine } from '#lib/text-languages.ts';

export type Translator = { id: string; name: string };
type SurahTranslation = { basmala?: string; verses: string[] };

/** Languages with translations to choose from. */
export const TRANSLATED: TextLanguage[] = ['fr'];

class Translations {
	/** Translators of each language, once asked for. */
	lists = $state<Partial<Record<TextLanguage, Translator[]>>>({});
	/** Loaded surahs, by "language/translator/surah". */
	texts = $state<Record<string, SurahTranslation>>({});
	#pending = new Set<string>();

	/** Fetches the translators of `language` (once). */
	async list(language: TextLanguage) {
		if (this.lists[language] || this.#pending.has(language)) return;
		this.#pending.add(language);
		try {
			const res = await fetch(`/api/translations/${language}`);
			if (res.ok) this.lists = { ...this.lists, [language]: await res.json() };
		} finally {
			this.#pending.delete(language);
		}
	}

	/** Fetches the chosen translation of `surah` in each translated language (once each). */
	async load(surah: number) {
		for (const language of TRANSLATED) {
			const translator = settings.translators[language];
			if (!translator) continue;
			const key = `${language}/${translator}/${surah}`;
			if (this.texts[key] || this.#pending.has(key)) continue;
			this.#pending.add(key);
			try {
				const res = await fetch(`/api/translations/${key}`);
				if (res.ok) this.texts = { ...this.texts, [key]: await res.json() };
			} finally {
				this.#pending.delete(key);
			}
		}
	}

	/**
	 * A line's text in `code`: the chosen translation of that verse (or of the basmala) when
	 * there is one and it is loaded, the line's own text otherwise. `surah`: the Quran surah the
	 * line belongs to, if it does.
	 */
	text(line: TextLine | Line, code: TextLanguage, surah: number | null): string | undefined {
		const translator = surah && settings.translators[code];
		const chosen = translator ? this.texts[`${code}/${translator}/${surah}`] : undefined;
		if (chosen) {
			const own = line.n ? chosen.verses[line.n - 1] : line.ar ? chosen.basmala : undefined;
			if (own) return own;
		}
		return line[code];
	}
}

export const translations = new Translations();
