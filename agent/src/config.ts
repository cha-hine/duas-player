import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Settings of the home agent, from environment variables (see agent/README.md).
export const config = {
	api: process.env.SAKINA_API ?? 'https://sakina-api.toophan.net',
	email: process.env.SAKINA_EMAIL ?? '',
	password: process.env.SAKINA_PASSWORD ?? '',
	whisper: process.env.WHISPER_CLI ?? 'whisper-cli',
	model: process.env.WHISPER_MODEL ?? '',
	ffmpeg: process.env.FFMPEG_PATH ?? 'ffmpeg',
	workDir: process.env.AGENT_WORK_DIR ?? join(tmpdir(), 'sakina-agent'),
	pollMs: Number(process.env.POLL_MS ?? 20_000)
};
