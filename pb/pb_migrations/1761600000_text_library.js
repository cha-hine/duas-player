/// <reference path="../pb_data/types.d.ts" />

// Text library: the text of a surah, dua or ziyarat, saved once (lines in several languages,
// without timings) and reused for every recitation of it. Admin only for now.

migrate(
	(app) => {
		const categories = app.findCollectionByNameOrId('categories');
		const texts = new Collection({
			type: 'base',
			name: 'texts',
			listRule: null,
			viewRule: null,
			createRule: null,
			updateRule: null,
			deleteRule: null,
			fields: [
				{ name: 'title_fr', type: 'text', required: true, max: 300 },
				{ name: 'title_ar', type: 'text', max: 300 },
				{ name: 'slug', type: 'text', required: true, max: 120, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
				{ name: 'category', type: 'relation', collectionId: categories.id, maxSelect: 1 },
				// [{ "ar": "...", "fr": "...", "en": "..." }, ...] one entry per line, no timings
				{ name: 'lines', type: 'json', maxSize: 5 * 1024 * 1024 },
				{ name: 'source', type: 'text', max: 1000, help: 'Where the text and translations come from' },
				{ name: 'source_url', type: 'text', max: 500 },
				{ name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
				{ name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
			],
			indexes: ['CREATE UNIQUE INDEX idx_texts_slug ON texts (slug)']
		});
		app.save(texts);

		const tracks = app.findCollectionByNameOrId('tracks');
		tracks.fields.add(new RelationField({ name: 'text', collectionId: texts.id, maxSelect: 1 }));
		app.save(tracks);
	},
	(app) => {
		const tracks = app.findCollectionByNameOrId('tracks');
		tracks.fields.removeByName('text');
		app.save(tracks);
		app.delete(app.findCollectionByNameOrId('texts'));
	}
);
