<script lang="ts">
	import Headphones from '@lucide/svelte/icons/headphones';
	import Video from '@lucide/svelte/icons/video';
	import { link } from '#lib/i18n.ts';
	import { categoryIcon } from '#lib/icons.ts';
	import { LANGUAGES } from '#lib/languages.ts';
	import { formatDuration, itemPath, name, otherTitle, title, type MediaItem } from '#lib/media.ts';
	import { m } from '#lib/paraglide/messages.js';

	let { item }: { item: MediaItem } = $props();

	const Icon = $derived(categoryIcon(item.category?.icon));
</script>

<a class="card" href={link(itemPath(item))}>
	<div class="thumb">
		{#if item.posterUrl}
			<img src={item.posterUrl} alt="" loading="lazy" />
		{:else}
			<div class="art"><Icon aria-hidden="true" /></div>
		{/if}
		<span class="kind">
			{#if item.kind === 'video'}
				<Video aria-hidden="true" /><span class="visually-hidden">{m.video_label()}</span>
			{:else}
				<Headphones aria-hidden="true" /><span class="visually-hidden">{m.audio_label()}</span>
			{/if}
			{#if item.duration}<span>{formatDuration(item.duration)}</span>{/if}
		</span>
	</div>
	<div class="body">
		<h3><bdi>{title(item)}</bdi></h3>
		{#if otherTitle(item)}<p class="other"><bdi>{otherTitle(item)}</bdi></p>{/if}
		<p class="meta">
			{#if item.reciter}<span dir="auto">{name(item.reciter)}</span>{/if}
			{#if item.language}<span class="lang">{LANGUAGES[item.language].native}</span>{/if}
		</p>
	</div>
</a>

<style>
	.card {
		display: flex;
		flex-direction: column;
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		overflow: hidden;
		text-decoration: none;
		transition:
			border-color var(--duration) var(--ease),
			transform var(--duration) var(--ease);
	}

	.card:hover {
		border-color: var(--color-accent);
		transform: translateY(-2px);
	}

	.thumb {
		position: relative;
		aspect-ratio: 16 / 9;
		background: var(--color-surface-2);
	}

	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.art {
		display: grid;
		place-items: center;
		height: 100%;
		background:
			radial-gradient(
				circle at 30% 20%,
				color-mix(in srgb, var(--sakina-gold) 22%, transparent),
				transparent 60%
			),
			linear-gradient(135deg, var(--sakina-deep), var(--sakina-night));
		color: var(--sakina-gold);
	}

	.art :global(svg) {
		width: 40px;
		height: 40px;
		opacity: 0.9;
	}

	.kind {
		position: absolute;
		inset-inline-end: var(--space-2);
		bottom: var(--space-2);
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: 2px var(--space-2);
		border-radius: var(--radius-pill);
		background: rgb(11 26 46 / 0.75);
		color: var(--sakina-ivory);
		font-size: var(--text-xs);
		font-variant-numeric: tabular-nums;
	}

	.kind :global(svg) {
		width: 14px;
		height: 14px;
	}

	.body {
		display: grid;
		gap: var(--space-1);
		padding: var(--space-3) var(--space-4) var(--space-4);
	}

	h3 {
		font-family: var(--font-ui);
		font-size: var(--text-base);
		font-weight: 600;
		line-height: 1.35;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.other {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-text-muted);
		font-size: var(--text-xs);
	}

	.lang {
		padding: 1px var(--space-2);
		border-radius: var(--radius-pill);
		background: var(--color-surface-2);
	}
</style>
