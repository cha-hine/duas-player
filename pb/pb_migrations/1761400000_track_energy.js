/// <reference path="../pb_data/types.d.ts" />

// Loudness envelope of each track (5 values per second, 0..1), computed by the worker and
// used by the player to animate the background with the voice, without Web Audio
// (which stops playback on iPhone when the screen locks).

migrate(
	(app) => {
		const tracks = app.findCollectionByNameOrId('tracks');
		tracks.fields.add(new JSONField({ name: 'energy', maxSize: 2 * 1024 * 1024 }));
		app.save(tracks);

		// Existing tracks go back through the worker to get their envelope
		for (const record of app.findRecordsByFilter('tracks', 'status = "ready"', '', 0, 0)) {
			record.set('status', 'pending');
			app.saveNoValidate(record);
		}
	},
	(app) => {
		const tracks = app.findCollectionByNameOrId('tracks');
		tracks.fields.removeByName('energy');
		app.save(tracks);
	}
);
