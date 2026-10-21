/// <reference path="../pb_data/types.d.ts" />

// Categories for Shia devotional content. Existing categories are renamed where there is
// an equivalent (so content already filed under them follows), and unused ones are removed.

migrate((app) => {
	// [slug, name_fr, name_ar, icon, description_fr, description_ar]
	const categories = [
		['coran', 'Coran', 'القرآن الكريم', 'book-open', 'Récitations du Saint Coran.', 'تلاوات القرآن الكريم.'],
		['douas', 'Douas', 'الأدعية', 'hand-heart', 'Kumayl, Tawassul, Nudba, Iftitah, Sabah, Ahd…', 'كميل، التوسل، الندبة، الافتتاح، الصباح، العهد…'],
		['ziyarat', 'Ziyarat', 'الزيارات', 'landmark', 'Ziyarat Achoura, Warith, Jami’a al-Kabira, Aminullah…', 'زيارة عاشوراء، وارث، الجامعة الكبيرة، أمين الله…'],
		['sahifa', 'Sahifa Sajjadiya', 'الصحيفة السجادية', 'scroll-text', 'Les invocations de l’Imam Zayn al-Abidin (as).', 'أدعية الإمام زين العابدين (ع).'],
		['munajat', 'Munajat', 'المناجاة', 'moon-star', 'Munajat Sha’baniyya et les quinze munajat.', 'المناجاة الشعبانية والمناجيات الخمس عشرة.'],
		['taqibat', 'Ta’qibat', 'التعقيبات', 'sunrise', 'Invocations après la prière, tasbih de Fatima Zahra (as).', 'تعقيبات الصلاة وتسبيح الزهراء (ع).'],
		['latmiyat', 'Latmiyat & Nohas', 'اللطميات والنعي', 'drum', 'Latmiyat et nohas pour Ahl al-Bayt (as).', 'لطميات ونعي أهل البيت (ع).'],
		['majalis', 'Majalis', 'المجالس الحسينية', 'users', 'Majalis husseiniyya et récits de Karbala.', 'المجالس الحسينية وقراءة المصيبة.'],
		['madaeh', 'Madaeh & Mawalid', 'المدائح والمواليد', 'sparkles', 'Célébrations des naissances des Ahl al-Bayt (as).', 'مدائح ومواليد أهل البيت (ع).'],
		['conferences', 'Conférences', 'المحاضرات', 'mic', 'Cours, sermons et conférences.', 'محاضرات ودروس وخطب.']
	];
	const renames = { recitations: 'coran', invocations: 'douas', rappels: 'conferences', 'adhkar-matin': 'taqibat' };
	// Dropped categories: their content moves to the closest new one
	const merges = { 'adhkar-soir': 'taqibat', roqya: 'douas' };

	const find = (slug) => {
		try {
			return app.findFirstRecordByData('categories', 'slug', slug);
		} catch {
			return null;
		}
	};

	for (const [from, to] of Object.entries(renames)) {
		const record = find(from);
		if (record && !find(to)) {
			record.set('slug', to);
			app.save(record);
		}
	}

	const collection = app.findCollectionByNameOrId('categories');
	categories.forEach(([slug, fr, ar, icon, descFr, descAr], i) => {
		const record = find(slug) ?? new Record(collection);
		record.set('slug', slug);
		record.set('name_fr', fr);
		record.set('name_ar', ar);
		record.set('icon', icon);
		record.set('description_fr', descFr);
		record.set('description_ar', descAr);
		record.set('order', i + 1);
		app.save(record);
	});

	for (const [from, to] of Object.entries(merges)) {
		const old = find(from);
		if (!old) continue;
		const target = find(to);
		for (const name of ['tracks', 'videos']) {
			for (const item of app.findRecordsByFilter(name, 'category = {:id}', '', 0, 0, { id: old.id })) {
				item.set('category', target.id);
				app.save(item);
			}
		}
		app.delete(old);
	}
});
