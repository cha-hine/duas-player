// Telegram bot: members post links or audio/video files in the group, the bot downloads
// them, lets Claude pick the category and titles, and publishes them on Sakina.
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Bot, InlineKeyboard, type Api } from 'grammy';
import type { Message } from 'grammy/types';
import { classify } from './classify.ts';
import { config } from './config.ts';
import { UserError, downloadTelegram, downloadUrl, probeUrl, telegramMetadata } from './download.ts';
import * as pb from './pb.ts';
import { formatHint, sourcesFrom, type Source } from './sources.ts';

const WATCH_INTERVAL_MS = 15_000;
const WATCH_MAX_MS = 3 * 60 * 60 * 1000;

const log = (msg: string) => console.log(`[bot] ${new Date().toISOString()} ${msg}`);

const slugify = (text: string) =>
	text
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 100);

// One import at a time: downloads and conversions are heavy
let queue = Promise.resolve();
const enqueue = (job: () => Promise<void>) => {
	queue = queue.then(job, job);
};

type Job = { api: Api; msg: Message; source: Source };

async function importSource({ api, msg, source }: Job) {
	const chatId = msg.chat.id;
	const status = await api.sendMessage(chatId, '⏳ Reçu, je regarde…', {
		reply_parameters: { message_id: msg.message_id }
	});
	const say = (text: string, keyboard?: InlineKeyboard) =>
		api.editMessageText(chatId, status.message_id, text, { reply_markup: keyboard }).catch(() => {});

	const workDir = await mkdtemp(join(config.dataDir, 'job-'));
	try {
		const caption = msg.text ?? msg.caption ?? '';
		const meta = source.kind === 'url' ? await probeUrl(source.url) : telegramMetadata(source, caption);

		const existing = await pb.findByOrigin(meta.origin);
		if (existing) {
			await say(`ℹ️ Déjà sur Sakina : ${existing.record.title_fr}`);
			return;
		}

		const hint = formatHint(msg);
		const asAudio = source.kind === 'telegram' ? source.media === 'audio' : hint ? hint === 'audio' : !meta.hasVideo;
		const collection: pb.Collection = asAudio ? 'tracks' : 'videos';

		const categories = await pb.categories();
		const result = await classify(categories, { ...meta, hasVideo: !asAudio }, caption);
		if (!result) {
			await say("⚠️ Je n'ai pas pu classer ce contenu. Ajoutez-le depuis la page admin.");
			return;
		}
		if (!result.relevant) {
			await say(`❌ Non ajouté : ${result.reason}`);
			return;
		}
		const category = categories.find((c) => c.slug === result.category);
		if (!category) throw new Error(`Unknown category ${result.category}`);

		await say(`⬇️ Téléchargement : ${result.title_fr}`);
		const file =
			source.kind === 'url' ? await downloadUrl(source.url, asAudio, workDir) : await downloadTelegram(api, source, workDir);

		const reciterName = result.reciter_fr || result.reciter_ar;
		const reciter = reciterName
			? await pb.reciterId(result.reciter_fr, result.reciter_ar, slugify(reciterName) || 'recitant')
			: '';
		const slug = await pb.uniqueSlug(collection, slugify(result.title_fr) || 'media');
		const sender = msg.from?.username ? `@${msg.from.username}` : (msg.from?.first_name ?? '');

		const record = await pb.createMedia(
			collection,
			{
				title_fr: result.title_fr,
				title_ar: result.title_ar,
				slug,
				category: category.id,
				reciter,
				published: true,
				status: 'pending',
				origin_url: meta.origin,
				submitted_by: sender
			},
			file
		);
		log(`added ${collection}/${record.id} "${result.title_fr}" in ${category.slug} from ${sender}`);

		const undo = new InlineKeyboard().text('Annuler', `undo:${collection === 'tracks' ? 't' : 'v'}:${record.id}:${msg.from?.id ?? 0}`);
		const added = `✅ Ajouté dans ${category.name_fr} (${category.name_ar})\n${result.title_fr}\n${result.title_ar}`;
		await say(`${added}\n⚙️ Préparation en cours…`, undo);
		watch(collection, record.id, added, say, undo);

		// Files from the local Bot API server are no longer needed once in PocketBase
		if (source.kind === 'telegram' && file.path.startsWith('/var/lib/telegram-bot-api')) {
			await rm(file.path, { force: true }).catch(() => {});
		}
	} catch (e) {
		const reason = e instanceof UserError ? e.message : 'erreur inattendue';
		log(`failed: ${e instanceof Error ? e.stack : e}`);
		await say(`⚠️ Échec : ${reason}`);
	} finally {
		await rm(workDir, { recursive: true, force: true });
	}
}

