/// <reference path="../pb_data/types.d.ts" />

// Categories whose audio gets synced multilingual text (the editor in /admin/textes lists
// only their tracks). Tick more in the admin panel later, e.g. Munajat.

migrate(
	(app) => {
		const categories = app.findCollectionByNameOrId('categories');
		categories.fields.add(new BoolField({ name: 'synced_text', help: 'Audio of this category gets synced text' }));
		app.save(categories);

		for (const slug of ['coran', 'douas', 'sahifa', 'ziyarat']) {
			try {
				const record = app.findFirstRecordByData('categories', 'slug', slug);
				record.set('synced_text', true);
				app.save(record);
			} catch {
				// category renamed or removed
			}
		}
	},
	(app) => {
		const categories = app.findCollectionByNameOrId('categories');
		categories.fields.removeByName('synced_text');
		app.save(categories);
	}
);
