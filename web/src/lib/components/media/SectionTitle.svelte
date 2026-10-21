<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { m } from '#lib/paraglide/messages.js';

	let { title, href }: { title: string; href?: string } = $props();

	// The arrow points "forward", which is left in Arabic
	const Arrow = $derived(getLocale() === 'ar' ? ArrowLeft : ArrowRight);
</script>

<div class="section-title">
	<h2>{title}</h2>
	{#if href}
		<a {href}>{m.see_all()} <Arrow aria-hidden="true" /></a>
	{/if}
</div>

<style>
	.section-title {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-4);
		margin-bottom: var(--space-4);
	}

	h2 {
		font-size: var(--text-xl);
	}

	a {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		color: var(--color-accent-text);
		font-size: var(--text-sm);
		font-weight: 600;
		text-decoration: none;
	}

	a :global(svg) {
		width: 16px;
		height: 16px;
	}
</style>
