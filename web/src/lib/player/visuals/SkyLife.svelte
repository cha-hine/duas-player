<script lang="ts">
	// Life in the sky above and around the text, shared by every background: shooting stars
	// from the top corners, clouds drifting along the top, flocks of birds crossing it. Only
	// transform and opacity move, which the graphics chip does alone (light enough for TVs).
	let {
		stars = false,
		clouds = false,
		birds = false,
		cloudColour = '244 239 227'
	}: { stars?: boolean; clouds?: boolean; birds?: boolean; cloudColour?: string } = $props();

	/** Shooting stars from the top corners, flying outwards. */
	const SHOOTING = [
		{ x: 22, y: 6, angle: 160, delay: -1, every: 7 },
		{ x: 70, y: 4, angle: 18, delay: -4, every: 9 },
		{ x: 12, y: 16, angle: 150, delay: -6, every: 11 },
		{ x: 84, y: 12, angle: 25, delay: -2, every: 8 },
		{ x: 30, y: 2, angle: 165, delay: -9, every: 13 },
		{ x: 90, y: 22, angle: 30, delay: -5, every: 10 }
	];

	/** Clouds along the top band, each at its own height and pace. */
	const CLOUDS = [
		{ y: 2, size: 34, every: 150, delay: -20, opacity: 0.16 },
		{ y: 9, size: 24, every: 110, delay: -70, opacity: 0.12 },
		{ y: 5, size: 42, every: 190, delay: -130, opacity: 0.1 }
	];

	/** Flocks crossing the top of the sky, now and then. */
	const FLOCKS = [
		{ y: 13, every: 26, delay: -3, size: 1, reverse: false },
		{ y: 7, every: 34, delay: -19, size: 0.7, reverse: true }
	];
	/** Where each bird flies in its flock (V formation), in px. */
	const BIRDS = [
		[0, 0],
		[-18, 10],
		[-18, -10],
		[-36, 20],
		[-36, -20]
	];
</script>

{#if clouds}
	{#each CLOUDS as c, i (i)}
		<span
			class="cloud"
			style:top="{c.y}%"
			style:width="{c.size}vw"
			style:--colour={cloudColour}
			style:opacity={c.opacity}
			style:animation-duration="{c.every}s"
			style:animation-delay="{c.delay}s"
		></span>
	{/each}
{/if}

{#if birds}
	{#each FLOCKS as f, i (i)}
		<span
			class="flock"
			class:reverse={f.reverse}
			style:top="{f.y}%"
			style:--size={f.size}
			style:animation-duration="{f.every}s"
			style:animation-delay="{f.delay}s"
		>
			{#each BIRDS as [x, y], b (b)}
				<svg
					class="bird"
					viewBox="0 0 24 10"
					style:left="{x}px"
					style:top="{y}px"
					style:animation-delay="{-b * 0.13}s"
				>
					<path d="M1 6 Q6 0 12 6 Q18 0 23 6" fill="none" stroke="#0b1424" stroke-width="2" />
				</svg>
			{/each}
		</span>
	{/each}
{/if}

{#if stars}
	{#each SHOOTING as s, i (i)}
		<span
			class="shoot"
			style:left="{s.x}%"
			style:top="{s.y}%"
			style:--angle="{s.angle}deg"
			style:animation-duration="{s.every}s"
			style:animation-delay="{s.delay}s"
		></span>
	{/each}
{/if}

<style>
	.cloud,
	.flock,
	.bird,
	.shoot {
		position: absolute;
		pointer-events: none;
		will-change: transform, opacity;
	}

	/* A soft cloud: a few overlapping glows, no blur filter */
	.cloud {
		left: 0;
		aspect-ratio: 4 / 1;
		background:
			radial-gradient(ellipse 30% 60% at 30% 60%, rgb(var(--colour) / 0.9), transparent 70%),
			radial-gradient(ellipse 35% 75% at 55% 45%, rgb(var(--colour) / 0.9), transparent 70%),
			radial-gradient(ellipse 28% 55% at 78% 62%, rgb(var(--colour) / 0.8), transparent 70%);
		animation: cross linear infinite;
	}

	.flock {
		left: 0;
		width: 60px;
		height: 50px;
		scale: var(--size);
		animation: cross linear infinite;
	}

	.flock.reverse {
		animation-name: cross-back;
	}

	.flock.reverse .bird {
		scale: -1 1;
	}

	.bird {
		width: 22px;
		height: 10px;
		transform-origin: 50% 70%;
		animation: flap 0.55s ease-in-out infinite alternate;
	}

	/* A shooting star: a short trail crossing a corner of the sky now and then */
	.shoot {
		width: clamp(80px, 12vw, 180px);
		height: 2px;
		border-radius: 2px;
		background: linear-gradient(90deg, rgb(244 239 227 / 0), rgb(255 255 255 / 0.95));
		opacity: 0;
		transform-origin: 0 50%;
		animation: shoot linear infinite;
	}

	@keyframes cross {
		from {
			transform: translateX(-45vw);
		}
		to {
			transform: translateX(110vw);
		}
	}

	@keyframes cross-back {
		from {
			transform: translateX(110vw);
		}
		to {
			transform: translateX(-45vw);
		}
	}

	@keyframes flap {
		from {
			transform: scaleY(1);
		}
		to {
			transform: scaleY(0.35);
		}
	}

	@keyframes shoot {
		0% {
			opacity: 0;
			transform: rotate(var(--angle)) translateX(0) scaleX(0.3);
		}
		2% {
			opacity: 1;
		}
		9% {
			opacity: 0;
			transform: rotate(var(--angle)) translateX(24vmin) scaleX(1);
		}
		100% {
			opacity: 0;
			transform: rotate(var(--angle)) translateX(24vmin) scaleX(1);
		}
	}

	/* TVs: fewer moving things */
	:global([data-device='tv']) .shoot:nth-of-type(n + 4),
	:global([data-device='tv']) .flock:nth-of-type(2) {
		display: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.cloud,
		.flock,
		.bird {
			animation: none;
		}

		.flock,
		.shoot {
			display: none;
		}
	}
</style>
