<script lang="ts">
	import Play from '@lucide/svelte/icons/play';
	import Seo from '#lib/components/Seo.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { player } from '#lib/player/player.svelte.ts';
	import { categoryIcon } from '#lib/icons.ts';
	import { localized, name, type Category, type MediaItem } from '#lib/media.ts';
	import { m } from '#lib/paraglide/messages.js';
	import MediaGrid from './MediaGrid.svelte';

	let { category, items }: { category: Category; items: MediaItem[] } = $props();

	const Icon = $derived(categoryIcon(category.icon));
	const description = $derived(localized(category.description_fr, category.description_ar));
	const audio = $derived(items.filter((i) => i.kind === 'audio'));
</script>

<Seo title={name(category)} description={description || undefined} />

<div class="container page">
	<header>
		<span class="icon"><Icon aria-hidden="true" /></span>
		<div>
			<h1>{name(category)}</h1>
			{#if description}<p>{description}</p>{/if}
			<small>{m.items_count({ count: items.length })}</small>
		</div>
		{#if audio.length}
			<div class="listen">
				<Button onclick={() => player.playItems(audio)}>
					{#snippet icon()}<Play />{/snippet}
					{m.listen_all()}
				</Button>
			</div>
		{/if}
	</header>

	{#if items.length}
		<MediaGrid {items} />
	{:else}
		<p class="empty">{m.empty_category()}</p>
	{/if}
</div>

<style>
	.page {
		padding-block: var(--space-6);
	}

	header {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		margin-bottom: var(--space-6);
	}

	.icon {
		display: grid;
		place-items: center;
		flex: none;
		width: 64px;
		height: 64px;
		border-radius: var(--radius-lg);
		background: color-mix(in srgb, var(--color-accent) 14%, transparent);
		color: var(--color-accent-text);
	}

	.icon :global(svg) {
		width: 30px;
		height: 30px;
	}

	h1 {
		font-size: var(--text-2xl);
	}

	.listen {
		margin-inline-start: auto;
	}

	.listen :global(svg) {
		width: 18px;
		height: 18px;
	}

	p,
	small {
		color: var(--color-text-muted);
	}

	.empty {
		padding-block: var(--space-7);
		text-align: center;
		color: var(--color-text-muted);
	}
</style>
