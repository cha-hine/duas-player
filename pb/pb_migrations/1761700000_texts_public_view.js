/// <reference path="../pb_data/types.d.ts" />

// A track's page shows where its text comes from (Tanzil asks to be credited with a link),
// through the track -> text relation: anyone may view one text, only admins list or edit.

migrate(
	(app) => {
		const texts = app.findCollectionByNameOrId('texts');
		texts.viewRule = '';
		app.save(texts);
	},
	(app) => {
		const texts = app.findCollectionByNameOrId('texts');
		texts.viewRule = null;
		app.save(texts);
	}
);
