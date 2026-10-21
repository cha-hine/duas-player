// Aligns known text lines with a speech-recognition transcript to find when each line starts.
// Recognition of recited Arabic is imperfect (melody, elongation, tajwid), but the text is
// known: a global word alignment (Needleman-Wunsch) with a fuzzy word similarity tolerates
// misheard words, and lines with no recognised word are placed by interpolation.

export type Word = { text: string; start: number; end: number };
export type Alignment = { starts: number[]; confidence: number[] };

/** Same rules as the site search: no vowel marks or tatweel, unified letter variants. */
export function normalize(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, '')
		.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
		.replace(/[\u0649\u06cc]/g, '\u064a')
		.replace(/\u06a9/g, '\u0643')
		.replace(/\u0629/g, '\u0647')
		.replace(/[^\p{L}\p{N}\s]/gu, ' ')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();
}

/** 0..1, how alike two words are (edit distance relative to the longer one). */
export function similarity(a: string, b: string): number {
	if (a === b) return 1;
	if (!a || !b) return 0;
	const prev = new Array<number>(b.length + 1);
	for (let j = 0; j <= b.length; j++) prev[j] = j;
	for (let i = 1; i <= a.length; i++) {
		let diag = prev[0];
		prev[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const up = prev[j];
			prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
			diag = up;
		}
	}
	return 1 - prev[b.length] / Math.max(a.length, b.length);
}

const MATCH = 0.55; // minimum similarity for two words to be the same word
const GAP_TEXT = -0.5; // a text word the recogniser missed
const GAP_HEARD = -0.3; // an extra recognised word (repetition, filler, misheard split)
const WORD_SECONDS = 0.45; // fallback pace when estimating from a word later in the line

/**
 * Start time of each line. `lines` are the Arabic texts, `heard` the recognised words with
 * their times, in order.
 */
export function align(lines: string[], heard: Word[]): Alignment {
	const text: { word: string; line: number; pos: number }[] = [];
	lines.forEach((line, i) =>
		normalize(line)
			.split(' ')
			.filter(Boolean)
			.forEach((word, pos) => text.push({ word, line: i, pos }))
	);
	const words = heard.map((w) => ({ ...w, norm: normalize(w.text) })).filter((w) => w.norm);
	const n = text.length;
	const m = words.length;

	// score[i][j]: best alignment of text[0..i) with words[0..j); move: 1 match, 2 skip text, 3 skip word
	const width = m + 1;
	const score = new Float32Array((n + 1) * width);
	const move = new Uint8Array((n + 1) * width);
	for (let i = 1; i <= n; i++) {
		score[i * width] = i * GAP_TEXT;
		move[i * width] = 2;
	}
	for (let j = 1; j <= m; j++) {
		score[j] = j * GAP_HEARD;
		move[j] = 3;
	}
	for (let i = 1; i <= n; i++) {
		for (let j = 1; j <= m; j++) {
			const sim = similarity(text[i - 1].word, words[j - 1].norm);
			const pair = score[(i - 1) * width + j - 1] + (sim >= MATCH ? 2 * sim : -1);
			const skipText = score[(i - 1) * width + j] + GAP_TEXT;
			const skipWord = score[i * width + j - 1] + GAP_HEARD;
			const best = Math.max(pair, skipText, skipWord);
			score[i * width + j] = best;
			move[i * width + j] = best === pair ? 1 : best === skipText ? 2 : 3;
		}
	}

	// Walk back: which recognised word each text word matched
	const matched = new Array<number>(n).fill(-1);
	for (let i = n, j = m; i > 0 || j > 0; ) {
		const step = move[i * width + j];
		if (step === 1) {
			if (similarity(text[i - 1].word, words[j - 1].norm) >= MATCH) matched[i - 1] = j - 1;
			i--;
			j--;
		} else if (step === 2 || j === 0) {
			i--;
		} else {
			j--;
		}
	}

	// Each line starts at its first matched word (moved back by the words before it)
	const starts: (number | null)[] = lines.map(() => null);
	const counts = lines.map(() => 0);
	const found = lines.map(() => 0);
	text.forEach((t, k) => {
		counts[t.line]++;
		if (matched[k] < 0) return;
		found[t.line]++;
		if (starts[t.line] === null) starts[t.line] = Math.max(0, words[matched[k]].start - t.pos * WORD_SECONDS);
	});

	// Lines with nothing recognised: spread between their neighbours, by number of words
	const end = words.length ? words[words.length - 1].end : 0;
	for (let i = 0; i < lines.length; i++) {
		if (starts[i] !== null) continue;
		let a = i - 1;
		while (a >= 0 && starts[a] === null) a--;
		let b = i + 1;
		while (b < lines.length && starts[b] === null) b++;
		const from = a >= 0 ? starts[a]! : 0;
		const to = b < lines.length ? starts[b]! : end;
		const before = counts.slice(a + 1, i).reduce((s, c) => s + c, a >= 0 ? counts[a] : 0);
		const total = counts.slice(a + 1, b).reduce((s, c) => s + c, a >= 0 ? counts[a] : 0) || 1;
		starts[i] = from + ((to - from) * before) / total;
	}

	// Strictly increasing
	const out = starts.map((s) => s ?? 0);
	for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + 0.3);
	return {
		starts: out.map((s) => Math.round(s * 100) / 100),
		confidence: counts.map((c, i) => (c ? Math.round((found[i] / c) * 100) / 100 : 0))
	};
}
