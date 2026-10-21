/// <reference path="../pb_data/types.d.ts" />

// The Quran pages list the surahs of the text library: the library becomes readable by
// everyone (still edited by admins only).

migrate(
	(app) => {
		const texts = app.findCollectionByNameOrId('texts');
		texts.listRule = '';
		app.save(texts);
	},
	(app) => {
		const texts = app.findCollectionByNameOrId('texts');
		texts.listRule = null;
		app.save(texts);
	}
);
