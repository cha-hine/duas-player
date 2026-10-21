import type { Line } from '#lib/media.ts';

/** Values per second of the loudness envelope computed by the worker. */
export const ENERGY_PER_SECOND = 5;

/** Index of the line being recited at `time` (seconds), or -1 before the first one. */
export function lineAt(lines: Line[], time: number): number {
	let found = -1;
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].start <= time) found = i;
		else break;
	}
	// Past the end of the last line with a gap after it: nothing is being recited
	if (found >= 0 && lines[found].end > lines[found].start && time > lines[found].end + 1.5) {
		const next = lines[found + 1];
		if (!next || next.start > time) return -1;
	}
	return found;
}

/** Loudness 0..1 at `time`, interpolated between envelope points. */
export function energyAt(energy: number[], time: number): number {
	if (energy.length === 0) return 0;
	const position = Math.max(0, time * ENERGY_PER_SECOND);
	const i = Math.floor(position);
	if (i >= energy.length - 1) return energy[energy.length - 1];
	const f = position - i;
	return energy[i] * (1 - f) + energy[i + 1] * f;
}
