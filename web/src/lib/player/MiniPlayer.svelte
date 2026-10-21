<script lang="ts">
	import Maximize2 from '@lucide/svelte/icons/maximize-2';
	import Pause from '@lucide/svelte/icons/pause';
	import Play from '@lucide/svelte/icons/play';
	import SkipBack from '@lucide/svelte/icons/skip-back';
	import SkipForward from '@lucide/svelte/icons/skip-forward';
	import X from '@lucide/svelte/icons/x';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import { categoryIcon } from '#lib/icons.ts';
	import { name, title } from '#lib/media.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { openImmersive } from './immersive.ts';
	import { player } from './player.svelte.ts';

	const item = $derived(player.current!);
	const Icon = $derived(categoryIcon(item.category?.icon));
	const progress = $derived(player.duration ? (player.currentTime / player.duration) * 100 : 0);
</script>

<section class="mini-player" aria-label={m.now_playing()}>
	<div class="progress" style:width="{progress}%"></div>
	<button class="info" type="button" onclick={openImmersive} aria-label={m.player_open()}>
		<span class="art"><Icon aria-hidden="true" /></span>
		<span class="text">
			<strong><bdi>{title(item)}</bdi></strong>
			{#if item.reciter}<small><bdi>{name(item.reciter)}</bdi></small>{/if}
		</span>
	</button>
	<div class="controls">
		<span class="wide"
			><IconButton label={m.player_previous()} onclick={() => player.previous()}
				><SkipBack /></IconButton
			></span
		>
		<IconButton
			label={player.paused ? m.player_play() : m.player_pause()}
			variant="filled"
			onclick={() => player.toggle()}
		>
			{#if player.paused}<Play />{:else}<Pause />{/if}
		</IconButton>
		<IconButton label={m.player_next()} onclick={() => player.next()} disabled={!player.hasNext}>
			<SkipForward />
		</IconButton>
		<span class="wide"
			><IconButton label={m.player_open()} onclick={openImmersive}><Maximize2 /></IconButton></span
		>
		<IconButton label={m.player_stop()} onclick={() => player.stop()}><X /></IconButton>
	</div>
</section>

<style>
	.mini-player {
		position: fixed;
		inset-inline: 0;
		bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom));
		z-index: 20;
		display: flex;
		align-items: center;
		gap: var(--space-3);
		height: var(--mini-player-height);
		padding-inline: var(--gutter);
		background: color-mix(in srgb, var(--color-surface) 94%, transparent);
		backdrop-filter: blur(14px);
		border-top: 1px solid var(--color-border);
		box-shadow: var(--shadow-md);
	}

	.progress {
		position: absolute;
		top: 0;
		inset-inline-start: 0;
		height: 2px;
		background: var(--color-accent);
		transition: width 250ms linear;
	}

	.info {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex: 1;
		min-width: 0;
		padding: var(--space-1);
		border: none;
		border-radius: var(--radius-md);
		background: none;
		text-align: start;
		cursor: pointer;
	}

	.art {
		display: grid;
		place-items: center;
		flex: none;
		width: 44px;
		height: 44px;
		border-radius: var(--radius-sm);
		background: linear-gradient(135deg, var(--sakina-deep), var(--sakina-night));
		color: var(--sakina-gold);
	}

	.art :global(svg) {
		width: 22px;
		height: 22px;
	}

	.text {
		display: grid;
		min-width: 0;
	}

	strong,
	small {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	strong {
		font-size: var(--text-sm);
	}

	small {
		color: var(--color-text-muted);
		font-size: var(--text-xs);
	}

	.controls {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.wide {
		display: none;
	}

	@media (min-width: 768px) {
		.mini-player {
			bottom: 0;
		}

		.wide {
			display: contents;
		}
	}
</style>
