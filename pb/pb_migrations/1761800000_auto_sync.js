/// <reference path="../pb_data/types.d.ts" />

// Automatic sync suggestions: the editor asks (align_status = "pending"), the home agent
// (agent/) transcribes the audio with Whisper, aligns the track's lines and writes the
// suggested start of each line; the editor then applies and reviews them.

migrate(
	(app) => {
		const tracks = app.findCollectionByNameOrId('tracks');
		tracks.fields.add(
			new SelectField({ name: 'align_status', values: ['pending', 'processing', 'ready', 'error'], maxSelect: 1 })
		);
		// { "starts": [0.4, 6.1, ...], "confidence": [0.9, 0.7, ...], "lines": 7 }
		tracks.fields.add(new JSONField({ name: 'align_result', maxSize: 1024 * 1024 }));
		tracks.fields.add(new TextField({ name: 'align_error', max: 2000 }));
		app.save(tracks);
	},
	(app) => {
		const tracks = app.findCollectionByNameOrId('tracks');
		for (const name of ['align_status', 'align_result', 'align_error']) tracks.fields.removeByName(name);
		app.save(tracks);
	}
);
