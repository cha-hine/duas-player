import { mkdir, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { LOUDNORM, ffmpeg, probe } from './ffmpeg.ts';
import { download, update, type MediaRecord } from './pb.ts';

const MEDIA_DIR = process.env.MEDIA_DIR ?? join(import.meta.dirname, '../../pb/pb_public/media');
const SEGMENT_SECONDS = 6;

const RENDITIONS = [
	{ height: 360, video: 800, audio: 96 },
	{ height: 720, video: 2800, audio: 128 },
	{ height: 1080, video: 5000, audio: 128 }
];

/**
 * Converts a video to adaptive HLS (360p/720p/1080p, never upscaled) with normalised
 * audio, in pb_public/media/hls/<id>/, plus a poster frame.
 */
export async function processVideo(record: MediaRecord, workDir: string): Promise<void> {
	const source = join(workDir, 'source');
	await download(record, 'source', source);
	const info = await probe(source);
	if (!info.video) throw new Error('No video stream found in the file');

	const height = info.video.height;
	const renditions = RENDITIONS.filter((r) => r.height <= height);
	if (renditions.length === 0) renditions.push({ ...RENDITIONS[0], height: height - (height % 2) });

	const outDir = join(MEDIA_DIR, 'hls', `${record.id}.tmp`);
	await rm(outDir, { recursive: true, force: true });
	for (const r of renditions) await mkdir(join(outDir, `${r.height}p`), { recursive: true });

	const n = renditions.length;
	const graph = [
		`[0:v]split=${n}${renditions.map((_, i) => `[v${i}]`).join('')}`,
		...renditions.map((r, i) => `[v${i}]scale=-2:${r.height},format=yuv420p[vo${i}]`),
		...(info.hasAudio ? [`[0:a]${LOUDNORM},aresample=48000,asplit=${n}${renditions.map((_, i) => `[ao${i}]`).join('')}`] : [])
	].join(';');

	const args = ['-y', '-i', source, '-filter_complex', graph];
	renditions.forEach((r, i) => {
		args.push('-map', `[vo${i}]`);
		args.push(`-b:v:${i}`, `${r.video}k`, `-maxrate:v:${i}`, `${Math.round(r.video * 1.07)}k`, `-bufsize:v:${i}`, `${r.video * 1.5}k`);
		if (info.hasAudio) args.push('-map', `[ao${i}]`, `-b:a:${i}`, `${r.audio}k`);
	});
	args.push(
		'-c:v', 'libx264', '-preset', 'veryfast', '-profile:v', 'main',
		'-force_key_frames', `expr:gte(t,n_forced*${SEGMENT_SECONDS})`, '-sc_threshold', '0'
	);
	if (info.hasAudio) args.push('-c:a', 'aac', '-ac', '2');
	args.push(
		'-f', 'hls',
		'-hls_time', String(SEGMENT_SECONDS),
		'-hls_playlist_type', 'vod',
		'-hls_flags', 'independent_segments',
		'-hls_segment_filename', join(outDir, '%v', 'seg_%04d.ts'),
		'-master_pl_name', 'master.m3u8',
		'-var_stream_map', renditions.map((r, i) => (info.hasAudio ? `v:${i},a:${i},name:${r.height}p` : `v:${i},name:${r.height}p`)).join(' '),
		join(outDir, '%v', 'index.m3u8')
	);
	await ffmpeg(args);

	const poster = join(workDir, 'poster.jpg');
	const at = Math.min(30, info.duration * 0.1);
	await ffmpeg(['-y', '-ss', at.toFixed(2), '-i', source, '-frames:v', '1', '-vf', "scale='min(1280,iw)':-2", '-q:v', '3', poster]);

	// Swap the finished stream in place of any previous one
	const finalDir = join(MEDIA_DIR, 'hls', record.id);
	await rm(finalDir, { recursive: true, force: true });
	await rename(outDir, finalDir);

	await update(
		record,
		{
			hls_path: `hls/${record.id}/master.m3u8`,
			duration: Math.round(info.duration * 100) / 100,
			status: 'ready',
			processing_error: ''
		},
		{ poster: { path: poster, name: `${record.slug ?? record.id}.jpg`, type: 'image/jpeg' } }
	);
}
