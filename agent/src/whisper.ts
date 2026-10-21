// Speech recognition with whisper.cpp (whisper-cli), word by word with timings.
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { cpus } from 'node:os';
import type { Word } from './align.ts';
import { config } from './config.ts';

function run(cmd: string, args: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
		let err = '';
		child.stderr.on('data', (d) => (err = (err + d).slice(-3000)));
		child.on('error', reject);
		child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}: ${err}`))));
	});
}

/** 16 kHz mono WAV, the input whisper.cpp expects. */
export const toWav = (input: string, output: string) =>
	run(config.ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-ac', '1', '-ar', '16000', output]);

type Output = { transcription: { offsets: { from: number; to: number }; text: string }[] };

/**
 * Recognised words of an Arabic recording. `prompt` (the start of the known text) helps the
 * model with the vocabulary of the recitation.
 */
export async function transcribe(wav: string, outBase: string, prompt: string): Promise<Word[]> {
	await run(config.whisper, [
		'-m',
		config.model,
		'-f',
		wav,
		'-l',
		'ar',
		'-t',
		String(Math.max(1, cpus().length - 1)),
		'-ml',
		'1', // one word per segment...
		'-sow', // ...split on words
		'-oj',
		'-of',
		outBase,
		'--prompt',
		prompt.slice(0, 200)
	]);
	const out = JSON.parse(await readFile(`${outBase}.json`, 'utf8')) as Output;
	return out.transcription
		.map((s) => ({ text: s.text.trim(), start: s.offsets.from / 1000, end: s.offsets.to / 1000 }))
		.filter((w) => w.text);
}
