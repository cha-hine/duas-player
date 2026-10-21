// Text library helpers for the admin pages (PocketBase "texts" collection).
import type { RecordModel } from 'pocketbase';
import type { TextLine } from '#lib/text-languages.ts';
import { pb, slugify } from './pb.ts';

export type LibraryText = RecordModel & {
	title_fr: string;
	title_ar: string;
	slug: string;
	category: string;
	lines: TextLine[] | null;
	source: string;
	source_url: string;
};

export const texts = () => pb.collection<LibraryText>('texts');

/** Categories whose audio gets synced text (the library's categories too). */
export const syncedCategories = () =>
	pb.collection('categories').getFullList({ filter: 'synced_text = true', sort: 'order' });

/** A slug free in the library, from a title. */
export async function freeSlug(title: string): Promise<string> {
	const base = slugify(title) || 'texte';
	for (let n = 1; ; n++) {
		const slug = n === 1 ? base : `${base}-${n}`;
		const { totalItems } = await texts().getList(1, 1, {
			filter: pb.filter('slug = {:slug}', { slug })
		});
		if (totalItems === 0) return slug;
	}
}

export async function createText(data: {
	title_fr: string;
	title_ar?: string;
	category?: string;
	lines: TextLine[];
	source?: string;
	source_url?: string;
}): Promise<LibraryText> {
	return texts().create({ ...data, slug: await freeSlug(data.title_fr) });
}
