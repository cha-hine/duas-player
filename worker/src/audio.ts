import { join } from 'node:path';
import { LOUDNORM, ffmpeg, ffmpegStream, probe } from './ffmpeg.ts';
import { download, update, type MediaRecord } from './pb.ts';

const WAVEFORM_POINTS = 1000;
const WAVEFORM_RATE = 8000;

/**
 * Two-pass loudness normalisation to -16 LUFS, encoded as AAC in .m4a
 * (plays everywhere, including iPhone), plus duration and waveform peaks.
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
	const waveform = await peaks(output, duration);

	await update(
		record,
		{ duration: Math.round(duration * 100) / 100, waveform, status: 'ready', processing_error: '' },
		{ stream: { path: output, name: `${record.slug ?? record.id}.m4a`, type: 'audio/mp4' } }
	);
}

/** Peak amplitude per slice of the file, 0..1, for drawing a waveform. */
async function peaks(file: string, duration: number): Promise<number[]> {
	const totalSamples = Math.max(1, Math.ceil(duration * WAVEFORM_RATE));
	const perPoint = Math.max(1, Math.ceil(totalSamples / WAVEFORM_POINTS));
	const result = new Array<number>(Math.ceil(totalSamples / perPoint)).fill(0);

	const child = ffmpegStream(['-i', file, '-ac', '1', '-ar', String(WAVEFORM_RATE), '-f', 's16le', '-']);
	let index = 0;
	let carry: Buffer | null = null;
	for await (const chunk of child.stdout as AsyncIterable<Buffer>) {
		const data: Buffer = carry ? Buffer.concat([carry, chunk]) : chunk;
		const usable = data.length - (data.length % 2);
		for (let i = 0; i < usable; i += 2) {
			const point = Math.min(result.length - 1, Math.floor(index++ / perPoint));
			const v = Math.abs(data.readInt16LE(i));
			if (v > result[point]) result[point] = v;
		}
		carry = usable < data.length ? data.subarray(usable) : null;
	}

	const max = Math.max(1, ...result);
	return result.map((v) => Math.round((v / max) * 100) / 100);
}
