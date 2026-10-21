<script lang="ts">
	import { fade } from 'svelte/transition';
	import { name } from '#lib/media.ts';
	import { isSynced, lineLanguages, TEXT_LANGUAGES } from '#lib/text-languages.ts';
	import { player } from './player.svelte.ts';
	import { settings } from './settings.svelte.ts';
	import { energyAt, lineAt } from './sync.ts';

	// The line being recited, in each language the listener chose, following the audio frame
	// by frame. Words appear one after another, and the line glows softly with the voice.
	const LEAD = 0.15;

	let time = $state(player.time);
	let box = $state<HTMLElement>();

	$effect(() => {
		let frame = 0;
		let glow = 0;
		const tick = () => {
			time = player.time;
			// Rise with the voice, fall back gently; written straight to CSS, no re-render
			const target = energyAt(player.energy, time);
			glow += (target - glow) * (target > glow ? 0.2 : 0.05);
			box?.style.setProperty('--energy', glow.toFixed(3));
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});

	const synced = $derived(isSynced(player.lines));
	const languages = $derived(settings.visible(lineLanguages(player.lines)));
	const index = $derived(synced ? lineAt(player.lines, time + LEAD) : -1);
	const line = $derived(index >= 0 ? player.lines[index] : null);
	const next = $derived(line ? (player.lines[index + 1] ?? null) : null);
	const item = $derived(player.current);

	const words = (text: string) => text.trim().split(/\s+/);
</script>

<div class="synced" bind:this={box} style:--scale={settings.textScale}>
	{#key line ? index : -1}
		<div class="slide" out:fade={{ duration: 300 }}>
			{#if line}
				{#each languages.filter((code) => line[code]?.trim()) as code, row (code)}
					{@const lang = TEXT_LANGUAGES[code]}
					<p
						class="text"
						class:primary={row === 0}
						class:second={row === 1}
						lang={code}
						dir={lang.dir}
						style:font-family={lang.font}
						style:--row={row}
					>
						{#each words(line[code] ?? '') as word, i (i)}
							<span class="word" style:--i={i}>{word}</span>
						{/each}
					</p>
				{/each}
			{:else if item}
				<p class="text primary" lang="ar" dir="rtl" style:font-family="var(--font-quran)">
					<span class="word">{item.title_ar}</span>
				</p>
				<p class="text second" lang="fr" style:--row={1}>
					<span class="word">{item.title_fr}</span>
				</p>
				{#if item.reciter}<p class="reciter"><bdi>{name(item.reciter)}</bdi></p>{/if}
			{/if}
		</div>
	{/key}
	{#if next}
		{#key index}
			<p class="next" in:fade={{ duration: 600, delay: 600 }} dir="auto">
				{next[languages[0]] ?? ''}
			</p>
		{/key}
	{/if}
</div>

<style>
	.synced {
		--energy: 0;
		display: grid;
		justify-items: center;
		gap: var(--space-5);
		width: min(100%, 64rem);
		text-align: center;
	}

	/* Old and new lines overlap during the change instead of pushing each other */
	.slide {
		grid-area: 1 / 1;
		display: grid;
		gap: var(--space-3);
	}

	.text {
		font-size: calc(clamp(1.1rem, 2.2vw, 1.6rem) * var(--scale));
		line-height: 1.6;
		color: rgb(244 239 227 / 0.8);
		text-shadow: 0 2px 16px rgb(0 0 0 / 0.45);
	}

	/* Second language in gold, the next ones in soft ivory */
	.second {
		color: var(--sakina-gold);
	}

	/* First language: large, and it breathes with the reciter's voice */
	.primary {
		font-size: calc(clamp(1.9rem, 4.6vw, 3.6rem) * var(--scale));
		line-height: 1.9;
		color: var(--sakina-ivory);
		text-shadow:
			0 2px 24px rgb(0 0 0 / 0.45),
			0 0 calc(4px + var(--energy) * 28px) rgb(201 162 75 / calc(var(--energy) * 0.55));
		transform: scale(calc(1 + var(--energy) * 0.015));
		transition: transform 120ms linear;
	}

	/* Words appear one after another, each language starting a little after the previous */
	.word {
		display: inline-block;
		margin-inline: 0.12em;
		opacity: 0;
		animation: word-in 650ms cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
		animation-delay: calc(var(--row, 0) * 250ms + var(--i, 0) * 70ms);
	}

	@keyframes word-in {
		from {
			opacity: 0;
			transform: translateY(0.4em);
			filter: blur(4px);
		}
		to {
			opacity: 1;
			transform: none;
			filter: none;
		}
	}

	.reciter {
		color: var(--sakina-mist);
	}

	.next {
		grid-area: 2 / 1;
		max-width: 40rem;
		color: rgb(244 239 227 / 0.4);
		font-size: calc(1rem * var(--scale));
	}

	@media (prefers-reduced-motion: reduce) {
		.word {
			opacity: 1;
			animation: none;
		}

		.primary {
			transform: none;
		}
	}
</style>
