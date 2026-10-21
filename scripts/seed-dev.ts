// Fills a LOCAL PocketBase with demo content (a reciter and 3 short tracks with synced text).
// The audio is a generated soft tone, only for testing the player.
//
//   node scripts/seed-dev.ts <superuser-email> <password>
//
// Never run this against production.

const PB_URL = process.env.PB_URL ?? 'http://127.0.0.1:8090';
const [email, password] = process.argv.slice(2);

if (!email || !password) {
	console.error('Usage: node scripts/seed-dev.ts <superuser-email> <password>');
	process.exit(1);
}
if (!/127\.0\.0\.1|localhost/.test(PB_URL)) {
	console.error(`Refusing to seed a non-local PocketBase (${PB_URL}).`);
	process.exit(1);
}

type Line = { start: number; end: number; ar: string; fr: string };

/** Mono 16-bit WAV of a soft two-note drone. */
function tone(seconds: number, rate = 22050): Blob {
	const n = Math.round(seconds * rate);
	const buf = Buffer.alloc(44 + n * 2);
	buf.write('RIFF', 0);
	buf.writeUInt32LE(36 + n * 2, 4);
	buf.write('WAVE', 8);
	buf.write('fmt ', 12);
	buf.writeUInt32LE(16, 16);
	buf.writeUInt16LE(1, 20);
	buf.writeUInt16LE(1, 22);
	buf.writeUInt32LE(rate, 24);
	buf.writeUInt32LE(rate * 2, 28);
	buf.writeUInt16LE(2, 32);
	buf.writeUInt16LE(16, 34);
	buf.write('data', 36);
	buf.writeUInt32LE(n * 2, 40);
	for (let i = 0; i < n; i++) {
		const t = i / rate;
		const fade = Math.min(1, t / 0.5, (seconds - t) / 0.5);
		const s = Math.sin(2 * Math.PI * 220 * t) + 0.5 * Math.sin(2 * Math.PI * 330 * t);
		buf.writeInt16LE(Math.round(4000 * fade * s), 44 + i * 2);
	}
	return new Blob([buf], { type: 'audio/wav' });
}

async function api(path: string, init: RequestInit = {}, token?: string) {
	const res = await fetch(`${PB_URL}${path}`, {
		...init,
		headers: { ...(token ? { Authorization: token } : {}), ...init.headers }
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${JSON.stringify(body)}`);
	return body;
}

const { token } = await api('/api/collections/_superusers/auth-with-password', {
	method: 'POST',
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify({ identity: email, password })
});

async function findBySlug(collection: string, slug: string) {
	const list = await api(`/api/collections/${collection}/records?filter=${encodeURIComponent(`slug="${slug}"`)}`, {}, token);
	return list.items[0];
}

const categoryId = async (slug: string) => (await findBySlug('categories', slug)).id;

let reciter = await findBySlug('reciters', 'recitant-demo');
if (!reciter) {
	reciter = await api(
		'/api/collections/reciters/records',
		{
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ slug: 'recitant-demo', name_fr: 'Récitant démo', name_ar: 'قارئ تجريبي' })
		},
		token
	);
}

const demos: { slug: string; category: string; title_fr: string; title_ar: string; lines: Line[] }[] = [
	{
		slug: 'demo-subhanallah',
		category: 'taqibat',
		title_fr: 'Gloire et louange à Allah',
		title_ar: 'سبحان الله وبحمده',
		lines: [
			{ start: 0, end: 4, ar: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', fr: 'Gloire et louange à Allah' },
			{ start: 4, end: 8, ar: 'سُبْحَانَ اللَّهِ الْعَظِيمِ', fr: 'Gloire à Allah, le Très Grand' }
		]
	},
	{
		slug: 'demo-tahlil',
		category: 'taqibat',
		title_fr: "Il n'y a de divinité qu'Allah",
		title_ar: 'لا إله إلا الله',
		lines: [
			{ start: 0, end: 4, ar: 'لَا إِلَٰهَ إِلَّا اللَّهُ', fr: "Il n'y a de divinité qu'Allah" },
			{ start: 4, end: 8, ar: 'وَحْدَهُ لَا شَرِيكَ لَهُ', fr: 'Seul, sans associé' }
		]
	},
	{
		slug: 'demo-istighfar',
		category: 'douas',
		title_fr: 'Demande de pardon',
		title_ar: 'الاستغفار',
		lines: [
			{ start: 0, end: 4, ar: 'أَسْتَغْفِرُ اللَّهَ', fr: 'Je demande pardon à Allah' },
			{ start: 4, end: 8, ar: 'وَأَتُوبُ إِلَيْهِ', fr: 'et je me repens à Lui' }
		]
	}
];

for (const [i, demo] of demos.entries()) {
	if (await findBySlug('tracks', demo.slug)) {
		console.log(`= ${demo.slug} (already there)`);
		continue;
	}
	const form = new FormData();
	form.set('slug', demo.slug);
	form.set('title_fr', demo.title_fr);
	form.set('title_ar', demo.title_ar);
	form.set('category', await categoryId(demo.category));
	form.set('reciter', reciter.id);
	form.set('lines', JSON.stringify(demo.lines));
	form.set('order', String(i + 1));
	form.set('published', 'true');
	form.set('status', 'pending');
	form.set('audio', tone(8), `${demo.slug}.wav`);
	await api('/api/collections/tracks/records', { method: 'POST', body: form }, token);
	console.log(`+ ${demo.slug}`);
}

console.log('Demo content ready.');
