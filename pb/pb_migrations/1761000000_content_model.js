/// <reference path="../pb_data/types.d.ts" />

// Content model: categories, reciters, tracks (audio) and videos.
// Public visitors can read; only superusers (the admin panel, the worker and the
// upload service) can write.

const MB = 1024 * 1024;
const GB = 1024 * MB;

const AUDIO_TYPES = [
	'audio/mpeg',
	'audio/mp4',
	'audio/x-m4a',
	'audio/aac',
	'audio/wav',
	'audio/x-wav',
	'audio/ogg',
	'audio/opus',
	'audio/flac',
	'audio/webm'
];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function bilingual(name, required) {
	return [
		{ name: `${name}_fr`, type: 'text', required, max: 300 },
		{ name: `${name}_ar`, type: 'text', required, max: 300 }
	];
}

function slugField() {
	return { name: 'slug', type: 'text', required: true, max: 120, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' };
}

function timestamps() {
	return [
		{ name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
		{ name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
	];
}

// Processing state set by the media worker
function processingFields() {
	return [
		{ name: 'status', type: 'select', values: ['pending', 'processing', 'ready', 'error'], maxSelect: 1 },
		{ name: 'processing_error', type: 'text', max: 2000 },
		{ name: 'duration', type: 'number', min: 0 }
	];
}

migrate(
	(app) => {
		const categories = new Collection({
			type: 'base',
			name: 'categories',
			listRule: '',
			viewRule: '',
			createRule: null,
			updateRule: null,
			deleteRule: null,
			fields: [
				...bilingual('name', true),
				slugField(),
				...bilingual('description', false),
				{ name: 'icon', type: 'text', max: 60, help: 'Lucide icon name, e.g. sunrise' },
				{ name: 'order', type: 'number', onlyInt: true },
				...timestamps()
			],
			indexes: ['CREATE UNIQUE INDEX idx_categories_slug ON categories (slug)']
		});
		app.save(categories);

		const reciters = new Collection({
			type: 'base',
			name: 'reciters',
			listRule: '',
			viewRule: '',
			createRule: null,
			updateRule: null,
			deleteRule: null,
			fields: [
				...bilingual('name', true),
				slugField(),
				{
					name: 'photo',
					type: 'file',
					maxSelect: 1,
					maxSize: 5 * MB,
					mimeTypes: IMAGE_TYPES,
					thumbs: ['200x200', '600x600']
				},
				{ name: 'bio_fr', type: 'text', max: 5000 },
				{ name: 'bio_ar', type: 'text', max: 5000 },
				...timestamps()
			],
			indexes: ['CREATE UNIQUE INDEX idx_reciters_slug ON reciters (slug)']
		});
		app.save(reciters);

		const tracks = new Collection({
			type: 'base',
			name: 'tracks',
			listRule: 'published = true',
			viewRule: 'published = true',
			createRule: null,
			updateRule: null,
			deleteRule: null,
			fields: [
				...bilingual('title', true),
				slugField(),
				{ name: 'category', type: 'relation', collectionId: categories.id, maxSelect: 1, required: true },
				{ name: 'reciter', type: 'relation', collectionId: reciters.id, maxSelect: 1 },
				...bilingual('description', false),
				// Original upload, kept as the master copy
				{ name: 'audio', type: 'file', maxSelect: 1, maxSize: 1 * GB, mimeTypes: AUDIO_TYPES, required: true },
				// Written by the worker: loudness-normalised streaming copy and waveform peaks
				{ name: 'stream', type: 'file', maxSelect: 1, maxSize: 1 * GB },
				{ name: 'waveform', type: 'json', maxSize: 2 * MB },
				// Synced text: [{ "start": 0.0, "end": 4.2, "ar": "...", "fr": "..." }]
				{ name: 'lines', type: 'json', maxSize: 5 * MB },
				{ name: 'order', type: 'number', onlyInt: true },
				{ name: 'published', type: 'bool' },
				...processingFields(),
				...timestamps()
			],
			indexes: [
				'CREATE UNIQUE INDEX idx_tracks_slug ON tracks (slug)',
				'CREATE INDEX idx_tracks_category ON tracks (category)'
			]
		});
		app.save(tracks);

		const videos = new Collection({
			type: 'base',
			name: 'videos',
			listRule: 'published = true',
			viewRule: 'published = true',
			createRule: null,
			updateRule: null,
			deleteRule: null,
			fields: [
				...bilingual('title', true),
				slugField(),
				{ name: 'category', type: 'relation', collectionId: categories.id, maxSelect: 1, required: true },
				{ name: 'reciter', type: 'relation', collectionId: reciters.id, maxSelect: 1 },
				...bilingual('description', false),
				{ name: 'source', type: 'file', maxSelect: 1, maxSize: 10 * GB, mimeTypes: VIDEO_TYPES, required: true },
				// Written by the worker: folder of the HLS stream and the poster frame
				{ name: 'hls_path', type: 'text', max: 500 },
				{ name: 'poster', type: 'file', maxSelect: 1, maxSize: 5 * MB, mimeTypes: IMAGE_TYPES, thumbs: ['640x360'] },
				{ name: 'order', type: 'number', onlyInt: true },
				{ name: 'published', type: 'bool' },
				...processingFields(),
				...timestamps()
			],
			indexes: [
				'CREATE UNIQUE INDEX idx_videos_slug ON videos (slug)',
				'CREATE INDEX idx_videos_category ON videos (category)'
			]
		});
		app.save(videos);

		// Starting categories; edit or add more in the admin panel
		const starters = [
			['adhkar-matin', 'Adhkar du matin', 'أذكار الصباح', 'sunrise'],
			['adhkar-soir', 'Adhkar du soir', 'أذكار المساء', 'sunset'],
			['invocations', 'Invocations', 'أدعية', 'hand-heart'],
			['recitations', 'Récitations', 'تلاوات', 'book-open'],
			['roqya', 'Roqya', 'الرقية الشرعية', 'shield'],
			['rappels', 'Rappels', 'مواعظ', 'message-circle']
		];
		starters.forEach(([slug, fr, ar, icon], i) => {
			const record = new Record(categories);
			record.set('slug', slug);
			record.set('name_fr', fr);
			record.set('name_ar', ar);
			record.set('icon', icon);
			record.set('order', i + 1);
			app.save(record);
		});
	},
	(app) => {
		for (const name of ['videos', 'tracks', 'reciters', 'categories']) {
			app.delete(app.findCollectionByNameOrId(name));
		}
	}
);
