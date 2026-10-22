// Automatic sync, shared by the hooks (require): a track linked to a library text gets the
// text's lines (without timings) and is queued for the home agent (agent/), which places each
// line on the recitation. The editor no longer has to ask for it.

module.exports = {
	/** Fills an untexted track from its library text and queues it while nothing is synced. */
	queueSync(app, record, textChanged) {
		const textId = record.getString('text');
		if (!textId) return;

		let lines = JSON.parse(record.getString('lines') || 'null') || [];
		if (lines.length === 0) {
			let text;
			try {
				text = app.findRecordById('texts', textId);
			} catch {
				return; // deleted in the meantime
			}
			lines = (JSON.parse(text.getString('lines') || 'null') || []).map((line) =>
				Object.assign({}, line, { start: 0, end: 0 })
			);
			record.set('lines', lines);
		}

		const synced = lines.some((line) => line.end > 0);
		const hasArabic = lines.some((line) => line.ar);
		if (!synced && hasArabic && (!record.getString('align_status') || textChanged)) {
			record.set('align_status', 'pending');
			record.set('align_error', '');
			record.set('align_result', null);
		}
	}
};
