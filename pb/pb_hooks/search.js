// Text normalisation for search, shared by the hooks (require) and kept identical to
// web/src/lib/search.ts, which normalises what visitors type.
// Lower-case, no French accents, no Arabic vowel marks or tatweel, unified letter variants.

module.exports = {
	normalize(text) {
		return (text || '')
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
	},

	/** Everything a visitor might type to find this track or video. */
	searchText(app, record) {
		const parts = [record.getString('title_fr'), record.getString('title_ar')];
		for (const [field, collection] of [
			['reciter', 'reciters'],
			['category', 'categories']
		]) {
			const id = record.getString(field);
			if (!id) continue;
			try {
				const related = app.findRecordById(collection, id);
				parts.push(related.getString('name_fr'), related.getString('name_ar'));
			} catch {
				// deleted in the meantime
			}
		}
		return module.exports.normalize(parts.join(' '));
	}
};
