/// <reference path="../pb_data/types.d.ts" />

// Quran translations listeners can choose from (e.g. the 41 French ones of "41 traductions du
// Coran"), kept apart from the text library: one record per translator and surah, so a page
// only loads the one chosen. Anyone may read them, only admins change them.

migrate(
	(app) => {
		const translations = new Collection({
			type: 'base',
			name: 'translations',
			listRule: '',
			viewRule: '',
			createRule: null,
			updateRule: null,
			deleteRule: null,
			fields: [
				// Text language of the translation, e.g. "fr"
				{ name: 'language', type: 'text', required: true, max: 12 },
				// e.g. "hamidullah-revise", unique within the language
				{ name: 'translator', type: 'text', required: true, max: 80, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
				{ name: 'translator_name', type: 'text', required: true, max: 120 },
				{ name: 'surah', type: 'number', required: true, min: 1, max: 114, onlyInt: true },
				// { "basmala": "...", "verses": ["verse 1", "verse 2", ...] }
				{ name: 'text', type: 'json', maxSize: 2 * 1024 * 1024 },
				{ name: 'source', type: 'text', max: 500 }
			],
			indexes: [
				'CREATE UNIQUE INDEX idx_translations_key ON translations (language, translator, surah)',
				'CREATE INDEX idx_translations_lang ON translations (language, surah)'
			]
		});
		app.save(translations);
	},
	(app) => {
		app.delete(app.findCollectionByNameOrId('translations'));
	}
);
