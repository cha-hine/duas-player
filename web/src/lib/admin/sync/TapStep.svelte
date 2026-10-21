<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import { TEXT_LANGUAGES, type Line } from '#lib/text-languages.ts';
	import type { Draft } from './draft.svelte.ts';
	import { clock } from './time.ts';

	// Tap-to-sync: the audio plays and each tap marks the start of the next line.
	let {
		draft,
		audio,
		time,
		paused
	}: { draft: Draft; audio: HTMLAudioElement; time: number; paused: boolean } = $props();

	/** People tap a little after hearing the words start. */
	const REACTION = 0.2;

	/** Index of the next line to mark. */
	// svelte-ignore state_referenced_locally
	let cursor = $state(Math.min(draft.syncedCount, draft.count));
	let rate = $state(1);

	const done = $derived(draft.count > 0 && cursor >= draft.count);
	const marked: Line | null = $derived(cursor > 0 ? draft.lines[cursor - 1] : null);
	const upcoming: Line | null = $derived(cursor < draft.count ? draft.lines[cursor] : null);

	$effect(() => {
		audio.playbackRate = rate;
	});

	function startOver() {
		if (draft.syncedCount && !confirm('Effacer la synchronisation existante et recommencer ?'))
			return;
		draft.starts = draft.starts.map(() => null);
		cursor = 0;
		audio.currentTime = 0;
		audio.play();
	}

	function mark() {
		if (done) return;
		if (audio.paused) {
			audio.play();
			return;
		}
		const previous = cursor > 0 ? (draft.starts[cursor - 1] ?? 0) : 0;
		const at = Math.max(cursor > 0 ? previous + 0.05 : 0, audio.currentTime - REACTION);
		draft.starts[cursor] = Math.round(at * 100) / 100;
		cursor++;
		if (cursor >= draft.count) audio.pause();
	}

	function undo() {
		if (cursor === 0) return;
		cursor--;
		draft.starts[cursor] = null;
		audio.currentTime = Math.max(0, (cursor > 0 ? (draft.starts[cursor - 1] ?? 0) : 0) - 1);
	}

	/** Re-sync from line `i`: replays from a little before the previous line. */
	function resumeAt(i: number) {
		cursor = i;
		for (let k = i; k < draft.starts.length; k++) draft.starts[k] = null;
		audio.currentTime = Math.max(0, (i > 0 ? (draft.starts[i - 1] ?? 0) : 0) - 1);
		audio.play();
	}

	function onkeydown(event: KeyboardEvent) {
		const target = event.target as HTMLElement;
		if (target.closest('input, textarea, select')) return;
		if (event.key === ' ' || event.key === 'Enter') {
			event.preventDefault();
			mark();
		} else if (event.key === 'Backspace') {
			event.preventDefault();
			undo();
		}
	}
</script>

<svelte:window {onkeydown} />

{#snippet show(line: Line | null)}
	{#if line}
		{#each draft.languages as code (code)}
			{#if line[code]}
				<p lang={TEXT_LANGUAGES[code].lang} dir={TEXT_LANGUAGES[code].dir} class:ar={code === 'ar'}>
					{line[code]}
				</p>
			{/if}
		{/each}
	{:else}
		<p class="muted">—</p>
	{/if}
{/snippet}

<section class="step">
	<p class="help">
		Lancez l'audio, puis appuyez sur <kbd>Espace</kbd> (ou le grand bouton)
		<strong>au moment où chaque ligne commence</strong>. <kbd>Retour arrière</kbd> annule la dernière
		ligne. Un léger décalage compense le temps de réaction ; vous affinerez à l'étape suivante.
	</p>

	<div class="bar">
		<Button variant="secondary" onclick={startOver}>Recommencer au début</Button>
		<Button variant="secondary" onclick={() => (audio.paused ? audio.play() : audio.pause())}>
			{paused ? 'Lecture' : 'Pause'}
		</Button>
		<label class="rate">
			Vitesse
			<select bind:value={rate}>
				<option value={0.75}>0,75×</option>
				<option value={1}>1×</option>
			</select>
		</label>
		<span class="clock">{clock(time)}</span>
		<span class="progress">{Math.min(cursor, draft.count)} / {draft.count} lignes</span>
	</div>

	<div class="stage">
		<div class="panel">
			<small>Ligne en cours {cursor > 0 ? `(${cursor})` : ''}</small>
			{@render show(marked)}
		</div>
		<div class="panel next">
			<small>{done ? 'Terminé' : `Prochaine ligne (${cursor + 1})`}</small>
			{#if done}
				<p>Toutes les lignes sont synchronisées. Passez à l'étape « Ajuster ».</p>
			{:else}
				{@render show(upcoming)}
			{/if}
		</div>
	</div>

	<div class="actions">
		<button class="tap" type="button" onclick={mark} disabled={done || draft.count === 0}>
			{paused && !done ? 'Lancer' : 'Ligne suivante'} <kbd>Espace</kbd>
		</button>
		<Button variant="ghost" onclick={undo} disabled={cursor === 0}>Annuler la dernière</Button>
	</div>

	<details>
		<summary>Reprendre à partir d'une ligne</summary>
		<ol>
			{#each draft.lines as line, i (i)}
				<li>
					<button type="button" onclick={() => resumeAt(i)}>
						<span class="time">{draft.starts[i] === null ? '—' : clock(draft.starts[i]!)}</span>
						<span lang={draft.languages[0]} dir="auto">{line[draft.languages[0]]}</span>
					</button>
				</li>
			{/each}
		</ol>
	</details>
</section>

<style>
	.step {
		display: grid;
		gap: var(--space-5);
	}

	.help {
		color: var(--color-text-muted);
		max-width: 60rem;
	}

	kbd {
		padding: 1px 6px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.85em;
	}

	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
	}

	.rate {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-sm);
	}

	select {
		min-height: 36px;
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}

	.clock,
	.progress {
		font-variant-numeric: tabular-nums;
		color: var(--color-text-muted);
	}

	.stage {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
		gap: var(--space-4);
	}

	.panel {
		display: grid;
		align-content: start;
		gap: var(--space-2);
		min-height: 10rem;
		padding: var(--space-4);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
	}

	.panel.next {
		border-color: var(--color-accent);
	}

	.panel p {
		text-align: start;
	}

	.ar {
		font-family: var(--font-arabic);
		font-size: 1.6rem;
		line-height: 1.8;
	}

	.muted,
	small {
		color: var(--color-text-muted);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
	}

	.tap {
		flex: 1;
		min-height: 88px;
		border: none;
		border-radius: var(--radius-lg);
		background: var(--color-accent);
		color: var(--color-on-accent);
		font-size: var(--text-xl);
		font-weight: 700;
		cursor: pointer;
	}

	.tap:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.tap kbd {
		border-color: currentColor;
	}

	details summary {
		cursor: pointer;
		font-weight: 600;
	}

	ol {
		display: grid;
		gap: 2px;
		max-height: 18rem;
		overflow-y: auto;
		margin: var(--space-3) 0 0;
		padding: 0;
		list-style: none;
	}

	ol button {
		display: flex;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-2);
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--color-text);
		text-align: start;
		cursor: pointer;
	}

	ol button:hover {
		background: var(--color-surface);
	}

	.time {
		flex: none;
		width: 5rem;
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;
	}
</style>
