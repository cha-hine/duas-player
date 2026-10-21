<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import { TEXT_LANGUAGES } from '#lib/text-languages.ts';
	import type { Draft } from './draft.svelte.ts';
	import { clock } from './time.ts';
	import Waveform from './Waveform.svelte';

	// Fine-tuning: move each line's start on the waveform or by small steps, and replay a line.
	type Props = {
		draft: Draft;
		audio: HTMLAudioElement;
		time: number;
		samples: Float32Array | null;
		sampleRate: number;
	};
	let { draft, audio, time, samples, sampleRate }: Props = $props();

	const ZOOM_SECONDS = 10;

	let selected = $state(0);
	/** While replaying one line: where to stop. */
	let stopAt = $state<number | null>(null);

	const start = $derived(draft.starts[selected] ?? 0);
	const end = $derived(draft.lines[selected]?.end ?? start + 5);
	const zoomFrom = $derived(Math.max(0, start - 4));
	const line = $derived(draft.lines[selected]);

	$effect(() => {
		if (stopAt !== null && time >= stopAt) {
			audio.pause();
			stopAt = null;
		}
	});

	/** Sets a line's start, kept between its neighbours. */
	function setStart(index: number, value: number) {
		const min = index > 0 ? (draft.starts[index - 1] ?? 0) + 0.05 : 0;
		const max = draft.starts[index + 1] != null ? draft.starts[index + 1]! - 0.05 : draft.duration;
		draft.starts[index] = Math.round(Math.min(max, Math.max(min, value)) * 100) / 100;
	}

	const nudge = (delta: number) => setStart(selected, start + delta);

	function playLine() {
		audio.currentTime = start;
		stopAt = end;
		audio.play();
	}

	function select(index: number) {
		selected = Math.min(draft.count - 1, Math.max(0, index));
	}

	/** Clicking the overview selects the line playing at that moment. */
	function pick(t: number) {
		audio.currentTime = t;
		let index = 0;
		draft.starts.forEach((s, i) => {
			if (s !== null && s <= t) index = i;
		});
		select(index);
	}

	function onkeydown(event: KeyboardEvent) {
		const target = event.target as HTMLElement;
		if (target.closest('input, textarea, select')) return;
		const step = event.shiftKey ? 0.5 : 0.1;
		const keys: Record<string, () => void> = {
			ArrowLeft: () => nudge(-step),
			ArrowRight: () => nudge(step),
			ArrowUp: () => select(selected - 1),
			ArrowDown: () => select(selected + 1),
			Enter: playLine
		};
		if (keys[event.key]) {
			event.preventDefault();
			keys[event.key]();
		}
	}
</script>

<svelte:window {onkeydown} />

<section class="step">
	{#if !draft.complete}
		<p class="alert">
			{draft.count - draft.syncedCount} ligne(s) ne sont pas encore synchronisées : terminez l'étape «
			Synchroniser » avant d'ajuster.
		</p>
	{/if}

	<p class="help">
		Sélectionnez une ligne, puis faites glisser son repère doré sur la forme d'onde zoomée, ou
		utilisez
		<kbd>←</kbd> <kbd>→</kbd> (0,1 s, avec <kbd>Maj</kbd> : 0,5 s). <kbd>↑</kbd> <kbd>↓</kbd>
		changent de ligne,
		<kbd>Entrée</kbd> réécoute la ligne.
	</p>

	{#if samples}
		<Waveform
			{samples}
			{sampleRate}
			from={0}
			to={draft.duration}
			starts={draft.starts}
			{selected}
			playhead={time}
			height={70}
			onpick={pick}
		/>
		<Waveform
			{samples}
			{sampleRate}
			from={zoomFrom}
			to={zoomFrom + ZOOM_SECONDS}
			starts={draft.starts}
			{selected}
			playhead={time}
			height={140}
			onpick={(t) => (audio.currentTime = t)}
			onmove={setStart}
		/>
	{:else}
		<p class="help">Préparation de la forme d'onde…</p>
	{/if}

	<div class="current">
		<div class="text">
			<small>Ligne {selected + 1} · {clock(start)} → {clock(end)}</small>
			{#if line}
				{#each draft.languages as code (code)}
					{#if line[code]}<p
							lang={TEXT_LANGUAGES[code].lang}
							dir={TEXT_LANGUAGES[code].dir}
							class:ar={code === 'ar'}
						>
							{line[code]}
						</p>{/if}
				{/each}
			{/if}
		</div>
		<div class="controls">
			<Button variant="secondary" onclick={() => select(selected - 1)} disabled={selected === 0}
				>◀ Ligne</Button
			>
			<Button variant="secondary" onclick={() => nudge(-0.5)}>−0,5 s</Button>
			<Button variant="secondary" onclick={() => nudge(-0.1)}>−0,1 s</Button>
			<Button onclick={playLine}>▶ Écouter la ligne</Button>
			<Button variant="secondary" onclick={() => nudge(0.1)}>+0,1 s</Button>
			<Button variant="secondary" onclick={() => nudge(0.5)}>+0,5 s</Button>
			<Button
				variant="secondary"
				onclick={() => select(selected + 1)}
				disabled={selected >= draft.count - 1}>Ligne ▶</Button
			>
		</div>
	</div>

	<ol class="list">
		{#each draft.lines as l, i (i)}
			<li>
				<button type="button" class:selected={i === selected} onclick={() => select(i)}>
					<span class="time">{draft.starts[i] === null ? '—' : clock(draft.starts[i]!)}</span>
					<span dir="auto">{l[draft.languages[0]]}</span>
				</button>
			</li>
		{/each}
	</ol>
</section>

<style>
	.step {
		display: grid;
		gap: var(--space-4);
	}

	.help {
		color: var(--color-text-muted);
		max-width: 60rem;
	}

	.alert {
		padding: var(--space-3) var(--space-4);
		border: 1px solid #e5806b;
		border-radius: var(--radius-sm);
	}

	kbd {
		padding: 1px 6px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 0.85em;
	}

	.current {
		display: grid;
		gap: var(--space-4);
		padding: var(--space-4);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		border: 1px solid var(--color-accent);
	}

	.text {
		display: grid;
		gap: var(--space-1);
	}

	.text p {
		text-align: start;
	}

	small {
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;
	}

	.ar {
		font-family: var(--font-arabic);
		font-size: 1.5rem;
		line-height: 1.8;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.list {
		display: grid;
		gap: 2px;
		max-height: 20rem;
		overflow-y: auto;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.list button {
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

	.list button:hover,
	.list button.selected {
		background: color-mix(in srgb, var(--color-accent) 14%, transparent);
	}

	.time {
		flex: none;
		width: 5rem;
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;
	}
</style>
