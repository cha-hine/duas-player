export type Theme = 'dark' | 'light';

export const THEME_COOKIE = 'theme';

export function parseTheme(value: string | undefined): Theme {
	return value === 'light' ? 'light' : 'dark';
}

/** Applies the theme to the page and remembers it for server rendering. */
export function applyTheme(theme: Theme) {
	document.documentElement.dataset.theme = theme;
	document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}