/** Updates the group message once the worker has finished (or failed). */
function watch(
	collection: pb.Collection,
	id: string,
	added: string,
	say: (text: string, keyboard?: InlineKeyboard) => Promise<unknown>,
	undo: InlineKeyboard
) {
	const started = Date.now();
	const timer = setInterval(async () => {
		try {
			const record = await pb.getMedia(collection, id);
			if (record.status === 'ready') {
				clearInterval(timer);
				await say(`${added}\n🟢 En ligne sur Sakina`, undo);
			} else if (record.status === 'error') {
				clearInterval(timer);
				await say(`${added}\n⚠️ Le traitement a échoué : ${record.processing_error?.slice(0, 200) ?? ''}`, undo);
			}
		} catch {
			clearInterval(timer); // deleted in the meantime
		}
		if (Date.now() - started > WATCH_MAX_MS) clearInterval(timer);
	}, WATCH_INTERVAL_MS);
}

/** Telegram requires logging out of the cloud API once before using a local Bot API server. */
async function moveToLocalServer() {
	if (!config.apiRoot) return;
	const marker = join(config.dataDir, '.cloud-logged-out');
	if (existsSync(marker)) return;
	const res = await fetch(`https://api.telegram.org/bot${config.botToken}/logOut`, { method: 'POST' });
	log(`cloud logOut before using local Bot API server: ${res.status}`);
	await writeFile(marker, new Date().toISOString());
}

if (!config.botToken) {
	log('TELEGRAM_BOT_TOKEN is not set: the bot is idle until it is configured');
	setInterval(() => {}, 1 << 30);
	await new Promise(() => {});
}

await mkdir(config.dataDir, { recursive: true });
await moveToLocalServer();

const bot = new Bot(config.botToken, { client: { apiRoot: config.apiRoot } });

// Logs every incoming message's chat, to help with setup
bot.use(async (ctx, next) => {
	if (ctx.message) log(`message in chat ${ctx.chat?.id} (${ctx.chat?.type})`);
	await next();
});

bot.command('id', (ctx) => ctx.reply(`ID de cette discussion : ${ctx.chat.id}`));

bot.on('message', async (ctx) => {
	if (!config.allowedChats.includes(String(ctx.chat.id))) return;
	for (const source of sourcesFrom(ctx.message)) {
		enqueue(() => importSource({ api: ctx.api, msg: ctx.message, source }));
	}
});

bot.callbackQuery(/^undo:([tv]):(\w+):(\d+)$/, async (ctx) => {
	const [, kind, id, senderId] = ctx.match;
	const userId = ctx.from.id;
	const member = await ctx.getChatMember(userId).catch(() => null);
	const isAdmin = member?.status === 'creator' || member?.status === 'administrator';
	if (String(userId) !== senderId && !isAdmin) {
		await ctx.answerCallbackQuery({ text: "Seul l'auteur ou un admin du groupe peut annuler.", show_alert: true });
		return;
	}
	await pb.deleteMedia(kind === 't' ? 'tracks' : 'videos', id).catch(() => {});
	const who = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
	await ctx.editMessageText(`🗑️ Retiré du site par ${who}`);
	await ctx.answerCallbackQuery({ text: 'Retiré du site' });
	log(`undo ${kind}/${id} by ${who}`);
});

bot.catch((err) => log(`update failed: ${err.error instanceof Error ? err.error.message : err.error}`));

// Startup diagnostics, so a missing setting shows up clearly in the Coolify logs
try {
	const me = await bot.api.getMe();
	log(`connected to Telegram as @${me.username} via ${config.apiRoot ?? 'api.telegram.org'}`);
	if (me.can_read_all_group_messages === false) {
		log('privacy mode is ON: in @BotFather use /setprivacy -> Disable, or links in the group will not be seen');
	}
} catch (e) {
	log(`cannot reach Telegram via ${config.apiRoot ?? 'api.telegram.org'}: ${e instanceof Error ? e.message : e}`);
	log('check TELEGRAM_BOT_TOKEN, and TELEGRAM_API_ID / TELEGRAM_API_HASH for the telegram-bot-api service');
	process.exit(1);
}
try {
	await pb.checkLogin();
	log('connected to PocketBase');
} catch (e) {
	log(`PocketBase not ready, imports will fail until fixed: ${e instanceof Error ? e.message : e}`);
}
if (config.allowedChats.length === 0) {
	log('TELEGRAM_ALLOWED_CHATS is empty: send /id in your group and set it, until then all content is ignored');
} else {
	log(`accepting content from chats ${config.allowedChats.join(', ')}`);
}

await bot.start({
	allowed_updates: ['message', 'callback_query'],
	onStart: () => log('listening for messages')
});
