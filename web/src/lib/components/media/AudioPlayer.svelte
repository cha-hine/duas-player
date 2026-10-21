<script lang="ts">
	import Maximize2 from '@lucide/svelte/icons/maximize-2';
	import Pause from '@lucide/svelte/icons/pause';
	import Play from '@lucide/svelte/icons/play';
	import Button from '#lib/components/ui/Button.svelte';
	import { categoryIcon } from '#lib/icons.ts';
	import type { MediaItem } from '#lib/media.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { openImmersive } from '#lib/player/immersive.ts';
	import { player } from '#lib/player/player.svelte.ts';

	// Starts the track in the Sakina player; the rest of the queue is `queue` (e.g. the same category)
	let { item, queue }: { item: MediaItem; queue: MediaItem[] } = $props();

	const Icon = $derived(categoryIcon(item.category?.icon));
	const isCurrent = $derived(player.isCurrent(item));
	const playing = $derived(isCurrent && !player.paused);

	function play() {
		if (isCurrent) player.toggle();
		else player.playItems([item, ...queue], item);
	}

	function immerse() {
		if (!isCurrent) player.playItems([item, ...queue], item);
		openImmersive();
	}
</script>

<div class="audio">
	<div class="art"><Icon aria-hidden="true" /></div>
	<div class="actions">
		<Button size="lg" onclick={play}>
			{#snippet icon()}{#if playing}<Pause />{:else}<Play />{/if}{/snippet}
			{playing ? m.player_pause() : m.listen()}
		</Button>
		<Button size="lg" variant="secondary" onclick={immerse}>
			{#snippet icon()}<Maximize2 />{/snippet}
			{m.player_open()}
		</Button>
	</div>
</div>

<style>
	.audio {
		display: grid;
		gap: var(--space-5);
		padding: var(--space-6) var(--space-5);
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
		height: 120px;
		color: var(--sakina-gold);
	}

	.art :global(svg) {
		width: 64px;
		height: 64px;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-3);
	}

	.actions :global(svg) {
		width: 20px;
		height: 20px;
	}

	/* The secondary button sits on the dark artwork in both site themes */
	.actions :global(.secondary) {
		color: var(--sakina-ivory);
		border-color: rgb(244 239 227 / 0.3);
	}
</style>
