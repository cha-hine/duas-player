import type { Message, MessageEntity } from 'grammy/types';

/** Something in a Telegram message the bot can import. */
export type Source =
	| { kind: 'url'; url: string }
	| {
			kind: 'telegram';
			fileId: string;
			fileUniqueId: string;
			media: 'audio' | 'video';
			fileName?: string;
			mimeType?: string;
			fileSize?: number;
			title?: string;
			performer?: string;
	  };

function urls(text: string | undefined, entities: MessageEntity[] | undefined): string[] {
	if (!text || !entities) return [];
	return entities.flatMap((e) => {
		if (e.type === 'url') return [text.slice(e.offset, e.offset + e.length)];
		if (e.type === 'text_link') return [e.url];
		return [];
	});
}

// t.me/channel, t.me/+invite, t.me/joinchat/…: links to chats, not to media
const TELEGRAM_CHAT_LINK = /^https?:\/\/(t|telegram)\.me\/(\+|joinchat\/)?[\w-]+\/?(\?.*)?$/i;

/**
 * Audio/video attachment of a message, or else the links in it. When a file is attached,
 * links in its caption are credits (channel signatures) and are ignored.
 */
export function sourcesFrom(msg: Message): Source[] {
	const attached = attachment(msg);
	if (attached) return [attached];

	const links = [...urls(msg.text, msg.entities), ...urls(msg.caption, msg.caption_entities)]
		.map((url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`))
		.filter((url) => !TELEGRAM_CHAT_LINK.test(url));
	return [...new Set(links)].map((url) => ({ kind: 'url', url }));
}

function attachment(msg: Message): Source | null {
	const found: Source[] = [];
	const file = (f: { file_id: string; file_unique_id: string; file_size?: number }, media: 'audio' | 'video') => ({
		kind: 'telegram' as const,
		fileId: f.file_id,
		fileUniqueId: f.file_unique_id,
		fileSize: f.file_size,
		media
	});
	if (msg.audio) {
		found.push({
			...file(msg.audio, 'audio'),
			fileName: msg.audio.file_name,
			mimeType: msg.audio.mime_type,
			title: msg.audio.title,
			performer: msg.audio.performer
		});
	} else if (msg.voice) {
		found.push({ ...file(msg.voice, 'audio'), mimeType: msg.voice.mime_type });
	} else if (msg.video) {
		found.push({ ...file(msg.video, 'video'), fileName: msg.video.file_name, mimeType: msg.video.mime_type });
	} else if (msg.video_note) {
		found.push({ ...file(msg.video_note, 'video'), mimeType: 'video/mp4' });
	} else if (msg.document?.mime_type && /^(audio|video)\//.test(msg.document.mime_type)) {
		const media = msg.document.mime_type.startsWith('audio/') ? 'audio' : 'video';
		found.push({ ...file(msg.document, media), fileName: msg.document.file_name, mimeType: msg.document.mime_type });
	}
	return found[0] ?? null;
}

/** "#audio" or "#video" in the message overrides the automatic choice for links. */
export function formatHint(msg: Message): 'audio' | 'video' | null {
	const text = `${msg.text ?? ''} ${msg.caption ?? ''}`.toLowerCase();
	if (/#audio\b/.test(text)) return 'audio';
	if (/#vid[eé]o\b/.test(text)) return 'video';
	return null;
}
