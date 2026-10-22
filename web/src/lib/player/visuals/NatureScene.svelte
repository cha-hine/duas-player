<script lang="ts" module>
	export const SCENES = ['montagnes', 'mer', 'dunes'] as const;
	export type Scene = (typeof SCENES)[number];
</script>

<script lang="ts">
	// Calm landscapes for the immersive player. The scenery frames the screen (sides and
	// bottom) and the middle stays open sky, so nothing stands behind the text. Life comes from
	// small layers that only move by transform or opacity, which the graphics chip does alone
	// (light enough for TVs): shooting stars, falling leaves, light rays, fireflies, glints.
	// The main light swells softly with the reciter's voice.
	let { scene, level }: { scene: Scene; level: () => number } = $props();

	let glow = $state<HTMLElement>();

	$effect(() => {
		if (!glow) return;
		let frame = 0;
		let energy = 0;
		const tick = () => {
			const target = level();
			energy += (target - energy) * (target > energy ? 0.15 : 0.04);
			glow!.style.opacity = (0.4 + energy * 0.6).toFixed(3);
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});

	/** The same "random" scenery every time. */
	function seeded(seed: number) {
		return () => {
			seed = (seed * 16807) % 2147483647;
			return (seed - 1) / 2147483646;
		};
	}

	/** Stars around the edges of the sky (none in the middle, where the text is). */
	function stars(seed: number, count: number): [number, number, number][] {
		const rand = seeded(seed);
		const out: [number, number, number][] = [];
		while (out.length < count) {
			const x = rand() * 1600;
			const y = rand() * 620;
			if (x > 360 && x < 1240 && y > 110) continue;
			out.push([x, y, 0.6 + rand() * 1.5]);
		}
		return out;
	}

	/** Pine trees standing on a slope, as one path (side scenery, 500 × 700). */
	function pines(seed: number, from: number, to: number, baseAt: (x: number) => number) {
		const rand = seeded(seed);
		let d = '';
		for (let x = from; x < to; x += 16 + rand() * 26) {
			const base = baseAt(x) + rand() * 8;
			const h = 50 + rand() * 70;
			const w = h * 0.3;
			d += `M${x.toFixed(0)} ${base.toFixed(0)}l${w.toFixed(0)} ${(-h).toFixed(0)}l${w.toFixed(0)} ${h.toFixed(0)}z`;
		}
		return d;
	}

	/** Moving things along the left and right edges, each with its own rhythm. */
	function particles(seed: number, count: number) {
		const rand = seeded(seed);
		return Array.from({ length: count }, (_, i) => ({
			x: i % 2 === 0 ? 1 + rand() * 20 : 79 + rand() * 20,
			y: rand() * 100,
			duration: 9 + rand() * 9,
			delay: -rand() * 18,
			sway: 2 + rand() * 3,
			drift: 20 + rand() * 50,
			size: 14 + rand() * 14,
			hue: i % 3
		}));
	}

	/** Shooting stars from the top corners, flying outwards. */
	const SHOOTING = [
		{ x: 22, y: 6, angle: 160, delay: -1, every: 11 },
		{ x: 70, y: 4, angle: 18, delay: -6, every: 13 },
		{ x: 12, y: 16, angle: 150, delay: -9, every: 17 },
		{ x: 84, y: 12, angle: 25, delay: -3, every: 19 }
	];

	const LEAF_COLOURS = ['#c9a24b', '#b8642f', '#8f3b2b'];
	const leaves = particles(21, 12);
	const fireflies = particles(33, 16);
	const skyStars = { mer: stars(3, 70), dunes: stars(11, 90), montagnes: stars(5, 36) };

	const hill = (x: number) => 430 + x * 0.24 + (x > 300 ? (x - 300) * 0.5 : 0);
	const pinesLeft = pines(7, -10, 400, hill);
	const pinesRight = pines(17, -10, 400, hill);
</script>

{#snippet starsSvg(list: [number, number, number][])}
	<svg class="layer" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
		{#each list as [x, y, r], i (i)}
			<circle cx={x} cy={y} {r} fill="#f4efe3" opacity={0.35 + (i % 4) * 0.12} />
		{/each}
	</svg>
	<svg class="layer twinkle" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
		{#each list.filter((_, i) => i % 5 === 0) as [x, y, r], i (i)}
			<circle cx={x} cy={y} r={r * 1.3} fill="#fff" />
		{/each}
	</svg>
{/snippet}

{#snippet shootingStars()}
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
{/snippet}

<div class="scene {scene}" aria-hidden="true">
	{#if scene === 'montagnes'}
		{@render starsSvg(skyStars.montagnes)}
		<div class="glow sunrise" bind:this={glow}></div>
		<div class="rays"></div>
		<div class="rays right"></div>
		{@render shootingStars()}
		<svg class="side left" viewBox="0 0 500 700" preserveAspectRatio="xMinYMax meet">
			<path
				d="M0 700 V250 L90 170 L170 255 L240 205 L320 290 L390 360 L450 470 L490 640 L496 700Z"
				fill="#34405a"
			/>
			<path d="M0 700 V420 C120 390 260 430 380 520 C430 560 470 620 500 700Z" fill="#1f2f47" />
			<path d={pinesLeft} fill="#0f1f33" />
		</svg>
		<svg class="side right" viewBox="0 0 500 700" preserveAspectRatio="xMinYMax meet">
			<path
				d="M0 700 V300 L110 200 L200 290 L280 240 L360 330 L430 450 L480 620 L490 700Z"
				fill="#34405a"
			/>
			<path d="M0 700 V430 C130 400 250 440 380 520 C430 560 470 620 500 700Z" fill="#1f2f47" />
			<path d={pinesRight} fill="#0f1f33" />
		</svg>
		<svg class="ground" viewBox="0 0 1600 140" preserveAspectRatio="none">
			<path d="M0 70 C300 30 520 80 800 60 S1300 25 1600 65 V140 H0Z" fill="#0f1f33" />
		</svg>
		<div class="mist"></div>
		{#each leaves as leaf, i (i)}
			<span
				class="leaf"
				style:left="{leaf.x}%"
				style:animation-duration="{leaf.duration}s"
				style:animation-delay="{leaf.delay}s"
			>
				<span style:animation-duration="{leaf.sway}s" style:--drift="{leaf.drift}px">
					<svg viewBox="-10 -12 20 24" width={leaf.size} height={leaf.size}>
						<path d="M0 -11 C7 -6 8 4 0 11 C-8 4 -7 -6 0 -11Z" fill={LEAF_COLOURS[leaf.hue]} />
						<path d="M0 -10 V10" stroke="rgb(0 0 0 / 0.25)" stroke-width="0.8" />
					</svg>
				</span>
			</span>
		{/each}
	{:else if scene === 'mer'}
		{@render starsSvg(skyStars.mer)}
		{@render shootingStars()}
		<div class="moon-glow" bind:this={glow}></div>
		<div class="moon"></div>
		<svg class="side left" viewBox="0 0 500 700" preserveAspectRatio="xMinYMax meet">
			<path
				d="M0 700 V330 L60 300 L120 340 L150 420 L210 470 L240 560 L300 620 L320 700Z"
				fill="#13253b"
			/>
			<path d="M0 700 V470 L70 450 L130 520 L170 600 L230 660 L240 700Z" fill="#0b1828" />
		</svg>
		<svg class="side right" viewBox="0 0 500 700" preserveAspectRatio="xMinYMax meet">
			<path d="M0 700 V560 L80 540 L150 590 L190 650 L210 700Z" fill="#0b1828" />
		</svg>
		<div class="sea">
			<div class="waves"></div>
			<div class="waves slow"></div>
			<div class="glints"></div>
			<div class="glints late"></div>
		</div>
	{:else}
		{@render starsSvg(skyStars.dunes)}
		{@render shootingStars()}
		<div class="crescent"></div>
		<div class="glow dusk" bind:this={glow}></div>
		<svg class="ground far" viewBox="0 0 1600 200" preserveAspectRatio="none">
			<path
				d="M0 90 C240 40 460 60 700 95 S1150 30 1380 70 S1560 95 1600 85 V200 H0Z"
				fill="#5b4148"
			/>
		</svg>
		<svg class="side left" viewBox="0 0 500 700" preserveAspectRatio="xMinYMax meet">
			<g fill="#231a25">
				<path d="M118 700 C124 600 138 500 168 392 L178 394 C154 500 144 600 142 700Z" />
				<path d="M172 392 C120 352 70 356 30 392 C80 372 130 374 172 398Z" />
				<path d="M172 392 C150 330 110 300 62 296 C110 318 140 350 168 398Z" />
				<path d="M172 392 C210 340 260 326 310 340 C262 342 220 362 178 398Z" />
				<path d="M172 392 C230 380 280 400 320 440 C270 412 226 404 176 400Z" />
				<path d="M172 392 C170 340 186 300 214 276 C196 312 188 352 178 396Z" />
				<path d="M38 700 C42 640 52 590 70 540 L77 542 C62 590 56 640 56 700Z" />
				<path d="M73 540 C44 512 16 514 -6 534 C22 524 50 528 73 546Z" />
				<path d="M73 540 C96 506 128 500 158 512 C126 512 100 526 77 546Z" />
				<path d="M73 540 C66 506 74 482 92 466 C82 490 80 516 77 544Z" />
			</g>
		</svg>
		<svg class="side right" viewBox="0 0 500 700" preserveAspectRatio="xMinYMax meet">
			<g fill="#231a25">
				<path d="M130 700 C136 610 148 520 172 430 L181 432 C160 520 152 610 152 700Z" />
				<path d="M176 430 C130 392 86 394 50 426 C92 408 136 412 176 436Z" />
				<path d="M176 430 C220 384 266 374 310 390 C266 390 226 408 182 436Z" />
				<path d="M176 430 C160 380 130 352 90 344 C130 366 156 396 172 434Z" />
				<path d="M176 430 C230 424 270 446 300 480 C260 456 220 446 180 438Z" />
			</g>
		</svg>
		<svg class="ground" viewBox="0 0 1600 140" preserveAspectRatio="none">
			<path d="M0 60 C300 20 600 40 900 70 S1350 30 1600 50 V140 H0Z" fill="#3a2b36" />
			<path d="M0 110 C320 80 640 95 960 115 S1400 90 1600 100 V140 H0Z" fill="#231a25" />
		</svg>
		<div class="haze"></div>
		{#each fireflies as fly, i (i)}
			<span
				class="firefly"
				style:left="{fly.x}%"
				style:top="{30 + fly.y * 0.6}%"
				style:--drift="{fly.drift}px"
				style:animation-duration="{fly.duration}s, {fly.sway}s"
				style:animation-delay="{fly.delay}s, {fly.delay / 3}s"
			></span>
		{/each}
	{/if}
</div>

<style>
	.scene {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}

	.montagnes {
		background: linear-gradient(#0b1a2e, #16304a 45%, #3d4257 72%, #8a6a45);
	}

	.mer {
		background: linear-gradient(#081526, #12263f 50%, #22405c 76%);
	}

	.dunes {
		background: linear-gradient(#0b1a2e, #1d2b48 40%, #5a4552 66%, #b98a52 88%);
	}

	.layer {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	/* Every moving thing gets its own GPU layer and only changes transform or opacity */
	.twinkle,
	.glow,
	.rays,
	.mist,
	.haze,
	.shoot,
	.leaf,
	.leaf > span,
	.firefly,
	.moon-glow,
	.waves,
	.glints {
		will-change: transform, opacity;
		pointer-events: none;
	}

	.twinkle {
		animation: twinkle 3.2s ease-in-out infinite alternate;
	}

	/* Scenery framing the screen */
	.side {
		position: absolute;
		bottom: 0;
		width: clamp(120px, 27vw, 560px);
		height: auto;
		max-height: 80%;
	}

	.side.left {
		left: 0;
	}

	.side.right {
		right: 0;
		transform: scaleX(-1);
	}

	.ground {
		position: absolute;
		inset: auto 0 0 0;
		width: 100%;
		height: 14%;
	}

	.ground.far {
		height: 24%;
	}

	/* Light: rising sun, dusk, moon; swells with the voice (opacity set every frame) */
	.glow {
		position: absolute;
		inset: 0;
	}

	.glow.sunrise {
		background: radial-gradient(
			ellipse 60% 30% at 50% 100%,
			rgb(233 190 110 / 0.55),
			transparent 70%
		);
	}

	.glow.dusk {
		background: radial-gradient(
			ellipse 70% 32% at 50% 100%,
			rgb(230 170 100 / 0.5),
			transparent 75%
		);
	}

	/* Rays of light sweeping slowly from the top corners */
	.rays {
		position: absolute;
		top: 0;
		left: 0;
		width: 60vmax;
		height: 60vmax;
		background: repeating-conic-gradient(
			from 95deg at 0 0,
			rgb(255 226 170 / 0.13) 0deg 3deg,
			transparent 3deg 10deg
		);
		-webkit-mask-image: radial-gradient(circle at 0 0, #000, transparent 38%);
		mask-image: radial-gradient(circle at 0 0, #000, transparent 38%);
		transform-origin: 0 0;
		animation: sweep 13s ease-in-out infinite alternate;
	}

	.rays.right {
		left: auto;
		right: 0;
		transform-origin: 100% 0;
		background: repeating-conic-gradient(
			from 175deg at 100% 0,
			rgb(255 226 170 / 0.1) 0deg 3deg,
			transparent 3deg 11deg
		);
		-webkit-mask-image: radial-gradient(circle at 100% 0, #000, transparent 34%);
		mask-image: radial-gradient(circle at 100% 0, #000, transparent 34%);
		animation-duration: 17s;
		animation-direction: alternate-reverse;
	}

	/* A shooting star: a short trail crossing a corner of the sky now and then */
	.shoot {
		position: absolute;
		width: clamp(80px, 12vw, 180px);
		height: 2px;
		border-radius: 2px;
		background: linear-gradient(90deg, rgb(244 239 227 / 0), rgb(255 255 255 / 0.95));
		opacity: 0;
		transform-origin: 0 50%;
		animation: shoot linear infinite;
	}

	/* Autumn leaves falling along the edges, swaying as they go */
	.leaf {
		position: absolute;
		top: -6%;
		animation: fall linear infinite;
	}

	.leaf > span {
		display: block;
		animation: sway ease-in-out infinite alternate;
	}

	.leaf svg {
		display: block;
	}

	.mist,
	.haze {
		position: absolute;
		inset: auto -30% 4% -30%;
		height: 26%;
		background: radial-gradient(
			ellipse 50% 50% at 50% 50%,
			rgb(220 228 240 / 0.12),
			transparent 70%
		);
		animation: drift 60s ease-in-out infinite alternate;
	}

	.haze {
		background: radial-gradient(
			ellipse 50% 50% at 50% 50%,
			rgb(240 200 150 / 0.12),
			transparent 70%
		);
		animation-duration: 80s;
	}

	/* Sea: moon in a top corner, waves and glints in the bottom band */
	.moon,
	.moon-glow {
		position: absolute;
		top: 9%;
		right: 11%;
		width: clamp(44px, 6vw, 90px);
		aspect-ratio: 1;
		border-radius: 50%;
	}

	.moon {
		background: radial-gradient(circle at 40% 38%, #fffaf0, #e9e2d0 70%);
		box-shadow: 0 0 40px rgb(244 239 227 / 0.35);
	}

	.moon-glow {
		box-shadow: 0 0 120px 70px rgb(200 220 240 / 0.22);
		animation: breathe 6s ease-in-out infinite alternate;
	}

	.sea {
		position: absolute;
		inset: auto 0 0 0;
		height: 22%;
		overflow: hidden;
		background: linear-gradient(#173451, #06111f);
		border-top: 1px solid rgb(244 239 227 / 0.12);
	}

	.waves {
		position: absolute;
		inset: 0 -50% 0 -50%;
		background: repeating-linear-gradient(
			178deg,
			transparent 0 14px,
			rgb(244 239 227 / 0.06) 14px 16px
		);
		animation: drift 18s linear infinite alternate;
	}

	.waves.slow {
		opacity: 0.6;
		animation-duration: 29s;
		animation-direction: alternate-reverse;
	}

	/* Moonlight on the water, under the moon */
	.glints {
		position: absolute;
		top: 0;
		bottom: 0;
		right: calc(11% - 6vw);
		width: 18vw;
		background: repeating-linear-gradient(
			180deg,
			rgb(255 250 235 / 0.4) 0 2px,
			transparent 2px 13px
		);
		-webkit-mask-image: linear-gradient(90deg, transparent, #000 35%, #000 65%, transparent);
		mask-image: linear-gradient(90deg, transparent, #000 35%, #000 65%, transparent);
		animation: shimmer 2.6s ease-in-out infinite alternate;
	}

	.glints.late {
		transform: translateY(6px);
		animation-delay: -1.3s;
	}

	/* Dunes: crescent moon and fireflies drifting up beside the text */
	.crescent {
		position: absolute;
		top: 9%;
		left: 11%;
		width: clamp(40px, 5vw, 76px);
		aspect-ratio: 1;
		border-radius: 50%;
		box-shadow:
			inset clamp(9px, 1.2vw, 18px) clamp(-6px, -0.8vw, -4px) 0 0 #f4efe3,
			-6px 2px 22px -8px rgb(244 239 227 / 0.5);
	}

	.firefly {
		position: absolute;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: radial-gradient(circle, #ffe7a3, rgb(201 162 75 / 0.6) 45%, transparent 70%);
		box-shadow: 0 0 10px 3px rgb(255 214 120 / 0.45);
		animation-name: float, blink;
		animation-timing-function: ease-in-out;
		animation-iteration-count: infinite;
		animation-direction: alternate;
	}

	@keyframes twinkle {
		from {
			opacity: 0.15;
		}
		to {
			opacity: 0.9;
		}
	}

	@keyframes sweep {
		from {
			transform: rotate(-5deg);
			opacity: 0.45;
		}
		to {
			transform: rotate(6deg);
			opacity: 1;
		}
	}

	@keyframes shoot {
		0% {
			opacity: 0;
			transform: rotate(var(--angle)) translateX(0) scaleX(0.3);
		}
		1.5% {
			opacity: 1;
		}
		7% {
			opacity: 0;
			transform: rotate(var(--angle)) translateX(22vmin) scaleX(1);
		}
		100% {
			opacity: 0;
			transform: rotate(var(--angle)) translateX(22vmin) scaleX(1);
		}
	}

	@keyframes fall {
		to {
			transform: translateY(112vh);
		}
	}

	@keyframes sway {
		from {
			transform: translateX(calc(var(--drift) * -1)) rotate(-40deg);
		}
		to {
			transform: translateX(var(--drift)) rotate(45deg);
		}
	}

	@keyframes drift {
		from {
			transform: translateX(-8%);
		}
		to {
			transform: translateX(8%);
		}
	}

	@keyframes breathe {
		from {
			transform: scale(0.9);
		}
		to {
			transform: scale(1.15);
		}
	}

	@keyframes shimmer {
		from {
			opacity: 0.25;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes float {
		from {
			transform: translate(0, 0);
		}
		to {
			transform: translate(var(--drift), -60px);
		}
	}

	@keyframes blink {
		from {
			opacity: 0.15;
		}
		to {
			opacity: 1;
		}
	}

	/* TVs: half the leaves and fireflies */
	:global([data-device='tv']) .leaf:nth-of-type(2n),
	:global([data-device='tv']) .firefly:nth-of-type(2n) {
		display: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.twinkle,
		.rays,
		.mist,
		.haze,
		.moon-glow,
		.waves,
		.glints,
		.firefly {
			animation: none;
		}

		.shoot,
		.leaf {
			display: none;
		}
	}
</style>
