/// <reference path="../pb_data/types.d.ts" />

// Spoken language of each track/video (many latmiyat and majalis are in Persian or Urdu),
// and a normalised search text kept up to date by pb_hooks/media.pb.js.

migrate(
	(app) => {
		const LANGUAGES = ['ar', 'fa', 'ur', 'en', 'fr', 'tr', 'az', 'other'];
		for (const name of ['tracks', 'videos']) {
			const collection = app.findCollectionByNameOrId(name);
			collection.fields.add(new SelectField({ name: 'language', values: LANGUAGES, maxSelect: 1 }));
			collection.fields.add(new TextField({ name: 'search', max: 5000 }));
			app.save(collection);
		}

		// Fill the search text of existing records (same rules as pb_hooks/search.js)
		const normalize = (text) =>
			(text || '')
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
				.replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, '')
				.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
				.replace(/[\u0649\u06cc]/g, '\u064a')
				.replace(/\u06a9/g, '\u0643')
				.replace(/\u0629/g, '\u0647')
				.toLowerCase()
				.replace(/[\s\-_'\u2019\u00ab\u00bb"\u201c\u201d.,;:!?()[\]\u2013\u2014/]+/g, ' ')
				.trim();
		const names = (collection, id) => {
			if (!id) return [];
			try {
				const r = app.findRecordById(collection, id);
				return [r.getString('name_fr'), r.getString('name_ar')];
			} catch {
				return [];
			}
		};
		for (const name of ['tracks', 'videos']) {
			for (const record of app.findAllRecords(name)) {
				const parts = [
					record.getString('title_fr'),
					record.getString('title_ar'),
					...names('reciters', record.getString('reciter')),
					...names('categories', record.getString('category'))
				];
				record.set('search', normalize(parts.join(' ')));
				app.saveNoValidate(record);
			}
		}
	},
	(app) => {
		for (const name of ['tracks', 'videos']) {
			const collection = app.findCollectionByNameOrId(name);
			collection.fields.removeByName('language');
			collection.fields.removeByName('search');
			app.save(collection);
		}
	}
);
