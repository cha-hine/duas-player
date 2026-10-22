<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Pause from '@lucide/svelte/icons/pause';
	import Play from '@lucide/svelte/icons/play';
	import Redo2 from '@lucide/svelte/icons/redo-2';
	import Repeat from '@lucide/svelte/icons/repeat';
	import Repeat1 from '@lucide/svelte/icons/repeat-1';
	import Shuffle from '@lucide/svelte/icons/shuffle';
	import SkipBack from '@lucide/svelte/icons/skip-back';
	import SkipForward from '@lucide/svelte/icons/skip-forward';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import TextSettings from '#lib/components/TextSettings.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import { formatDuration, name, title } from '#lib/media.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { lineLanguages } from '#lib/text-languages.ts';
	import { closeImmersive } from './immersive.ts';
	import { player } from './player.svelte.ts';
	import { settings, THEMES, type Theme } from './settings.svelte.ts';
	import SyncedText from './SyncedText.svelte';
	import { energyAt } from './sync.ts';
	import Background from './visuals/Background.svelte';

	const THEME_LABELS: Record<Theme, () => string> = {
		aube: m.theme_aube,
		nuit: m.theme_nuit,
		montagnes: m.theme_montagnes,
		mer: m.theme_mer,
		dunes: m.theme_dunes,
		neige: m.theme_neige,
		foret: m.theme_foret,
		cascade: m.theme_cascade,
		lanternes: m.theme_lanternes
	};
	const REPEAT_LABELS = {
		off: m.player_repeat_off,
		all: m.player_repeat_all,
		one: m.player_repeat_one
	};

	// Back keys: Escape, Samsung (10009), LG (461). Handled here, before the page-level
	// remote navigation, so they close the player instead of leaving the page.
	const BACK_CODES = new Set([10009, 461]);

	const item = $derived(player.current!);
	/** Languages the current track's text is written in, offered in the text settings. */
	const languages = $derived(lineLanguages(player.lines));
	let playButton = $state<HTMLElement>();

	$effect(() => {
		playButton?.querySelector('button')?.focus();
	});

	// The page behind must not scroll while the player covers it
	$effect(() => {
		const root = document.documentElement;
		const previous = root.style.overflow;
		root.style.overflow = 'hidden';
		return () => {
			root.style.overflow = previous;
		};
	});

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' || BACK_CODES.has(event.keyCode)) {
			event.preventDefault();
			closeImmersive();
		}
	}
</script>

<div
	class="immersive"
	role="dialog"
	aria-modal="true"
	aria-label={title(item)}
	tabindex="-1"
	{onkeydown}
