// Sakina home agent: runs on an always-on PC and does the heavy or blocked work for the
// server. For now: automatic sync (speech recognition + alignment) for tracks queued with
// align_status = "pending", on upload with a library text or when an editor asks. Confident
// timings are applied to the track; the others wait for review in the editor.
import { createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream } from 'node:stream/web';
import { align, isConfident } from './align.ts';
import { config } from './config.ts';
import { toWav, transcribe } from './whisper.ts';

const log = (msg: string) => console.log(`[agent] ${new Date().toISOString()} ${msg}`);

let token = '';
async function api(path: string, init: RequestInit = {}): Promise<Response> {
	const call = () =>
		fetch(`${config.api}${path}`, { ...init, headers: { Authorization: token, ...init.headers } });
	let res = await call();
	if (res.status === 401 || !token) {
		const auth = await fetch(`${config.api}/api/collections/_superusers/auth-with-password`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ identity: config.email, password: config.password })
		});
		if (!auth.ok) throw new Error(`Login failed (${auth.status}): check SAKINA_EMAIL / SAKINA_PASSWORD`);
		token = (await auth.json()).token;
		res = await call();
	}
	if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${await res.text()}`);
	return res;
}

const patch = (id: string, data: object) =>
	api(`/api/collections/tracks/records/${id}`, {
		method: 'PATCH',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(data)
	});

type Line = { start: number; end: number; ar?: string };
type Track = { id: string; title_fr: string; stream: string; audio: string; lines: Line[] | null };

/** Seconds of audio in the 16 kHz mono 16-bit WAV made for whisper. */
const wavSeconds = async (wav: string) => ((await stat(wav)).size - 44) / 32_000;

/**
 * Writes the timings into the track itself, so it plays synced without waiting for an editor,
 * unless someone synced it by hand meanwhile or changed its text.
 */
async function publishTimings(id: string, starts: number[], duration: number): Promise<boolean> {
	const res = await api(`/api/collections/tracks/records/${id}?fields=lines`);
	const lines = ((await res.json()).lines ?? []) as Line[];
	if (lines.length !== starts.length || lines.some((l) => l.end > 0)) return false;
	const synced = lines.map((line, i) => ({ ...line, start: starts[i], end: starts[i + 1] ?? duration }));
	await patch(id, { lines: synced });
	return true;
}

async function suggestSync(track: Track) {
	const lines = (track.lines ?? []).map((l) => l.ar ?? '');
	if (!lines.some(Boolean)) throw new Error("Le texte n'a pas de lignes en arabe.");

	const dir = await mkdtemp(join(config.workDir, 'job-'));
	try {
		const file = track.stream || track.audio;
		const res = await api(`/api/files/tracks/${track.id}/${encodeURIComponent(file)}`);
		const audio = join(dir, 'audio');
		await pipeline(Readable.fromWeb(res.body as ReadableStream), createWriteStream(audio));
		const wav = join(dir, 'audio.wav');
		await toWav(audio, wav);

		const started = Date.now();
		const heard = await transcribe(wav, join(dir, 'words'), lines.slice(0, 2).join(' '));
		const result = align(lines, heard);
		const average = result.confidence.reduce((s, c) => s + c, 0) / Math.max(1, result.confidence.length);
		const applied = isConfident(result) && (await publishTimings(track.id, result.starts, await wavSeconds(wav)));
		log(
			`"${track.title_fr}": ${heard.length} words heard, ${lines.length} lines, ` +
				`${Math.round(average * 100)} % of words found, ${((Date.now() - started) / 1000).toFixed(0)} s` +
				(applied ? ', timings applied' : ', left for review')
		);
		await patch(track.id, {
			align_status: 'ready',
			align_result: { ...result, lines: lines.length, applied },
			align_error: ''
		});
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

async function nextJob(): Promise<Track | undefined> {
	const filter = encodeURIComponent('align_status = "pending"');
	const res = await api(`/api/collections/tracks/records?perPage=1&sort=updated&filter=${filter}`);
	return (await res.json()).items[0];
}

if (!config.email || !config.password || !config.model) {
	console.error('Set SAKINA_EMAIL, SAKINA_PASSWORD and WHISPER_MODEL (see agent/README.md).');
	process.exit(1);
}
await mkdir(config.workDir, { recursive: true });
log(`watching ${config.api} for sync requests`);

for (;;) {
	try {
		const track = await nextJob();
		if (track) {
			log(`sync request: "${track.title_fr}"`);
			await patch(track.id, { align_status: 'processing', align_error: '' });
			try {
				await suggestSync(track);
			} catch (e) {
				const message = e instanceof Error ? e.message : String(e);
				log(`failed: ${message}`);
				await patch(track.id, { align_status: 'error', align_error: message.slice(0, 1900) });
			}
			continue;
		}
	} catch (e) {
		log(`poll failed: ${e instanceof Error ? e.message : e}`);
	}
	await new Promise((resolve) => setTimeout(resolve, config.pollMs));
}
