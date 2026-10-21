import { spawn } from 'node:child_process';
import { createWriteStream, existsSync } from 'node:fs';
import { copyFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream } from 'node:stream/web';
import type { Api } from 'grammy';
import { config } from './config.ts';
import type { Source } from './sources.ts';

/** An error whose message can be shown as-is in the group. */
export class UserError extends Error {}

/** The link leads to no audio or video (an article, a profile…): ignored silently. */
export class NotMediaError extends Error {}

export type Metadata = {
	title: string;
	description: string;
	uploader: string;
	/** Canonical address, used to detect duplicates. */
	origin: string;
	hasVideo: boolean;
	durationSeconds?: number;
};

export type DownloadedFile = { path: string; name: string; type: string };

const MIME: Record<string, string> = {
	'.m4a': 'audio/mp4',
	'.mp3': 'audio/mpeg',
	'.ogg': 'audio/ogg',
	'.oga': 'audio/ogg',
	'.opus': 'audio/opus',
	'.wav': 'audio/wav',
	'.flac': 'audio/flac',
	'.mp4': 'video/mp4',
	'.mov': 'video/quicktime',
	'.webm': 'video/webm',
	'.mkv': 'video/x-matroska'
};

let cookieArgs: string[] = [];

/**
 * Copies the mounted cookies file to a writable place (yt-dlp saves refreshed cookies
 * back into it) and uses it for every download. Returns whether cookies are in use.
 */
export async function prepareCookies(): Promise<boolean> {
	if (!config.cookiesFile || !existsSync(config.cookiesFile)) return false;
	const copy = join(config.dataDir, 'cookies.txt');
	await copyFile(config.cookiesFile, copy);
	cookieArgs = ['--cookies', copy];
	return true;
}

function ytdlp(args: string[]): Promise<string> {
	return new Promise((resolve, reject) => {
		const fullArgs = ['--no-playlist', '--js-runtimes', 'node', ...cookieArgs, ...config.ytdlpArgs, ...args];
		const child = spawn(config.ytdlp, fullArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
		let out = '';
		let err = '';
		child.stdout.on('data', (d) => (out += d));
		child.stderr.on('data', (d) => (err = (err + d).slice(-4000)));
		child.on('error', reject);
		child.on('close', (code) => {
			if (code === 0) return resolve(out);
			if (/Unsupported URL|No video formats found|no video in this/i.test(err)) {
				return reject(new NotMediaError(err.trim().split('\n').pop()));
			}
			if (/confirm you.re not a bot|Sign in to confirm/i.test(err)) {
				return reject(
					new UserError(
						cookieArgs.length
							? 'YouTube refuse encore : les cookies ont sans doute expiré, il faut les renouveler'
							: 'YouTube demande une connexion : il faut ajouter les cookies d’un compte YouTube (voir README)'
					)
				);
			}
			const reason = err.split('\n').filter((l) => l.startsWith('ERROR')).pop() ?? err.trim().split('\n').pop();
			reject(new UserError(`téléchargement impossible (${reason?.replace(/^ERROR:\s*/, '') ?? `code ${code}`})`));
		});
	});
}

/** Title, description and format of a link (YouTube, Instagram, TikTok, Facebook, direct file…). */
export async function probeUrl(url: string): Promise<Metadata> {
	const info = JSON.parse(await ytdlp(['-J', url]));
	const formats: { vcodec?: string }[] = info.formats ?? [];
	const hasVideo =
		(info.vcodec && info.vcodec !== 'none') || formats.some((f) => f.vcodec && f.vcodec !== 'none');
	return {
		title: info.title ?? '',
		description: info.description ?? '',
		uploader: info.uploader ?? info.channel ?? '',
		origin: info.webpage_url ?? url,
		hasVideo: Boolean(hasVideo),
		durationSeconds: info.duration
	};
}

export function telegramMetadata(source: Extract<Source, { kind: 'telegram' }>, caption: string): Metadata {
	return {
		title: source.title ?? source.fileName ?? '',
		description: caption,
		uploader: source.performer ?? '',
		origin: `telegram:${source.fileUniqueId}`,
		hasVideo: source.media === 'video'
	};
}

export async function downloadUrl(url: string, asAudio: boolean, dir: string): Promise<DownloadedFile> {
	const format = asAudio
		? ['-f', 'ba/b', '-x', '--audio-format', 'm4a']
		: ['-f', 'bv*[height<=1080]+ba/b[height<=1080]/b', '--merge-output-format', 'mp4'];
	const out = await ytdlp([
		...format,
		'--max-filesize',
		String(config.maxBytes),
		'-o',
		join(dir, 'media.%(ext)s'),
		'--print',
		'after_move:filepath',
		url
	]);
	const path = out.trim().split('\n').pop()!;
	return described(path);
}

export async function downloadTelegram(
	api: Api,
	source: Extract<Source, { kind: 'telegram' }>,
	dir: string
): Promise<DownloadedFile> {
	let file;
	try {
		file = await api.getFile(source.fileId);
	} catch (e) {
		if (String(e).includes('file is too big')) {
			throw new UserError('fichier trop lourd pour Telegram (plus de 20 Mo sans serveur Bot API local)');
		}
		throw e;
	}
	const name = source.fileName ?? `media${extname(file.file_path ?? '') || (source.media === 'audio' ? '.ogg' : '.mp4')}`;
	// A local Bot API server returns an absolute path on the shared volume
	if (config.apiRoot && file.file_path?.startsWith('/')) {
		return { path: file.file_path, name, type: source.mimeType ?? MIME[extname(name).toLowerCase()] ?? 'application/octet-stream' };
	}
	const res = await fetch(`https://api.telegram.org/file/bot${config.botToken}/${file.file_path}`);
	if (!res.ok || !res.body) throw new Error(`Telegram download failed (${res.status})`);
	const path = join(dir, `telegram${extname(name)}`);
	await pipeline(Readable.fromWeb(res.body as ReadableStream), createWriteStream(path));
	return { path, name, type: source.mimeType ?? MIME[extname(name).toLowerCase()] ?? 'application/octet-stream' };
}

async function described(path: string): Promise<DownloadedFile> {
	const { size } = await stat(path);
	if (size > config.maxBytes) throw new UserError('fichier trop lourd (plus de 4 Go)');
	const ext = extname(path).toLowerCase();
	return { path, name: `media${ext}`, type: MIME[ext] ?? 'application/octet-stream' };
}
