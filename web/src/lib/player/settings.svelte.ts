// Listener preferences for the immersive player and the Quran pages, remembered on this device.
import { TEXT_FONTS, type TextFont } from '#lib/text-fonts.ts';
import { TEXT_LANGUAGE_CODES, type TextLanguage } from '#lib/text-languages.ts';

/** Animated (WebGL) skies first, then the calm landscapes, light enough for TVs. */
export const THEMES = [
	'aube',
	'nuit',
	'montagnes',
	'mer',
	'dunes',
	'neige',
	'foret',
	'cascade',
	'lanternes'
] as const;
export type Theme = (typeof THEMES)[number];

/** On a TV, unless the listener chose otherwise: a landscape, which costs the chip nothing. */
const TV_THEME: Theme = 'montagnes';

/** Size of each language's text, relative to the default: 60 % to 200 %, by tenths. */
export const SIZE_MIN = 0.6;
export const SIZE_MAX = 2;
const SIZE_STEP = 0.1;

const KEY = 'sakina-player';

type Saved = {
	theme: Theme;
	hidden: TextLanguage[];
	fonts: Partial<Record<TextLanguage, string>>;
	sizes: Partial<Record<TextLanguage, number>>;
	translators: Partial<Record<TextLanguage, string>>;
	// Older saved settings: one size for every language, Arabic and French on or off
	textScale?: number;
	showArabic?: boolean;
	showFrench?: boolean;
};

const isLanguage = (code: string): code is TextLanguage =>
	(TEXT_LANGUAGE_CODES as string[]).includes(code);

/** Rounded to a tenth (no 1.2000000002) and kept within the allowed sizes. */
const clampSize = (size: number) =>
	Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.round(size * 10) / 10));

class PlayerSettings {
	theme = $state<Theme>('aube');
	/** Text languages the listener chose not to see. */
	hidden = $state<TextLanguage[]>([]);
	/** Font chosen per language (id from TEXT_FONTS); the first of the list otherwise. */
	fonts = $state<Partial<Record<TextLanguage, string>>>({});
	/** Text size per language, 1 = default. */
	sizes = $state<Partial<Record<TextLanguage, number>>>({});
	/** Quran translation chosen per language (id in the translations collection). */
	translators = $state<Partial<Record<TextLanguage, string>>>({});

	/** Reads saved preferences (browser only; storage may be unavailable). */
	load() {
		if (document.documentElement.dataset.device === 'tv') this.theme = TV_THEME;
		try {
			const saved: Partial<Saved> = JSON.parse(localStorage.getItem(KEY) ?? '{}');
			if (saved.theme && THEMES.includes(saved.theme)) this.theme = saved.theme;
			if (Array.isArray(saved.hidden)) {
				this.hidden = saved.hidden.filter((code) => TEXT_LANGUAGE_CODES.includes(code));
			} else {
				if (saved.showArabic === false) this.hidden.push('ar');
				if (saved.showFrench === false) this.hidden.push('fr');
			}
			for (const [code, id] of Object.entries(saved.fonts ?? {})) {
				if (isLanguage(code) && TEXT_FONTS[code].some((font) => font.id === id)) {
					this.fonts[code] = id;
				}
			}
			for (const [code, size] of Object.entries(saved.sizes ?? {})) {
				if (isLanguage(code) && typeof size === 'number') this.sizes[code] = clampSize(size);
			}
			for (const [code, id] of Object.entries(saved.translators ?? {})) {
				if (isLanguage(code) && typeof id === 'string') this.translators[code] = id;
			}
			// The former single size applies to every language
			if (!saved.sizes && typeof saved.textScale === 'number') {
				for (const code of TEXT_LANGUAGE_CODES) this.sizes[code] = clampSize(saved.textScale);
			}
		} catch {
			// private mode or blocked storage: keep defaults
		}
	}

	save() {
		try {
			const value: Saved = {
				theme: this.theme,
				hidden: this.hidden,
				fonts: this.fonts,
				sizes: this.sizes,
				translators: this.translators
			};
			localStorage.setItem(KEY, JSON.stringify(value));
		} catch {
			// not remembered, still applied for this visit
		}
	}

	/** The font a language's text is shown in. */
	font(code: TextLanguage): TextFont {
		return TEXT_FONTS[code].find((font) => font.id === this.fonts[code]) ?? TEXT_FONTS[code][0];
	}

	/** The size chosen for a language (1 = default), before evening out the font. */
	size(code: TextLanguage): number {
		return this.sizes[code] ?? 1;
	}

	/** What to multiply a language's text size by: the listener's size and the font's own. */
	scale(code: TextLanguage): number {
		return this.size(code) * (this.font(code).scale ?? 1);
	}

	setFont(code: TextLanguage, id: string) {
		this.fonts = { ...this.fonts, [code]: id };
		this.save();
	}

	resize(code: TextLanguage, step: 1 | -1) {
		this.sizes = { ...this.sizes, [code]: clampSize(this.size(code) + step * SIZE_STEP) };
		this.save();
	}

	setTranslator(code: TextLanguage, id: string) {
		this.translators = { ...this.translators, [code]: id };
		this.save();
	}

	/** Back to the site's fonts, sizes and translations. */
	resetText() {
		this.fonts = {};
		this.sizes = {};
		this.translators = {};
		this.save();
	}

	/** Languages of `available` to display; never none. */
	visible(available: TextLanguage[]): TextLanguage[] {
		const shown = available.filter((code) => !this.hidden.includes(code));
		return shown.length ? shown : available.slice(0, 1);
	}

	/** Shows or hides a language, keeping at least one of `available` visible. */
	toggleLanguage(code: TextLanguage, available: TextLanguage[]) {
		if (this.hidden.includes(code)) {
			this.hidden = this.hidden.filter((c) => c !== code);
		} else if (this.visible(available).filter((c) => c !== code).length > 0) {
			this.hidden = [...this.hidden, code];
		}
		this.save();
	}

	setTheme(theme: Theme) {
		this.theme = theme;
		this.save();
	}
}

export const settings = new PlayerSettings();
