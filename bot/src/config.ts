import { tmpdir } from 'node:os';
import { join } from 'node:path';

function required(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing environment variable ${name}`);
	return value;
}

const list = (value: string | undefined) =>
	(value ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);

export const config = {
	/** Empty until the bot is set up; the service then waits instead of crash-looping. */
	botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
	/** Local Telegram Bot API server (lifts the 20 MB download limit to 2 GB). */
	apiRoot: process.env.TELEGRAM_API_ROOT || undefined,
	/** Group chat ids the bot accepts content from; get one with /id in the group. */
	allowedChats: list(process.env.TELEGRAM_ALLOWED_CHATS),
	pbUrl: process.env.PB_URL ?? 'http://127.0.0.1:8090',
	pbEmail: required('PB_EMAIL'),
	pbPassword: required('PB_PASSWORD'),
	dataDir: process.env.DATA_DIR ?? join(tmpdir(), 'sakina-bot'),
	ytdlp: process.env.YTDLP_PATH ?? 'yt-dlp',
	/** Extra yt-dlp arguments, e.g. "--cookies /data/cookies.txt" when a site asks for a login. */
	ytdlpArgs: list(process.env.YTDLP_ARGS?.replaceAll(' ', ',')),
	maxBytes: 4 * 1024 ** 3
};
