<script lang="ts">
	import type { Component } from 'svelte';
	import Tag from '#lib/components/ui/Tag.svelte';
	import { m } from '#lib/paraglide/messages.js';

	let { title, text, icon: Icon }: { title: string; text: string; icon: Component } = $props();
</script>

<svelte:head>
	<title>{title} · {m.site_name()}</title>
</svelte:head>

<section class="container coming-soon">
	<div class="icon"><Icon aria-hidden="true" /></div>
	<h1>{title}</h1>
	<p>{text}</p>
	<Tag variant="accent">{m.coming_soon()}</Tag>
</section>

<style>
	.coming-soon {
		display: grid;
		justify-items: center;
		gap: var(--space-4);
		padding-block: var(--space-8);
		text-align: center;
	}

	.icon {
		display: grid;
		place-items: center;
		width: 72px;
		height: 72px;
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		color: var(--color-accent-text);
	}

	.icon :global(svg) {
		width: 32px;
		height: 32px;
	}

	h1 {
		font-size: var(--text-2xl);
	}

	p {
		max-width: 32rem;
		color: var(--color-text-muted);
	}
</style>
