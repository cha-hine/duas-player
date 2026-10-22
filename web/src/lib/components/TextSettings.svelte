<script lang="ts">
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import Settings from '@lucide/svelte/icons/settings';
	import type { Snippet } from 'svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { settings, SIZE_MAX, SIZE_MIN } from '#lib/player/settings.svelte.ts';
	import { TEXT_FONTS } from '#lib/text-fonts.ts';
	import { TEXT_LANGUAGES, type TextLanguage } from '#lib/text-languages.ts';

	// Gear button opening a small floating panel: font and size of each language's text.
	// `toggles`: each language's code also shows or hides it. `placement`: where the panel
	// opens from the button (above in the player's bottom bar). `children`: more settings below.
	let {
		languages,
		toggles = false,
		placement = 'below',
		children
	}: {
		languages: TextLanguage[];
		toggles?: boolean;
		placement?: 'above' | 'below';
		children?: Snippet;
	} = $props();

	let open = $state(false);
	let root = $state<HTMLElement>();
	let panel = $state<HTMLElement>();
	let position = $state({ left: 0, top: 0 });

	const GAP = 8;
	const MARGIN = 12;

	/** Next to the button, but always fully on screen (phones, TVs). */
	function place() {
		if (!root || !panel) return;
		const button = root.getBoundingClientRect();
		const { width, height } = panel.getBoundingClientRect();
		const left = Math.min(
			Math.max(MARGIN, button.right - width),
			window.innerWidth - width - MARGIN
		);
		const above = button.top - GAP - height;
		const below = button.bottom + GAP;
		const top =
			placement === 'above' && above >= MARGIN
				? above
				: below + height <= window.innerHeight - MARGIN
					? below
					: Math.max(MARGIN, above);
		position = { left: Math.max(MARGIN, left), top };
	}

	$effect(() => {
		if (!open || !panel) return;
		place();
		panel.querySelector<HTMLElement>('select, button')?.focus();
		const outside = (event: PointerEvent) => {
			if (!root?.contains(event.target as Node)) open = false;
		};
		// Escape and the remotes' Back key close the panel only, not the player around it:
		// caught on the way down, before the player's own keyboard handlers
		const back = (event: KeyboardEvent) => {
			if (event.key !== 'Escape' && event.keyCode !== 10009 && event.keyCode !== 461) return;
			event.preventDefault();
			event.stopImmediatePropagation();
			open = false;
			root?.querySelector<HTMLElement>('button')?.focus();
		};
		window.addEventListener('pointerdown', outside);
		window.addEventListener('resize', place);
		window.addEventListener('keydown', back, true);
		return () => {
			window.removeEventListener('pointerdown', outside);
			window.removeEventListener('resize', place);
			window.removeEventListener('keydown', back, true);
		};
	});

	const percent = (size: number) => `${Math.round(size * 100)} %`;
</script>

<div class="text-settings" bind:this={root}>
	<IconButton
		label={m.text_settings()}
		aria-expanded={open}
		aria-haspopup="dialog"
		onclick={() => (open = !open)}><Settings /></IconButton
	>
	{#if open}
		<div
			class="panel"
			bind:this={panel}
			role="dialog"
			aria-label={m.text_settings()}
			style:left="{position.left}px"
			style:top="{position.top}px"
		>
			<div class="head">
				<strong>{m.text_settings()}</strong>
				<button type="button" class="reset" onclick={() => settings.resetText()}
					>{m.text_reset()}</button
				>
			</div>
			{#each languages as code (code)}
				{@const language = TEXT_LANGUAGES[code].native}
				{@const fonts = TEXT_FONTS[code]}
				{@const shown = !settings.hidden.includes(code)}
				<div class="row" class:off={toggles && !shown}>
					{#if toggles}
						<button
							type="button"
							class="code toggle"
							aria-pressed={shown}
							aria-label={m.toggle_language({ language })}
							title={language}
							onclick={() => settings.toggleLanguage(code, languages)}
							>{TEXT_LANGUAGES[code].short}</button
						>
					{:else}
						<span class="code" title={language}>{TEXT_LANGUAGES[code].short}</span>
					{/if}
					{#if fonts.length > 1}
						<select
							value={settings.font(code).id}
							aria-label={m.text_font({ language })}
							style:font-family={settings.font(code).family}
							onchange={(e) => settings.setFont(code, e.currentTarget.value)}
						>
							{#each fonts as font (font.id)}
								<option value={font.id}>{font.name}</option>
							{/each}
						</select>
					{:else}
						<span class="font">{fonts[0].name}</span>
					{/if}
					<div class="size">
						<button
							type="button"
							aria-label={m.text_smaller_lang({ language })}
							disabled={settings.size(code) <= SIZE_MIN}
							onclick={() => settings.resize(code, -1)}><Minus /></button
						>
						<output>{percent(settings.size(code))}</output>
						<button
							type="button"
							aria-label={m.text_bigger_lang({ language })}
							disabled={settings.size(code) >= SIZE_MAX}
							onclick={() => settings.resize(code, 1)}><Plus /></button
						>
					</div>
				</div>
			{/each}
			{@render children?.()}
		</div>
	{/if}
</div>

<style>
	.text-settings {
		display: inline-flex;
	}

	.panel {
		position: fixed;
		z-index: 60;
		display: grid;
		gap: var(--space-3);
		width: min(24rem, calc(100vw - 24px));
		padding: var(--space-4);
		border: 1px solid var(--color-border, rgb(244 239 227 / 0.18));
		border-radius: var(--radius-md);
		background: var(--panel-bg, var(--color-surface));
		color: var(--color-text);
		box-shadow: 0 12px 40px rgb(0 0 0 / 0.35);
		text-align: start;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.reset {
		border: none;
		background: none;
		color: var(--color-accent-text, var(--color-accent));
		font-size: var(--text-sm);
		cursor: pointer;
	}

	.row {
		display: grid;
		grid-template-columns: 2.6rem minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--space-2);
	}

	.code {
		font-weight: 700;
		color: var(--color-accent-text, var(--color-accent));
	}

	.toggle {
		height: 32px;
		padding: 0;
		border: 1px solid currentColor;
		border-radius: var(--radius-pill);
		background: transparent;
		cursor: pointer;
	}

	.toggle[aria-pressed='false'] {
		color: var(--color-text-muted);
		border-style: dashed;
	}

	.row.off select,
	.row.off .size {
		opacity: 0.4;
	}

	select {
		min-width: 0;
		height: 36px;
		padding: 0 var(--space-2);
		border: 1px solid var(--color-border, rgb(244 239 227 / 0.25));
		border-radius: var(--radius-sm);
		background: transparent;
		color: inherit;
		font-size: 1rem;
	}

	select option {
		background: var(--panel-bg, var(--color-surface));
		color: var(--color-text);
	}

	.font {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.size {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.size button {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border: 1px solid var(--color-border, rgb(244 239 227 / 0.25));
		border-radius: 50%;
		background: transparent;
		color: inherit;
		cursor: pointer;
	}

	.size button:disabled {
		opacity: 0.35;
		cursor: default;
	}

	.size :global(svg) {
		width: 16px;
		height: 16px;
	}

	output {
		min-width: 3.4rem;
		text-align: center;
		font-variant-numeric: tabular-nums;
		font-size: var(--text-sm);
	}
</style>
