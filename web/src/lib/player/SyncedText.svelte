<script lang="ts">
	import { fade } from 'svelte/transition';
	import { name } from '#lib/media.ts';
	import {
		isSynced,
		lineLanguages,
		TEXT_LANGUAGES,
		type TextLanguage
	} from '#lib/text-languages.ts';
	import { surahOfTrack, verseMark } from '#lib/quran.ts';
	import { translations } from '#lib/translations.svelte.ts';
	import { player } from './player.svelte.ts';
	import { settings } from './settings.svelte.ts';
	import { energyAt, lineAt } from './sync.ts';

	// The line being recited, in each language the listener chose, following the audio frame
	// by frame. Words appear one after another, and the line glows softly with the voice. Each
	// line is sized to fill the space it has: short verses large, long ones smaller.
	const LEAD = 0.15;
	/** Range of the automatic size, around the listener's own size for each language. */
	const FIT_MIN = 0.35;
	const FIT_MAX = 1.5;
	/** The previous line fades out this fast; the new one's words wait for it. */
	const OUT_MS = 200;

	let time = $state(player.time);
	let box = $state<HTMLElement>();

	$effect(() => {
		let frame = 0;
		let glow = 0;
		// On a TV, the large text would be redrawn every frame to glow: it stays still there
		const breathe = document.documentElement.dataset.device !== 'tv';
		const tick = () => {
			time = player.time;
			if (breathe) {
				// Rise with the voice, fall back gently; written straight to CSS, no re-render
				const target = energyAt(player.energy, time);
				glow += (target - glow) * (target > glow ? 0.2 : 0.05);
				box?.style.setProperty('--energy', glow.toFixed(3));
			}
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
	/** The surah recited, for the translation the listener chose. */
	const surah = $derived(item ? surahOfTrack(item.slug) : null);
	const say = (from: typeof line, code: TextLanguage) =>
		from ? (translations.text(from, code, surah) ?? '') : '';

	$effect(() => {
		if (surah) void translations.load(surah);
	});

	const words = (text: string) => text.trim().split(/\s+/);

	/**
	 * The largest size at which the current line (and the next one, below it) fits the stage.
	 * Trial sizes are measured on an invisible copy without the words' animations: on the
	 * animated text the browser would only restyle a frame later, and the line would flicker.
	 * Done before the line is drawn, then written straight to CSS, no re-render.
	 */
	function fit() {
		const stage = box?.parentElement;
		const slide = box?.querySelector<HTMLElement>(`.slide[data-line="${index}"]`);
		if (!box || !stage || !slide) return;
		const style = getComputedStyle(stage);
		const room =
			stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);

		const probe = box.cloneNode(false) as HTMLElement;
		probe.style.cssText = `position: absolute; inset: 0 auto auto 0; width: ${box.clientWidth}px; visibility: hidden; pointer-events: none`;
		probe.append(slide.cloneNode(true));
		const next = box.querySelector('.next');
		if (next) probe.append(next.cloneNode(true));
		for (const el of probe.querySelectorAll<HTMLElement>('*')) {
			el.style.animation = 'none';
			el.style.transition = 'none';
		}
		stage.append(probe);
		let low = FIT_MIN;
		let high = FIT_MAX;
		for (let i = 0; i < 7; i++) {
			const mid = (low + high) / 2;
			probe.style.setProperty('--fit', mid.toFixed(3));
			if (probe.offsetHeight <= room) low = mid;
			else high = mid;
		}
		probe.remove();
		// On the line itself (and its follower): the previous line, fading out, keeps its size
		slide.style.setProperty('--fit', low.toFixed(3));
		box.querySelector<HTMLElement>('.next')?.style.setProperty('--fit', low.toFixed(3));
	}

	$effect(() => {
		// Again for each line and each change of languages, fonts or sizes; then whenever fonts
		// arrive (the fallback font is much taller than Amiri) and when the screen changes
		void [index, languages, settings.fonts, settings.sizes];
		fit();
		const fonts = document.fonts;
		fonts?.addEventListener('loadingdone', fit);
		const stage = box?.parentElement;
		let first = true;
		const observer = new ResizeObserver(() => {
			// Observing reports the current size once: not a change
			if (!first) fit();
			first = false;
		});
		if (stage) observer.observe(stage);
		return () => {
			fonts?.removeEventListener('loadingdone', fit);
			observer.disconnect();
		};
	});

	const textStyle = (code: TextLanguage) => ({
		font: settings.font(code).family,
		scale: settings.scale(code)
	});
</script>

<div class="synced" bind:this={box}>
	{#key line ? index : -1}
		<div class="slide" data-line={line ? index : -1} out:fade={{ duration: OUT_MS }}>
			{#if line}
				{#each languages.filter((code) => say(line, code).trim()) as code, row (code)}
					{@const lang = TEXT_LANGUAGES[code]}
					{@const look = textStyle(code)}
					<p
						class="text"
						class:primary={row === 0}
						class:second={row === 1}
						lang={lang.lang}
						dir={lang.dir}
						style:font-family={look.font}
						style:--scale={look.scale}
						style:--row={row}
					>
						{#each words(say(line, code)) as word, i (i)}
							<span class="word" style:--i={i}>{word}</span>
						{/each}
						{#if code === 'ar' && line.n}
							<span class="word mark" style:--i={words(line.ar ?? '').length}
								>{verseMark(line.n)}</span
							>
						{/if}
					</p>
				{/each}
			{:else if item}
				<p
					class="text primary"
					lang="ar"
					dir="rtl"
					style:font-family={settings.font('ar').family}
					style:--scale={settings.scale('ar')}
				>
					<span class="word">{item.title_ar}</span>
				</p>
				<p
					class="text second"
					lang="fr"
					style:font-family={settings.font('fr').family}
					style:--scale={settings.scale('fr')}
					style:--row={1}
				>
					<span class="word">{item.title_fr}</span>
				</p>
				{#if item.reciter}<p class="reciter"><bdi>{name(item.reciter)}</bdi></p>{/if}
			{/if}
		</div>
	{/key}
	{#if next && languages[0]}
		{#key index}
			<p
				class="next"
				in:fade={{ duration: 600, delay: 600 }}
				dir="auto"
				style:font-family={settings.font(languages[0]).family}
				style:--scale={settings.scale(languages[0])}
			>
				{say(next, languages[0])}
			</p>
		{/key}
	{/if}
</div>

<style>
	.synced {
		--energy: 0;
		--fit: 1;
		--scale: 1;
		display: grid;
		justify-items: center;
		gap: clamp(1rem, 3vh, 2rem);
		width: min(100%, 68rem);
		text-align: center;
	}

	/* Old and new lines overlap during the change instead of pushing each other; the languages
	   of a line are well apart */
	.slide {
		grid-area: 1 / 1;
		display: grid;
		gap: clamp(0.9rem, 3.2vh, 2.4rem);
	}

	.text {
		font-size: calc(clamp(1.1rem, 2.2vw, 1.6rem) * var(--scale) * var(--fit));
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
		font-size: calc(clamp(1.9rem, 4.6vw, 3.6rem) * var(--scale) * var(--fit));
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
		animation-delay: calc(200ms + var(--row, 0) * 250ms + var(--i, 0) * 70ms);
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

	.word.mark {
		color: var(--sakina-gold);
	}

	.reciter {
		color: var(--sakina-mist);
	}

	.next {
		grid-area: 2 / 1;
		max-width: 40rem;
		color: rgb(244 239 227 / 0.4);
		font-size: calc(1rem * var(--scale) * var(--fit));
	}

	/* TVs: words fade in without blur (costly on their graphics chips), the line stays still */
	:global([data-device='tv']) .word {
		animation-name: word-in-plain;
	}

	:global([data-device='tv']) .primary {
		transition: none;
	}

	@keyframes word-in-plain {
		from {
			opacity: 0;
			transform: translateY(0.4em);
		}
		to {
			opacity: 1;
			transform: none;
		}
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
