// The text being prepared for one track: one block of text per language (one line per
// verse or phrase), and the start time of each line once synced.
import type { Line, TextLanguage, TextLine } from '#lib/text-languages.ts';
import { lineLanguages, isSynced } from '#lib/text-languages.ts';

export type DraftData = {
	languages: TextLanguage[];
	texts: Partial<Record<TextLanguage, string>>;
	starts: (number | null)[];
};

const splitLines = (text: string | undefined) =>
	(text ?? '')
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);

export class Draft {
	languages = $state<TextLanguage[]>(['ar', 'fr']);
	texts = $state<Partial<Record<TextLanguage, string>>>({});
	/** Start of each line in seconds, or null while not synced yet. */
	starts = $state<(number | null)[]>([]);
	duration = $state(0);

	/** Lines of each selected language. */
	rows = $derived(
		Object.fromEntries(this.languages.map((code) => [code, splitLines(this.texts[code])]))
	);
	count = $derived(Math.max(0, ...this.languages.map((code) => this.rows[code]?.length ?? 0)));
	/** Languages whose number of lines differs from the longest one. */
	mismatched = $derived(
		this.languages.filter((code) => (this.rows[code]?.length ?? 0) !== this.count)
	);
	syncedCount = $derived(this.starts.slice(0, this.count).filter((s) => s !== null).length);
	complete = $derived(this.count > 0 && this.syncedCount === this.count);

	/** Lines as the player uses them; an unsynced line starts where the previous one did. */
	lines = $derived.by((): Line[] => {
		const out: Line[] = [];
		for (let i = 0; i < this.count; i++) {
			const start = this.starts[i] ?? out[i - 1]?.start ?? 0;
			const line: Line = { start, end: 0 };
			for (const code of this.languages) {
				const text = this.rows[code]?.[i];
				if (text) line[code] = text;
			}
			out.push(line);
		}
		out.forEach((line, i) => (line.end = out[i + 1]?.start ?? (this.duration || line.start + 5)));
		return out;
	});

	/** From a track's lines (with timings) or a library text (without). */
	constructor(lines: (TextLine & Partial<Line>)[], duration = 0) {
		this.duration = duration;
		this.loadText(lines);
		if (isSynced(lines as Line[])) this.starts = lines.map((line) => line.start ?? null);
	}

	/** Replaces the text with `lines` (e.g. from the library); timings start over. */
	loadText(lines: TextLine[]) {
		const languages = lineLanguages(lines);
		this.languages = languages.length ? languages : ['ar', 'fr'];
		this.texts = Object.fromEntries(
			this.languages.map((code) => [code, lines.map((line) => line[code] ?? '').join('\n')])
		);
		this.starts = lines.map(() => null);
	}

	/** The text alone, as stored in the library. */
	toTextLines(): TextLine[] {
		return this.lines.map((line) => {
			const text: TextLine = {};
			for (const code of this.languages) if (line[code]) text[code] = line[code];
			return text;
		});
	}

	/** Keeps one start per line after the text changed (new lines are not synced). */
	fitStarts() {
		const starts = this.starts.slice(0, this.count);
		while (starts.length < this.count) starts.push(null);
		this.starts = starts;
	}

	setLanguages(languages: TextLanguage[]) {
		this.languages = languages;
		this.fitStarts();
	}

	setText(code: TextLanguage, text: string) {
		this.texts[code] = text;
		this.fitStarts();
	}

	/** What gets saved: full timings once every line is synced, otherwise the text alone. */
	toSave(): Line[] {
		if (this.complete) return this.lines;
		return this.lines.map((line) => ({ ...line, start: 0, end: 0 }));
	}

	toJSON(): DraftData {
		return { languages: this.languages, texts: this.texts, starts: this.starts };
	}

	restore(data: DraftData) {
		this.languages = data.languages;
		this.texts = data.texts;
		this.starts = data.starts;
		this.fitStarts();
	}
}