>
	<!-- A fresh background per theme (each has its own shader and fallback state) -->
	{#key settings.theme}
		<Background theme={settings.theme} level={() => energyAt(player.energy, player.time)} />
	{/key}
	<div class="scrim"></div>

	<header>
		<IconButton label={m.player_close()} onclick={closeImmersive}><ChevronDown /></IconButton>
		<div class="heading">
			<strong><bdi>{title(item)}</bdi></strong>
			<small>
				{#if item.reciter}<bdi>{name(item.reciter)}</bdi>{/if}
				{#if item.reciter && item.category}·{/if}
				{#if item.category}{name(item.category)}{/if}
			</small>
		</div>
	</header>

	<div class="stage">
		<SyncedText />
	</div>

	<!-- One line at the bottom: transport, position, then speed and display settings -->
	<footer>
		<div class="transport">
			<IconButton
				class="wide-only"
				label={m.player_shuffle()}
				aria-pressed={player.shuffle}
				onclick={() => (player.shuffle = !player.shuffle)}
			>
				<Shuffle />
			</IconButton>
			<IconButton label={m.player_previous()} onclick={() => player.previous()}
				><SkipBack /></IconButton
			>
			<IconButton class="wide-only" label={m.player_back10()} onclick={() => player.skip(-10)}
				><Undo2 /></IconButton
			>
			<span bind:this={playButton}>
				<IconButton
					label={player.paused ? m.player_play() : m.player_pause()}
					variant="filled"
					onclick={() => player.toggle()}
				>
					{#if player.paused}<Play />{:else}<Pause />{/if}
				</IconButton>
			</span>
			<IconButton class="wide-only" label={m.player_forward10()} onclick={() => player.skip(10)}
				><Redo2 /></IconButton
			>
			<IconButton label={m.player_next()} onclick={() => player.next()} disabled={!player.hasNext}>
				<SkipForward />
			</IconButton>
		</div>

		<div class="seek">
			<span class="time">{formatDuration(player.currentTime) || '0:00'}</span>
			<input
				type="range"
				min="0"
				max={player.duration || 0}
				step="0.1"
				value={player.currentTime}
				oninput={(e) => player.seek(Number(e.currentTarget.value))}
				aria-label={m.player_position()}
				style:--progress="{player.duration ? (player.currentTime / player.duration) * 100 : 0}%"
			/>
			<span class="time">{formatDuration(player.duration) || '0:00'}</span>
		</div>

		<div class="options">
			<IconButton
				class="wide-only"
				label={REPEAT_LABELS[player.repeat]()}
				aria-pressed={player.repeat !== 'off'}
				onclick={() => player.cycleRepeat()}
			>
				{#if player.repeat === 'one'}<Repeat1 />{:else}<Repeat />{/if}
			</IconButton>
			<button
				class="pill"
				type="button"
				onclick={() => player.cycleSpeed()}
				aria-label={m.player_speed()}
			>
				{player.rate}×
			</button>
			<TextSettings {languages} toggles placement="above">
				<div class="themes" role="group" aria-label={m.player_theme()}>
					<strong>{m.player_theme()}</strong>
					<div>
						{#each THEMES as theme (theme)}
							<button
								class="swatch {theme}"
								type="button"
								aria-pressed={settings.theme === theme}
								aria-label={THEME_LABELS[theme]()}
								title={THEME_LABELS[theme]()}
								onclick={() => settings.setTheme(theme)}
							></button>
						{/each}
					</div>
				</div>
			</TextSettings>
		</div>
	</footer>
</div>

<style>
	.immersive {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto;
		/* As wide as the screen, whatever the text (a long line would widen the column) */
		grid-template-columns: minmax(0, 1fr);
		color: var(--sakina-ivory);
		background: var(--sakina-night);
		/* The player is always dark, whatever the site theme */
		--color-text: var(--sakina-ivory);
		--color-text-muted: var(--sakina-mist);
		--color-surface-2: rgb(244 239 227 / 0.12);
		--color-accent: var(--sakina-gold);
		--color-on-accent: var(--sakina-night);
		--color-focus: var(--sakina-gold);
		outline: none;
	}

	/* Darkens the edges so text and controls stay readable over any background */
	.scrim {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(to bottom, rgb(11 26 46 / 0.7), transparent 25%),
			linear-gradient(to top, rgb(11 26 46 / 0.85), transparent 40%);
		pointer-events: none;
	}

	header,
	.stage,
	footer {
		position: relative;
	}

	header {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--gutter);
	}

	.heading {
		display: grid;
		min-width: 0;
	}

	.heading strong,
	.heading small {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.heading small {
		color: var(--sakina-mist);
		font-size: var(--text-sm);
	}

	.stage {
		display: grid;
		place-items: center;
		padding: var(--space-5) var(--gutter);
		overflow-y: auto;
	}

	footer {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		max-width: 80rem;
		margin-inline: auto;
		padding: var(--space-2) var(--gutter) calc(var(--space-3) + env(safe-area-inset-bottom));
		/* The text settings panel is dark too */
		--panel-bg: var(--sakina-deep);
		--color-border: rgb(244 239 227 / 0.18);
		--color-accent-text: var(--sakina-gold);
	}

	.transport,
	.options {
		display: flex;
		align-items: center;
		flex: none;
		gap: var(--space-1);
	}

	.transport :global([aria-pressed='true']),
	.options :global([aria-pressed='true']) {
		color: var(--sakina-gold);
	}

	.seek {
		display: flex;
		flex: 1;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
		font-size: var(--text-xs);
		font-variant-numeric: tabular-nums;
		color: var(--sakina-mist);
	}

	.seek input {
		flex: 1;
		min-width: 0;
		height: 24px;
		accent-color: var(--sakina-gold);
		cursor: pointer;
	}

	.pill {
		min-width: 44px;
		height: 36px;
		padding: 0 var(--space-2);
		border: 1px solid rgb(244 239 227 / 0.25);
		border-radius: var(--radius-pill);
		background: transparent;
		color: var(--sakina-ivory);
		font-weight: 600;
		cursor: pointer;
	}

	.themes {
		display: grid;
		gap: var(--space-2);
		padding-top: var(--space-2);
		border-top: 1px solid rgb(244 239 227 / 0.12);
	}

	.themes div {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	/* Narrow screens: the essentials only, on the same line */
	@media (max-width: 640px) {
		footer :global(.wide-only),
		.time {
			display: none;
		}

		footer {
			gap: var(--space-2);
		}
	}

	.swatch {
		width: 28px;
		height: 28px;
		border: 2px solid transparent;
		border-radius: 50%;
		cursor: pointer;
	}

	.swatch[aria-pressed='true'] {
		border-color: var(--sakina-gold);
	}

	.aube {
		background: radial-gradient(circle at 40% 35%, var(--sakina-gold), var(--sakina-deep) 70%);
	}

	.nuit {
		background:
			radial-gradient(circle at 30% 30%, #fff 0 2px, transparent 3px), var(--sakina-night);
	}

	/* Landscapes: horizon and light */
	.montagnes {
		background:
			linear-gradient(160deg, transparent 55%, #1f2f47 56%),
			linear-gradient(20deg, transparent 50%, #34405a 51%), linear-gradient(#16304a, #8a6a45);
	}

	.mer {
		background:
			radial-gradient(circle at 68% 30%, #f4efe3 0 3px, transparent 4px),
			linear-gradient(transparent 58%, #173451 59%), linear-gradient(#081526, #22405c);
	}

	.neige {
		background:
			linear-gradient(170deg, transparent 50%, rgb(80 255 170 / 0.45) 52%, transparent 62%),
			linear-gradient(20deg, #cad6e6 0 22%, transparent 23%), linear-gradient(#06101f, #1b3350);
	}

	.foret {
		background:
			linear-gradient(90deg, #081615 0 18%, transparent 19% 70%, #081615 71% 82%, transparent 83%),
			radial-gradient(circle at 60% 40%, #f1ffb0 0 2px, transparent 3px),
			linear-gradient(#050d14, #12302c);
	}

	.cascade {
		background:
			linear-gradient(90deg, transparent 30%, #e8f6ff 31% 42%, transparent 43%),
			linear-gradient(#183b52, #3e7a6e);
	}

	.lanternes {
		background:
			radial-gradient(circle at 35% 40%, #ffb35a 0 3px, transparent 4px),
			radial-gradient(circle at 65% 62%, #ffb35a 0 2px, transparent 3px),
			linear-gradient(#141a3a, #4a3355);
	}

	.dunes {
		background:
			radial-gradient(ellipse 90% 40% at 30% 100%, #3a2b36 60%, transparent 61%),
			linear-gradient(#1d2b48, #b98a52);
	}
</style>
