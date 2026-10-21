/**
 * Search normalisation, identical to pb/pb_hooks/search.js (which fills the `search` field):
 * lower-case, no French accents, no Arabic vowel marks or tatweel, unified letter variants.
 */
export function normalizeSearch(text: string): string {
	return text
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
}
