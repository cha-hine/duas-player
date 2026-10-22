// Fonts listeners can choose for each text language (immersive player, Quran pages). All are
// self-hosted (src/lib/fonts.ts) under the SIL Open Font License; the Arabic ones draw the
// marks of Tanzil's Uthmani text and the verse sign ۝ with its number. The first font of each
// list is the default, the site's own.
import type { TextLanguage } from './text-languages.ts';

export type TextFont = {
	id: string;
	name: string;
	family: string;
	/** Some fonts are drawn smaller or larger than the others: evened out. */
	scale?: number;
};

const ARABIC = 'var(--font-arabic), serif';

const QURAN: TextFont[] = [
	{ id: 'amiri-quran', name: 'Amiri Quran', family: `'Amiri Quran', ${ARABIC}` },
	{ id: 'scheherazade', name: 'Scheherazade New', family: `'Scheherazade New', ${ARABIC}` },
	{
		id: 'noto-naskh',
		name: 'Noto Naskh Arabic',
		family: `'Noto Naskh Arabic Variable', ${ARABIC}`
	},
	{ id: 'amiri', name: 'Amiri', family: `'Amiri', ${ARABIC}` },
	{
		id: 'noto-kufi',
		name: 'Noto Kufi Arabic',
		family: `'Noto Kufi Arabic Variable', ${ARABIC}`,
		scale: 0.88
	},
	{ id: 'lateef', name: 'Lateef', family: `'Lateef', ${ARABIC}`, scale: 1.3 }
];

const SERIF: TextFont[] = [
	{ id: 'cormorant', name: 'Cormorant Garamond', family: "'Cormorant Garamond', Georgia, serif" },
	{ id: 'eb-garamond', name: 'EB Garamond', family: "'EB Garamond Variable', Georgia, serif" },
	{ id: 'lora', name: 'Lora', family: "'Lora Variable', Georgia, serif", scale: 0.92 },
	{ id: 'literata', name: 'Literata', family: "'Literata Variable', Georgia, serif", scale: 0.9 },
	{
		id: 'source-serif',
		name: 'Source Serif',
		family: "'Source Serif 4 Variable', Georgia, serif",
		scale: 0.92
	}
];

const SANS: TextFont[] = [
	{ id: 'inter', name: 'Inter', family: "'Inter Variable', system-ui, sans-serif" },
	{
		id: 'atkinson',
		name: 'Atkinson Hyperlegible',
		family: "'Atkinson Hyperlegible', system-ui, sans-serif"
	}
];

const NASKH: TextFont = {
	id: 'noto-naskh',
	name: 'Noto Naskh',
	family: `'Noto Naskh Arabic Variable', ${ARABIC}`
};

export const TEXT_FONTS: Record<TextLanguage, TextFont[]> = {
	ar: QURAN,
	// Transliteration reads best in a plain sans-serif; translations in a book serif
	translit: [...SANS, ...SERIF],
	fr: [...SERIF, ...SANS],
	en: [...SERIF, ...SANS],
	gu: [
		{
			id: 'noto-gujarati',
			name: 'Noto Sans Gujarati',
			family: "'Noto Sans Gujarati', system-ui, sans-serif"
		}
	],
	ur: [
		{ id: 'noto-nastaliq', name: 'Noto Nastaliq Urdu', family: `'Noto Nastaliq Urdu', ${ARABIC}` },
		NASKH
	],
	fa: [
		NASKH,
		{ id: 'vazirmatn', name: 'Vazirmatn', family: "'Vazirmatn Variable', sans-serif", scale: 0.92 }
	]
};
