/// <reference path="../pb_data/types.d.ts" />

// Queues uploaded media for the worker (worker/), and cleans up after deleted videos.
// Each handler runs in its own context, so values are computed inside them.

onRecordCreate(
	(e) => {
		if (!e.record.getString('status')) e.record.set('status', 'pending');
		e.next();
	},
	'tracks',
	'videos'
);

// A replaced audio/video file needs processing again
onRecordUpdate(
	(e) => {
		const field = e.record.collection().name === 'tracks' ? 'audio' : 'source';
		if (e.record.getString(field) !== e.record.original().getString(field)) {
			e.record.set('status', 'pending');
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
