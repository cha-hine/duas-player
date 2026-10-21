// Media worker: picks up tracks and videos with status "pending" and processes them
// with ffmpeg, one at a time. PocketBase hooks (pb/pb_hooks/media.pb.js) set "pending"
// when a file is uploaded or replaced; setting it by hand reprocesses a record.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { processTrack } from './audio.ts';
import { listByStatus, update, waitForPocketBase, type MediaRecord } from './pb.ts';
import { processVideo } from './video.ts';

const POLL_MS = Number(process.env.POLL_MS ?? 10_000);
const ERROR_MAX = 2000;
const COLLECTIONS = ['tracks', 'videos'] as const;

const log = (msg: string) => console.log(`[worker] ${new Date().toISOString()} ${msg}`);

async function processOne(record: MediaRecord) {
	const label = `${record.collectionName}/${record.id} (${record.slug ?? ''})`;
	const workDir = await mkdtemp(join(tmpdir(), 'sakina-'));
	const started = Date.now();
	try {
		await update(record, { status: 'processing', processing_error: '' });
		log(`processing ${label}`);
		if (record.collectionName === 'tracks') await processTrack(record, workDir);
		else await processVideo(record, workDir);
		log(`ready ${label} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		log(`error ${label}: ${message.slice(-500)}`);
		await update(record, { status: 'error', processing_error: message.slice(-ERROR_MAX) }).catch(() => {});
	} finally {
		await rm(workDir, { recursive: true, force: true });
	}
}

/** Jobs interrupted by a restart are still marked "processing": queue them again. */
async function requeueInterrupted() {
	for (const collection of COLLECTIONS) {
		for (const record of await listByStatus(collection, 'processing')) {
			log(`requeue interrupted ${collection}/${record.id}`);
			await update(record, { status: 'pending' });
		}
	}
}

async function nextJob(): Promise<MediaRecord | undefined> {
	for (const collection of COLLECTIONS) {
		const [record] = await listByStatus(collection, 'pending');
		if (record) return record;
	}
}

await waitForPocketBase();
await requeueInterrupted().catch((e) => log(`startup check failed: ${e instanceof Error ? e.message : e}`));
log('ready, watching for new media');

for (;;) {
	try {
		const job = await nextJob();
		if (job) {
			await processOne(job);
			continue;
		}
	} catch (e) {
		log(`poll failed: ${e instanceof Error ? e.message : e}`);
	}
	await new Promise((resolve) => setTimeout(resolve, POLL_MS));
}
