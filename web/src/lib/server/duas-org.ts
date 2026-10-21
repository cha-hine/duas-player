// Reads a dua or ziyarat from duas.org (its pages load their text from /data_v2/<page>.json)
// and turns it into library lines: Arabic, transliteration and English.
import type { TextLine } from '#lib/text-languages.ts';

export type ImportedSection = { title: string; lines: TextLine[] };
export type ImportedText = {
	id: string;
	title: string;
	sourceUrl: string;
	sections: ImportedSection[];
};

type Segment = { arabic?: string; transliteration?: string; translation?: string };
type Page = {
	id: string;
	title?: string;
	duas?: { type?: string; title?: string; segments?: Segment[] }[];
};

export class ImportError extends Error {}

const HOSTS = new Set(['duas.org', 'www.duas.org']);
const MAX_BYTES = 5 * 1024 * 1024;

/** "https://www.duas.org/dua-kumayl.html" -> "dua-kumayl" */
export function pageId(address: string): string {
	let url: URL;
	try {
		url = new URL(address.trim());
	} catch {
		throw new ImportError('Adresse invalide.');
	}
	if (!HOSTS.has(url.hostname))
		throw new ImportError('Seules les pages de duas.org peuvent être importées.');
	const id =
		url.pathname
			.split('/')
			.pop()
			?.replace(/\.html?$/, '') ?? '';
	if (!/^[\w-]+$/.test(id)) throw new ImportError('Cette adresse ne désigne pas une page de doua.');
	return id;
}

const clean = (text: string | undefined) =>
	(text ?? '')
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

export async function importFromDuasOrg(address: string): Promise<ImportedText> {
	const id = pageId(address);
	const res = await fetch(`https://www.duas.org/data_v2/${id}.json`, {
		signal: AbortSignal.timeout(20_000)
	});
	if (res.status === 404) {
		throw new ImportError("Cette page n'a pas de texte importable (ancienne page de duas.org ?).");
	}
	if (!res.ok) throw new ImportError(`duas.org a répondu ${res.status}.`);
	const raw = await res.text();
	if (raw.length > MAX_BYTES) throw new ImportError('Page trop volumineuse.');
	const page = JSON.parse(raw) as Page;

	const sections = (page.duas ?? [])
		.filter((d) => d.segments?.length)
		.map((d) => ({
			title: clean(d.title) || clean(page.title),
			lines: d
				.segments!.map((s) => {
					const line: TextLine = {};
					const ar = clean(s.arabic);
					const translit = clean(s.transliteration);
					const en = clean(s.translation);
					if (ar) line.ar = ar;
					if (translit) line.translit = translit;
					if (en) line.en = en;
					return line;
				})
				.filter((line) => line.ar || line.en)
		}))
		.filter((s) => s.lines.length);

	if (sections.length === 0) throw new ImportError('Aucun texte trouvé sur cette page.');
	return {
		id,
		title: clean(page.title) || id,
		sourceUrl: `https://www.duas.org/${id}.html`,
		sections
	};
}
