import { spawn } from 'node:child_process';

const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH ?? 'ffprobe';
const STDERR_TAIL = 4000;

export class ToolError extends Error {}

/** Runs a command and resolves with stdout/stderr; rejects with the end of stderr on failure. */
function run(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (d) => (stdout += d));
		child.stderr.on('data', (d) => {
			stderr += d;
			if (stderr.length > STDERR_TAIL * 4) stderr = stderr.slice(-STDERR_TAIL * 2);
		});
		child.on('error', reject);
		child.on('close', (code) => {
			if (code === 0) resolve({ stdout, stderr });
			else reject(new ToolError(`${cmd} exited with ${code}: ${stderr.slice(-STDERR_TAIL)}`));
		});
	});
}

export const ffmpeg = (args: string[]) => run(FFMPEG, ['-hide_banner', '-nostdin', ...args]);

/** Spawns ffmpeg with stdout as a stream (for decoding to raw samples). */
export function ffmpegStream(args: string[]) {
	return spawn(FFMPEG, ['-hide_banner', '-nostdin', '-loglevel', 'error', ...args], {
		stdio: ['ignore', 'pipe', 'pipe']
	});
}

export type Probe = {
	duration: number;
	video?: { width: number; height: number };
	hasAudio: boolean;
};

export async function probe(file: string): Promise<Probe> {
	const { stdout } = await run(FFPROBE, [
		'-v',
		'error',
		'-show_entries',
		'format=duration:stream=codec_type,width,height',
		'-of',
		'json',
		file
	]);
	const info = JSON.parse(stdout);
	const streams: { codec_type: string; width?: number; height?: number }[] = info.streams ?? [];
	const video = streams.find((s) => s.codec_type === 'video' && s.width && s.height);
	return {
		duration: Number(info.format?.duration) || 0,
		video: video ? { width: video.width!, height: video.height! } : undefined,
		hasAudio: streams.some((s) => s.codec_type === 'audio')
	};
}

/** EBU R128 target used everywhere: -16 LUFS integrated, -1.5 dBTP peak. */
export const LOUDNORM = 'loudnorm=I=-16:TP=-1.5:LRA=11';
