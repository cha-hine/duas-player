<script lang="ts">
	import { categoryIcon } from '#lib/icons.ts';
	import type { MediaItem } from '#lib/media.ts';

	// Simple player for now; the immersive Sakina player replaces it in Phase 5
	let { item, label }: { item: MediaItem; label: string } = $props();

	const Icon = $derived(categoryIcon(item.category?.icon));
</script>

<div class="audio">
	<div class="art"><Icon aria-hidden="true" /></div>
	{#if item.audioUrl}
		<audio controls preload="metadata" src={item.audioUrl} aria-label={label}></audio>
	{/if}
</div>

<style>
	.audio {
		display: grid;
		gap: var(--space-4);
		padding: var(--space-5);
		border-radius: var(--radius-lg);
		background:
			radial-gradient(
				circle at 30% 0%,
				color-mix(in srgb, var(--sakina-gold) 18%, transparent),
				transparent 60%
			),
			linear-gradient(135deg, var(--sakina-deep), var(--sakina-night));
	}

	.art {
		display: grid;
		place-items: center;
		height: 140px;
		color: var(--sakina-gold);
	}

	.art :global(svg) {
		width: 64px;
		height: 64px;
	}

	audio {
		width: 100%;
	}
</style>
