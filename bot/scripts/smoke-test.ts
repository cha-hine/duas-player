// Local smoke test of the bot's pipeline without Telegram or Claude:
// message parsing, yt-dlp metadata and downloads, PocketBase creation and duplicate check.
//
//   $env:TELEGRAM_BOT_TOKEN="test"; $env:PB_EMAIL="..."; $env:PB_PASSWORD="..."
//   node scripts/smoke-test.ts <url>
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Message } from 'grammy/types';
import { downloadUrl, probeUrl } from '../src/download.ts';
import * as pb from '../src/pb.ts';
import { formatHint, sourcesFrom } from '../src/sources.ts';

const url = process.argv[2];
const check = (label: string, ok: boolean) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);

const text = `Regardez ça ${url} #audio`;
const msg = {
	message_id: 1,
	date: 0,
	chat: { id: 1, type: 'group', title: 'test' },
	text,
	entities: [{ type: 'url', offset: text.indexOf(url), length: url.length }]
} as unknown as Message;
const sources = sourcesFrom(msg);
check(`link found in message (${sources.length})`, sources.length === 1 && sources[0].kind === 'url');
check(`#audio hint (${formatHint(msg)})`, formatHint(msg) === 'audio');

const meta = await probeUrl(url);
check(`metadata: "${meta.title}" by ${meta.uploader}, video=${meta.hasVideo}, origin=${meta.origin}`, !!meta.title);

const dir = await mkdtemp(join(tmpdir(), 'bot-smoke-'));
try {
	const audio = await downloadUrl(url, true, dir);
	check(`audio download ${audio.name} ${audio.type} ${(await stat(audio.path)).size} bytes`, audio.type === 'audio/mp4');
	const video = await downloadUrl(url, false, dir);
	check(`video download ${video.name} ${video.type} ${(await stat(video.path)).size} bytes`, video.type === 'video/mp4');

	const categories = await pb.categories();
	const slug = await pb.uniqueSlug('tracks', 'smoke-test');
	const reciter = await pb.reciterId('Récitant test', 'قارئ', 'recitant-test');
	const again = await pb.reciterId('Récitant test', null, 'recitant-test');
	check('reciter found again instead of duplicated', reciter === again);

	const record = await pb.createMedia(
		'tracks',
		{
			title_fr: 'Smoke test',
			title_ar: 'اختبار',
			slug,
			category: categories[0].id,
			reciter,
			published: false,
			status: 'pending',
			origin_url: meta.origin,
			submitted_by: '@test'
		},
		audio
	);
	check(`track created (${record.id}, status ${record.status})`, record.status === 'pending');
	const dup = await pb.findByOrigin(meta.origin);
	check('same link detected as duplicate', dup?.record.id === record.id);
	const slug2 = await pb.uniqueSlug('tracks', 'smoke-test');
	check(`next slug is unique (${slug2})`, slug2 === 'smoke-test-2');
	await pb.deleteMedia('tracks', record.id);
} finally {
	await rm(dir, { recursive: true, force: true });
}
