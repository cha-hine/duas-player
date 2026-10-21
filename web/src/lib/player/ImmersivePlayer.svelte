<script lang="ts">
	import AArrowDown from '@lucide/svelte/icons/a-arrow-down';
	import AArrowUp from '@lucide/svelte/icons/a-arrow-up';
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
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import { formatDuration, name, title } from '#lib/media.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { lineLanguages, TEXT_LANGUAGES } from '#lib/text-languages.ts';
	import { closeImmersive } from './immersive.ts';
	import { player } from './player.svelte.ts';
	import { settings, THEMES, type Theme } from './settings.svelte.ts';
	import SyncedText from './SyncedText.svelte';
	import { energyAt } from './sync.ts';
	import Background from './visuals/Background.svelte';

	const THEME_LABELS: Record<Theme, () => string> = {
		aube: m.theme_aube,
		nuit: m.theme_nuit,
		ondes: m.theme_ondes,
		eau: m.theme_eau
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
	/** Languages the current track's text is written in, offered as toggles. */
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

	<footer>
		<div class="seek">
			<span>{formatDuration(player.currentTime) || '0:00'}</span>
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
			<span>{formatDuration(player.duration) || '0:00'}</span>
		</div>

		<div class="transport">
			<IconButton
				label={m.player_shuffle()}
				aria-pressed={player.shuffle}
				onclick={() => (player.shuffle = !player.shuffle)}
			>
				<Shuffle />
			</IconButton>
			<IconButton label={m.player_previous()} onclick={() => player.previous()}
				><SkipBack /></IconButton
			>
			<IconButton label={m.player_back10()} onclick={() => player.skip(-10)}><Undo2 /></IconButton>
			<span bind:this={playButton}>
				<IconButton
					label={player.paused ? m.player_play() : m.player_pause()}
					variant="filled"
					size="lg"
					onclick={() => player.toggle()}
				>
					{#if player.paused}<Play />{:else}<Pause />{/if}
				</IconButton>
			</span>
			<IconButton label={m.player_forward10()} onclick={() => player.skip(10)}><Redo2 /></IconButton
			>
			<IconButton label={m.player_next()} onclick={() => player.next()} disabled={!player.hasNext}>
				<SkipForward />
			</IconButton>
			<IconButton
				label={REPEAT_LABELS[player.repeat]()}
				aria-pressed={player.repeat !== 'off'}
				onclick={() => player.cycleRepeat()}
			>
				{#if player.repeat === 'one'}<Repeat1 />{:else}<Repeat />{/if}
			</IconButton>
		</div>

		<div class="options">
			<button
				class="pill"
				type="button"
				onclick={() => player.cycleSpeed()}
				aria-label={m.player_speed()}
			>
				{player.rate}×
			</button>
			<IconButton label={m.text_smaller()} onclick={() => settings.resizeText(-1)}
				><AArrowDown /></IconButton
			>
			<IconButton label={m.text_bigger()} onclick={() => settings.resizeText(1)}
				><AArrowUp /></IconButton
			>
			{#each languages as code (code)}
				<button
					class="pill"
					type="button"
					lang={code}
					aria-pressed={!settings.hidden.includes(code)}
					aria-label={m.toggle_language({ language: TEXT_LANGUAGES[code].native })}
					title={TEXT_LANGUAGES[code].native}
					onclick={() => settings.toggleLanguage(code, languages)}
					>{TEXT_LANGUAGES[code].short}</button
				>
			{/each}
			<div class="themes" role="group" aria-label={m.player_theme()}>
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
	</footer>
</div>

<style>
	.immersive {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: grid;
		grid-template-rows: auto 1fr auto;
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
		display: grid;
		gap: var(--space-3);
		padding: var(--space-3) var(--gutter) calc(var(--space-5) + env(safe-area-inset-bottom));
		max-width: 56rem;
		width: 100%;
		margin-inline: auto;
	}

	.seek {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		font-size: var(--text-xs);
		font-variant-numeric: tabular-nums;
		color: var(--sakina-mist);
	}

	.seek input {
		flex: 1;
		height: 24px;
		accent-color: var(--sakina-gold);
		cursor: pointer;
	}

	.transport,
	.options {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.transport :global([aria-pressed='true']),
	.options :global([aria-pressed='true']) {
		color: var(--sakina-gold);
	}

	.pill {
		min-width: 44px;
		height: 36px;
		padding: 0 var(--space-3);
		border: 1px solid rgb(244 239 227 / 0.25);
		border-radius: var(--radius-pill);
		background: transparent;
		color: var(--sakina-ivory);
		font-weight: 600;
		cursor: pointer;
	}

	.pill[aria-pressed='false'] {
		opacity: 0.5;
	}

	.themes {
		display: flex;
		gap: var(--space-2);
		margin-inline-start: var(--space-3);
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

	.ondes {
		background: repeating-radial-gradient(
			circle,
			var(--sakina-gold) 0 2px,
			var(--sakina-deep) 3px 7px
		);
	}

	.eau {
		background: linear-gradient(135deg, var(--sakina-emerald), var(--sakina-night));
	}
</style>
