<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import { link } from '#lib/i18n.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';

	// Where the texts, translations and recordings come from. Written out in both languages
	// here: it is prose, not interface labels.
	type Source = { name: string; url?: string; fr: string; ar: string };
	type Section = { fr: string; ar: string; sources: Source[] };

	const SECTIONS: Section[] = [
		{
			fr: 'Texte du Coran',
			ar: 'نص القرآن الكريم',
			sources: [
				{
					name: 'Tanzil Project',
					url: 'https://tanzil.net',
					fr: 'Texte uthmani (version 1.1), sous licence Creative Commons Attribution 3.0, reproduit sans modification ; la basmala est seulement placée sur sa propre ligne avant chaque sourate.',
					ar: 'النص العثماني (الإصدار 1.1)، برخصة المشاع الإبداعي (نسب المصنَّف 3.0)، منقول دون تغيير، مع وضع البسملة في سطر مستقل قبل كل سورة.'
				}
			]
		},
		{
			fr: 'Traductions du Coran',
			ar: 'ترجمات القرآن الكريم',
			sources: [
				{
					name: '« 41 traductions du Coran » (v1.10)',
					fr: 'Recueil libre de traductions françaises : traduction d’Abolqasem Fakhri, et translittération de transliteration.org.',
					ar: 'مجموعة مفتوحة من الترجمات الفرنسية: ترجمة أبو القاسم فخري، والنقحرة من موقع transliteration.org.'
				},
				{
					name: 'Muhammad Hamidullah (édition révisée)',
					fr: 'Traduction française lue par Youssouf Leclerc, affichée avec sa récitation, d’après le même recueil.',
					ar: 'الترجمة الفرنسية التي يقرؤها يوسف لوكلير، تُعرض مع تلاوته، من المجموعة نفسها.'
				},
				{
					name: 'Tanzil — traductions',
					url: 'https://tanzil.net/trans/',
					fr: 'Traduction anglaise d’Ali Quli Qarai (usage non commercial).',
					ar: 'الترجمة الإنجليزية لعلي قلي قرائي (للاستخدام غير التجاري).'
				}
			]
		},
		{
			fr: 'Récitations du Coran',
			ar: 'تلاوات القرآن الكريم',
			sources: [
				{
					name: 'EveryAyah',
					url: 'https://everyayah.com',
					fr: 'Enregistrements verset par verset des récitateurs (aussi sur versebyversequran.com). Chaque sourate est reconstituée à partir de ses versets, ce qui donne le moment exact de chacun.',
					ar: 'تسجيلات القرّاء آيةً آية (وأيضًا على versebyversequran.com). تُجمع كل سورة من آياتها، فيُعرف وقت كل آية بدقة.'
				},
				{
					name: 'Le-Coran.com',
					url: 'https://www.le-coran.com/',
					fr: 'Le Coran lu en français, verset par verset, par Youssouf Leclerc (traduction de Muhammad Hamidullah).',
					ar: 'القرآن مقروءًا بالفرنسية آيةً آية بصوت يوسف لوكلير (ترجمة محمد حميد الله).'
				}
			]
		},
		{
			fr: 'Douas et ziyarat',
			ar: 'الأدعية والزيارات',
			sources: [
				{
					name: 'Duas.org',
					url: 'https://www.duas.org',
					fr: 'Texte arabe, translittération et traduction anglaise des douas et ziyarat importés.',
					ar: 'النص العربي والنقحرة والترجمة الإنجليزية للأدعية والزيارات المنقولة.'
				}
			]
		}
	];

	const ar = getLocale() === 'ar';
	const text = (item: { fr: string; ar: string }) => (ar ? item.ar : item.fr);
</script>

<Seo title={m.nav_sources()} description={m.sources_intro()} />

<div class="container page">
	<header>
		<h1>{m.nav_sources()}</h1>
		<p>{m.sources_intro()}</p>
	</header>

	{#each SECTIONS as section (section.fr)}
		<section>
			<h2>{text(section)}</h2>
			<ul>
				{#each section.sources as source (source.name)}
					<li>
						<strong dir="ltr">
							{#if source.url}
								<a href={source.url} target="_blank" rel="noopener">{source.name}</a>
							{:else}
								{source.name}
							{/if}
						</strong>
						<p>{text(source)}</p>
					</li>
				{/each}
			</ul>
		</section>
	{/each}

	<p class="more">
		<a href={link('/coran')}>{m.sources_reciters()}</a>
	</p>
</div>

<style>
	.page {
		display: grid;
		gap: var(--space-6);
		max-width: 48rem;
		padding-block: var(--space-6);
	}

	header {
		display: grid;
		gap: var(--space-2);
	}

	h1 {
		font-size: var(--text-2xl);
	}

	header p,
	li p {
		color: var(--color-text-muted);
	}

	h2 {
		font-size: var(--text-lg);
		margin-bottom: var(--space-3);
	}

	ul {
		display: grid;
		gap: var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: grid;
		gap: var(--space-1);
		padding-inline-start: var(--space-4);
		border-inline-start: 2px solid var(--color-accent);
	}

	li a,
	.more a {
		color: var(--color-accent-text);
	}
</style>
