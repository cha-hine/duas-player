<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import CategoryCard from '#lib/components/media/CategoryCard.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<Seo title={m.nav_library()} description={m.library_intro()} />

<div class="container page">
	<h1>{m.nav_library()}</h1>
	<p>{m.library_intro()}</p>
	<div class="categories">
		{#each data.categories as category (category.id)}
			<CategoryCard {category} />
		{/each}
	</div>
</div>

<style>
	.page {
		display: grid;
		gap: var(--space-3);
		padding-block: var(--space-6);
	}

	h1 {
		font-size: var(--text-2xl);
	}

	p {
		color: var(--color-text-muted);
		margin-bottom: var(--space-4);
	}

	.categories {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
		gap: var(--space-3);
	}
</style>
