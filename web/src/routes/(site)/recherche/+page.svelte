<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import Seo from '#lib/components/Seo.svelte';
	import MediaGrid from '#lib/components/media/MediaGrid.svelte';
	import { link } from '#lib/i18n.ts';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<Seo title={data.query ? `${m.search_label()} : ${data.query}` : m.search_label()} />

<div class="container page">
	<h1>{m.search_label()}</h1>

	<form method="GET" action={link('/recherche')} role="search">
		<Search aria-hidden="true" />
		<input
			type="search"
			name="q"
			value={data.query}
			placeholder={m.search_placeholder()}
			aria-label={m.search_label()}
			dir="auto"
			autocomplete="off"
		/>
	</form>

	{#if !data.query}
		<p class="hint">{m.search_hint()}</p>
	{:else if data.results.length}
		<p class="hint">{m.search_results({ count: data.results.length, query: data.query })}</p>
		<MediaGrid items={data.results} />
	{:else}
		<p class="hint">{m.search_empty()}</p>
	{/if}
</div>

<style>
	.page {
		display: grid;
		gap: var(--space-5);
		padding-block: var(--space-6);
	}

	h1 {
		font-size: var(--text-2xl);
	}

	form {
		position: relative;
		max-width: 40rem;
	}

	form :global(svg) {
		position: absolute;
		inset-inline-start: var(--space-4);
		top: 50%;
		width: 20px;
		height: 20px;
		transform: translateY(-50%);
		color: var(--color-text-muted);
		pointer-events: none;
	}

	input {
		width: 100%;
		min-height: 52px;
		padding-inline: calc(var(--space-4) * 2 + 20px) var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		background: var(--color-surface);
		font-size: var(--text-lg);
	}

	input:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 0;
	}

	.hint {
		color: var(--color-text-muted);
	}
</style>
