/** 75.43 -> "1:15.4" (tenths of a second, for syncing). */
export function clock(seconds: number): string {
	const s = Math.max(0, seconds);
	const m = Math.floor(s / 60);
	const rest = (s - m * 60).toFixed(1).padStart(4, '0');
	return `${m}:${rest}`;
}

/** Decodes an audio file at a low sample rate, enough to draw its waveform. */
export async function decodeForWaveform(url: string, sampleRate = 8000): Promise<Float32Array> {
	const data = await (await fetch(url)).arrayBuffer();
	const context = new OfflineAudioContext(1, 1, sampleRate);
	const buffer = await context.decodeAudioData(data);
	return buffer.getChannelData(0);
}
