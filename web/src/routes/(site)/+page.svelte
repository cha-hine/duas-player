<script lang="ts">
	import logo from '#lib/assets/favicon.svg';
	import Seo from '#lib/components/Seo.svelte';
	import CategoryCard from '#lib/components/media/CategoryCard.svelte';
	import SectionTitle from '#lib/components/media/SectionTitle.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { link } from '#lib/i18n.ts';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<Seo title="" />

<section class="hero container">
	<img src={logo} alt="" width="80" height="80" />
	<h1>
		Sakina <span lang="ar" dir="rtl">سكينة</span>
	</h1>
	<p class="tagline">{m.site_tagline()}</p>
	<p class="description">{m.site_description()}</p>
	<div class="cta">
		<Button href={link('/bibliotheque')} size="lg">{m.nav_library()}</Button>
		<Button href={link('/recherche')} size="lg" variant="secondary">{m.search_label()}</Button>
	</div>
</section>

<section class="container block">
	<SectionTitle title={m.categories_title()} href={link('/bibliotheque')} />
	<div class="categories">
		{#each data.categories as category (category.id)}
			<CategoryCard {category} count={data.counts[category.id] ?? 0} />
		{/each}
	</div>
</section>

<style>
	.hero {
		display: grid;
		justify-items: center;
		gap: var(--space-3);
		padding-block: var(--space-7) var(--space-6);
		text-align: center;
	}

	.hero img {
		border-radius: 20px;
		box-shadow: var(--shadow-md);
	}

	h1 {
		font-family: var(--font-display-latin);
		font-size: var(--text-3xl);
	}

	h1 span {
		font-family: var(--font-arabic);
		color: var(--color-accent-text);
		margin-inline-start: 0.3em;
	}

	.tagline {
		font-size: var(--text-lg);
		color: var(--color-accent-text);
	}

	.description {
		max-width: 34rem;
		color: var(--color-text-muted);
	}

	.cta {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-3);
		margin-top: var(--space-3);
	}

	.block {
		padding-block: var(--space-6);
	}

	.categories {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
		gap: var(--space-3);
	}
</style>
