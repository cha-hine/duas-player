/// <reference path="../pb_data/types.d.ts" />

// Queues uploaded media for the worker (worker/), queues tracks linked to a library text for
// automatic sync (sync.js), and cleans up after deleted videos.
// Each handler runs in its own context, so values are computed inside them.

onRecordCreate(
	(e) => {
		if (!e.record.getString('status')) e.record.set('status', 'pending');
		e.record.set('search', require(`${__hooks}/search.js`).searchText(e.app, e.record));
		if (e.record.collection().name === 'tracks') {
			require(`${__hooks}/sync.js`).queueSync(e.app, e.record, false);
		}
		e.next();
	},
	'tracks',
	'videos'
);

onRecordUpdate(
	(e) => {
		// A replaced audio/video file needs processing again
		const field = e.record.collection().name === 'tracks' ? 'audio' : 'source';
		if (e.record.getString(field) !== e.record.original().getString(field)) {
			e.record.set('status', 'pending');
		}
		e.record.set('search', require(`${__hooks}/search.js`).searchText(e.app, e.record));
		if (field === 'audio') {
			const textChanged = e.record.getString('text') !== e.record.original().getString('text');
			require(`${__hooks}/sync.js`).queueSync(e.app, e.record, textChanged);
		}
		e.next();
	},
	'tracks',
	'videos'
);

// HLS streams live in pb_public/media/hls/<record id>, outside PocketBase's file storage
onRecordAfterDeleteSuccess((e) => {
	const dir = `${__hooks}/../pb_public/media/hls/${e.record.id}`;
	try {
		$os.removeAll(dir);
	} catch (err) {
		e.app.logger().error('Could not remove HLS folder', 'dir', dir, 'error', String(err));
	}
	e.next();
}, 'videos');
