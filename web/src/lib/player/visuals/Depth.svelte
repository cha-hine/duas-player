<script lang="ts">
	import { seeded } from './scenery.ts';
	import { boughSnow, foregroundShapes, H, HANGING, W, type ForegroundKind } from './foreground.ts';

	// Depth of field over a landscape: lights out of focus drifting at three distances (small and
	// sharp far away, large soft discs close to the camera) and blurred things in the corners,
	// right in front of the lens, swaying. Kept to the edges so the text stays clear; only
	// transform and opacity move, the blur is drawn once.
	type Props = {
		/** Colour of the lights, as "r g b". */
		light: string;
		/** Colour of the near silhouettes. */
		shade?: string;
		/** What stands (or hangs) in the corners, nearest first. */
		foreground?: ForegroundKind[];
		/** How many lights on each plane: far, middle, near. */
		lights?: [number, number, number];
		seed?: number;
	};
	let { light, shade = '#000', foreground = [], lights = [18, 12, 6], seed = 1 }: Props = $props();

	type Mote = {
		x: number;
		y: number;
		size: number;
		dx: number;
		dy: number;
		duration: number;
		pulse: number;
		delay: number;
	};

	/** Far lights may be anywhere but the middle; middle and near ones keep to the sides. */
	function motes(count: number, plane: 0 | 1 | 2, offset: number): Mote[] {
		const rand = seeded(seed * 31 + offset);
		return Array.from({ length: count }, (_, i) => {
			const side = i % 2 === 0;
			const x =
				plane === 0
					? rand() < 0.5
						? rand() * 28
						: 72 + rand() * 28
					: side
						? -6 + rand() * (plane === 2 ? 18 : 22)
						: 100 - (plane === 2 ? 12 : 22) + rand() * 22;
			const size = [3 + rand() * 4, 12 + rand() * 18, 70 + rand() * 90][plane];
			const reach = [30, 70, 140][plane];
			return {
				x,
				y: rand() * 100,
				size,
				dx: (rand() - 0.5) * reach,
				dy: -20 - rand() * reach,
				duration: [40, 26, 18][plane] + rand() * 20,
				pulse: 3 + rand() * 5,
				delay: -rand() * 40
			};
		});
	}

	// svelte-ignore state_referenced_locally
	const planes = [motes(lights[0], 0, 1), motes(lights[1], 1, 2), motes(lights[2], 2, 3)];
	// svelte-ignore state_referenced_locally
	const near = foreground.map((kind, i) => ({
		kind,
		hanging: HANGING.includes(kind),
		shapes: foregroundShapes(kind, seed * 7 + i),
		snow: kind === 'bough' ? boughSnow(seed * 7 + i) : '',
		// The first ones are nearest: larger and more blurred
		scale: 1 - i * 0.18,
		blur: 5 - i * 1.8,
		sway: 7 + i * 2.5
	}));
</script>

<div class="depth" aria-hidden="true" style:--light={light}>
	{#each planes as plane, p (p)}
		{#each plane as mote, i (i)}
			<span
				class="mote plane{p}"
				style:left="{mote.x}%"
				style:top="{mote.y}%"
				style:width="{mote.size}px"
				style:--dx="{mote.dx}px"
				style:--dy="{mote.dy}px"
				style:animation-duration="{mote.duration}s, {mote.pulse}s"
				style:animation-delay="{mote.delay}s, {mote.delay / 4}s"
			></span>
		{/each}
	{/each}

	{#each near as thing, i (i)}
		{#each ['left', 'right'] as side (side)}
			<div
				class="near {side}"
				class:hanging={thing.hanging}
				style:--scale={thing.scale}
				style:animation-duration="{thing.sway + (side === 'right' ? 1.3 : 0)}s"
				style:animation-delay="{-i * 1.7 - (side === 'right' ? 2.1 : 0)}s"
			>
				<svg
					viewBox="0 0 {W} {H}"
					preserveAspectRatio={thing.hanging ? 'xMinYMin meet' : 'xMinYMax meet'}
					style:filter="blur({thing.blur}px)"
				>
					<g fill={shade}>
						{#each thing.shapes as d, k (k)}<path {d} />{/each}
					</g>
					{#if thing.snow}<path d={thing.snow} fill="#e8eef6" opacity="0.85" />{/if}
				</svg>
			</div>
		{/each}
	{/each}
</div>

<style>
	.depth {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}

	/* Lights out of focus: a soft disc with a brighter rim, like a lens renders them */
	.mote {
		position: absolute;
		aspect-ratio: 1;
		border-radius: 50%;
		animation-name: wander, pulse;
		animation-timing-function: ease-in-out;
		animation-iteration-count: infinite;
		animation-direction: alternate;
		will-change: transform, opacity;
	}

	.plane0 {
		background: radial-gradient(circle, rgb(var(--light) / 0.95), rgb(var(--light) / 0) 70%);
	}

	.plane1 {
		background: radial-gradient(
			circle,
			rgb(var(--light) / 0.22) 0 52%,
			rgb(var(--light) / 0.4) 64%,
			rgb(var(--light) / 0) 71%
		);
	}

	.plane2 {
		background: radial-gradient(
			circle,
			rgb(var(--light) / 0.09) 0 50%,
			rgb(var(--light) / 0.16) 62%,
			rgb(var(--light) / 0) 71%
		);
	}

	/* Close to the lens, blurred, in the corners; swaying in the wind and drifting with the
	   camera more than the landscape behind */
	.near {
		position: absolute;
		bottom: 0;
		width: calc(clamp(180px, 34vw, 640px) * var(--scale));
		animation: near-sway ease-in-out infinite alternate;
		transform-origin: 0 100%;
		will-change: transform;
	}

	.near svg {
		display: block;
		width: 100%;
		height: auto;
		overflow: visible;
	}

	.near.left {
		left: -2%;
	}

	.near.right {
		right: -2%;
		transform-origin: 100% 100%;
		animation-name: near-sway-right;
	}

	.near.hanging {
		top: 0;
		bottom: auto;
		transform-origin: 0 0;
	}

	.near.hanging.right {
		transform-origin: 100% 0;
	}

	.near.right svg {
		transform: scaleX(-1);
	}

	@keyframes wander {
		from {
			transform: translate(0, 0);
		}
		to {
			transform: translate(var(--dx), var(--dy));
		}
	}

	@keyframes pulse {
		from {
			opacity: 0.35;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes near-sway {
		from {
			transform: translateX(-1.2%) rotate(-1.6deg);
		}
		to {
			transform: translateX(1.2%) rotate(1.4deg);
		}
	}

	@keyframes near-sway-right {
		from {
			transform: translateX(1.2%) rotate(1.6deg);
		}
		to {
			transform: translateX(-1.2%) rotate(-1.4deg);
		}
	}

	/* TVs: a third of the lights, and the blur (costly on their chips) goes */
	:global([data-device='tv']) .mote:not(:nth-of-type(3n)) {
		display: none;
	}

	:global([data-device='tv']) .near svg {
		filter: none !important;
	}

	@media (prefers-reduced-motion: reduce) {
		.mote,
		.near {
			animation: none;
		}
	}
</style>
