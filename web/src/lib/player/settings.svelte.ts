// Listener preferences for the immersive player, remembered on this device.

export const THEMES = ['aube', 'nuit', 'ondes', 'eau'] as const;
export type Theme = (typeof THEMES)[number];

export const TEXT_SCALES = [0.85, 1, 1.2, 1.45] as const;

const KEY = 'sakina-player';

type Saved = { theme: Theme; textScale: number; showArabic: boolean; showFrench: boolean };

class PlayerSettings {
	theme = $state<Theme>('aube');
	textScale = $state(1);
	showArabic = $state(true);
	showFrench = $state(true);

	/** Reads saved preferences (browser only; storage may be unavailable). */
	load() {
		try {
			const saved: Partial<Saved> = JSON.parse(localStorage.getItem(KEY) ?? '{}');
			if (saved.theme && THEMES.includes(saved.theme)) this.theme = saved.theme;
			if (typeof saved.textScale === 'number') this.textScale = saved.textScale;
			if (typeof saved.showArabic === 'boolean') this.showArabic = saved.showArabic;
			if (typeof saved.showFrench === 'boolean') this.showFrench = saved.showFrench;
		} catch {
			// private mode or blocked storage: keep defaults
		}
	}

	save() {
		try {
			const value: Saved = {
				theme: this.theme,
				textScale: this.textScale,
				showArabic: this.showArabic,
				showFrench: this.showFrench
			};
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

	/** At least one language stays visible. */
	toggleLanguage(which: 'ar' | 'fr') {
		if (which === 'ar' && (this.showFrench || !this.showArabic)) this.showArabic = !this.showArabic;
		if (which === 'fr' && (this.showArabic || !this.showFrench)) this.showFrench = !this.showFrench;
		this.save();
	}

	setTheme(theme: Theme) {
		this.theme = theme;
		this.save();
	}
}

export const settings = new PlayerSettings();
