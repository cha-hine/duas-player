import { join } from 'node:path';
import { LOUDNORM, ffmpeg, ffmpegStream, probe } from './ffmpeg.ts';
import { download, update, type MediaRecord } from './pb.ts';

const WAVEFORM_POINTS = 1000;
const SAMPLE_RATE = 8000;
/** Loudness envelope resolution used by the player's animated background. */
const ENERGY_PER_SECOND = 5;

/**
 * Two-pass loudness normalisation to -16 LUFS, encoded as AAC in .m4a
 * (plays everywhere, including iPhone), plus duration, waveform peaks and loudness envelope.
 */
export async function processTrack(record: MediaRecord, workDir: string): Promise<void> {
	const source = join(workDir, 'source');
	const output = join(workDir, 'stream.m4a');
	await download(record, 'audio', source);

	// Pass 1: measure
	const { stderr } = await ffmpeg(['-i', source, '-vn', '-af', `${LOUDNORM}:print_format=json`, '-f', 'null', '-']);
	const m = JSON.parse(stderr.slice(stderr.lastIndexOf('{'), stderr.lastIndexOf('}') + 1));

	// Pass 2: apply the measured correction linearly (no pumping)
	const filter =
		`${LOUDNORM}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}` +
		`:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`;
	await ffmpeg(['-y', '-i', source, '-vn', '-af', filter, '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', output]);

	const { duration } = await probe(output);
	const { waveform, energy } = await analyse(output, duration);

	await update(
		record,
		{ duration: Math.round(duration * 100) / 100, waveform, energy, status: 'ready', processing_error: '' },
		{ stream: { path: output, name: `${record.slug ?? record.id}.m4a`, type: 'audio/mp4' } }
	);
}

/**
 * One decoding pass for two views of the sound:
 * - waveform: peak amplitude per slice (1000 slices), for drawing;
 * - energy: RMS loudness 5 times per second, scaled 0..1, for the animated background.
 */
async function analyse(file: string, duration: number): Promise<{ waveform: number[]; energy: number[] }> {
	const totalSamples = Math.max(1, Math.ceil(duration * SAMPLE_RATE));
	const perPoint = Math.max(1, Math.ceil(totalSamples / WAVEFORM_POINTS));
	const peaks = new Array<number>(Math.ceil(totalSamples / perPoint)).fill(0);
	const perEnergy = SAMPLE_RATE / ENERGY_PER_SECOND;
	const squares = new Array<number>(Math.ceil(totalSamples / perEnergy)).fill(0);

	const child = ffmpegStream(['-i', file, '-ac', '1', '-ar', String(SAMPLE_RATE), '-f', 's16le', '-']);
	let index = 0;
	let carry: Buffer | null = null;
	for await (const chunk of child.stdout as AsyncIterable<Buffer>) {
		const data: Buffer = carry ? Buffer.concat([carry, chunk]) : chunk;
		const usable = data.length - (data.length % 2);
		for (let i = 0; i < usable; i += 2) {
			const sample = data.readInt16LE(i);
			const point = Math.min(peaks.length - 1, Math.floor(index / perPoint));
			const v = Math.abs(sample);
			if (v > peaks[point]) peaks[point] = v;
			squares[Math.min(squares.length - 1, Math.floor(index / perEnergy))] += sample * sample;
			index++;
		}
		carry = usable < data.length ? data.subarray(usable) : null;
	}

	const maxPeak = Math.max(1, ...peaks);
	const waveform = peaks.map((v) => Math.round((v / maxPeak) * 100) / 100);

	// Scale on the loud parts (95th percentile) so quiet recordings still move the visuals
	const rms = squares.map((s) => Math.sqrt(s / perEnergy));
	const sorted = [...rms].sort((a, b) => a - b);
	const reference = Math.max(1, sorted[Math.floor(sorted.length * 0.95)] ?? 1);
	const energy = rms.map((v) => Math.round(Math.min(1, v / reference) * 100) / 100);

	return { waveform, energy };
}
