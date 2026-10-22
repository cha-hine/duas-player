// Listener preferences for the immersive player, remembered on this device.
import { TEXT_LANGUAGE_CODES, type TextLanguage } from '#lib/text-languages.ts';

/** Animated (WebGL) skies first, then the calm landscapes, light enough for TVs. */
export const THEMES = ['aube', 'nuit', 'montagnes', 'mer', 'dunes'] as const;
export type Theme = (typeof THEMES)[number];

/** On a TV, unless the listener chose otherwise: a landscape, which costs the chip nothing. */
const TV_THEME: Theme = 'montagnes';

export const TEXT_SCALES = [0.85, 1, 1.2, 1.45] as const;

const KEY = 'sakina-player';

type Saved = {
	theme: Theme;
	textScale: number;
	hidden: TextLanguage[];
	// Before multilingual text: kept to read older saved settings
	showArabic?: boolean;
	showFrench?: boolean;
};

class PlayerSettings {
	theme = $state<Theme>('aube');
	textScale = $state(1);
	/** Text languages the listener chose not to see. */
	hidden = $state<TextLanguage[]>([]);

	/** Reads saved preferences (browser only; storage may be unavailable). */
	load() {
		if (document.documentElement.dataset.device === 'tv') this.theme = TV_THEME;
		try {
			const saved: Partial<Saved> = JSON.parse(localStorage.getItem(KEY) ?? '{}');
			if (saved.theme && THEMES.includes(saved.theme)) this.theme = saved.theme;
			if (typeof saved.textScale === 'number') this.textScale = saved.textScale;
			if (Array.isArray(saved.hidden)) {
				this.hidden = saved.hidden.filter((code) => TEXT_LANGUAGE_CODES.includes(code));
			} else {
				if (saved.showArabic === false) this.hidden.push('ar');
				if (saved.showFrench === false) this.hidden.push('fr');
			}
		} catch {
			// private mode or blocked storage: keep defaults
		}
	}

	save() {
		try {
			const value: Saved = { theme: this.theme, textScale: this.textScale, hidden: this.hidden };
			localStorage.setItem(KEY, JSON.stringify(value));
		} catch {
			// not remembered, still applied for this visit
		}
	}

	resizeText(step: 1 | -1) {
		const i = TEXT_SCALES.indexOf(this.textScale as (typeof TEXT_SCALES)[number]);
		const next = Math.min(TEXT_SCALES.length - 1, Math.max(0, (i < 0 ? 1 : i) + step));
		this.textScale = TEXT_SCALES[next];
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
