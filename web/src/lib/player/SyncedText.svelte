<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { name } from '#lib/media.ts';
	import { player } from './player.svelte.ts';
	import { settings } from './settings.svelte.ts';
	import { lineAt } from './sync.ts';

	// Shows the line being recited, Arabic above French, following the audio frame by frame.
	// A small lead makes the text appear as the voice starts rather than just after.
	const LEAD = 0.15;

	let time = $state(player.time);

	$effect(() => {
		let frame = 0;
		const tick = () => {
			time = player.time;
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});

	const index = $derived(lineAt(player.lines, time + LEAD));
	const line = $derived(index >= 0 ? player.lines[index] : null);
	const next = $derived(player.lines[index + 1] ?? null);
	const item = $derived(player.current);
</script>

<div class="synced" style:--scale={settings.textScale}>
	{#key line ? index : -1}
		<div class="slide" in:fly={{ y: 24, duration: 700, delay: 150 }} out:fade={{ duration: 250 }}>
			{#if line}
				{#if settings.showArabic && line.ar}<p class="ar" lang="ar" dir="rtl">{line.ar}</p>{/if}
				{#if settings.showFrench && line.fr}<p class="fr" lang="fr" dir="ltr">{line.fr}</p>{/if}
			{:else if item}
				<p class="ar" lang="ar" dir="rtl">{item.title_ar}</p>
				<p class="fr" lang="fr" dir="ltr">{item.title_fr}</p>
				{#if item.reciter}<p class="reciter"><bdi>{name(item.reciter)}</bdi></p>{/if}
			{/if}
		</div>
	{/key}
	{#if next && line}
		{#key index}
			<p class="next" in:fade={{ duration: 600, delay: 400 }} dir="auto">
				{settings.showArabic && next.ar ? next.ar : next.fr}
			</p>
		{/key}
	{/if}
</div>

<style>
	.synced {
		display: grid;
		justify-items: center;
		gap: var(--space-5);
		width: min(100%, 60rem);
		text-align: center;
	}

	/* Old and new lines overlap during the transition instead of pushing each other */
	.slide {
		grid-area: 1 / 1;
		display: grid;
		gap: var(--space-4);
	}

	.ar {
		font-family: var(--font-quran);
		font-size: calc(clamp(1.9rem, 4.6vw, 3.6rem) * var(--scale));
		line-height: 1.9;
		color: var(--sakina-ivory);
		text-shadow: 0 2px 24px rgb(0 0 0 / 0.45);
	}

	.fr {
		font-family: var(--font-display-latin);
		font-size: calc(clamp(1.15rem, 2.2vw, 1.7rem) * var(--scale));
		line-height: 1.5;
		color: var(--sakina-gold);
		text-shadow: 0 2px 16px rgb(0 0 0 / 0.45);
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
</style>
