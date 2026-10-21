/// <reference path="../pb_data/types.d.ts" />

// Where a track or video came from (e.g. a YouTube link or a Telegram file) and who sent it,
// so the Telegram bot can skip duplicates and credit the sender.

migrate(
	(app) => {
		for (const name of ['tracks', 'videos']) {
			const collection = app.findCollectionByNameOrId(name);
			collection.fields.add(new TextField({ name: 'origin_url', max: 1000 }));
			collection.fields.add(new TextField({ name: 'submitted_by', max: 200 }));
			collection.addIndex(`idx_${name}_origin_url`, false, 'origin_url', '');
			app.save(collection);
		}
	},
	(app) => {
		for (const name of ['tracks', 'videos']) {
			const collection = app.findCollectionByNameOrId(name);
			collection.removeIndex(`idx_${name}_origin_url`);
			collection.fields.removeByName('origin_url');
			collection.fields.removeByName('submitted_by');
			app.save(collection);
		}
	}
);
