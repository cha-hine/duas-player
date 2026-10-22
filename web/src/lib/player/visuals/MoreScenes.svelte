<script lang="ts" module>
	export const MORE_SCENES = ['neige', 'foret', 'cascade', 'lanternes'] as const;
	export type MoreScene = (typeof MORE_SCENES)[number];
</script>

<script lang="ts">
	import { particles, pines, stars } from './scenery.ts';
	import SkyLife from './SkyLife.svelte';

	// More landscapes for the immersive player, livelier still: an aurora over snowy peaks, a
	// forest at night, a waterfall, lanterns rising from a lake. Same rules as NatureScene: the
	// scenery frames the screen and leaves the middle to the text, and only small layers move,
	// by transform or opacity. The main light swells with the reciter's voice.
	let { scene, level }: { scene: MoreScene; level: () => number } = $props();

	let glow = $state<HTMLElement>();

	$effect(() => {
		if (!glow) return;
		let frame = 0;
		let energy = 0;
		const tick = () => {
			const target = level();
			energy += (target - energy) * (target > energy ? 0.15 : 0.04);
			glow!.style.opacity = (0.45 + energy * 0.55).toFixed(3);
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});

	const sky = { neige: stars(41, 60), lanternes: stars(43, 80), foret: stars(47, 24) };
	const snow = particles(51, 46);
	const fireflies = particles(53, 42);
	const lanterns = particles(57, 28);
	const slope = (x: number) => 470 + x * 0.3;
	const snowyPines = pines(61, -10, 380, slope);
</script>

{#snippet starField(list: [number, number, number][])}
	<svg class="layer" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
		{#each list as [x, y, r], i (i)}
			<circle cx={x} cy={y} {r} fill="#f4efe3" opacity={0.35 + (i % 4) * 0.12} />
		{/each}
	</svg>
	<svg class="layer twinkle" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
		{#each list.filter((_, i) => i % 4 === 0) as [x, y, r], i (i)}
			<circle cx={x} cy={y} r={r * 1.3} fill="#fff" />
		{/each}
	</svg>
{/snippet}

<div class="scene {scene}" aria-hidden="true">
	{#if scene === 'neige'}
		{@render starField(sky.neige)}
		<!-- Aurora rippling along the top of the sky -->
		<div class="aurora" bind:this={glow}>
			<span class="band"></span>
			<span class="band second"></span>
			<span class="band third"></span>
		</div>
		<SkyLife stars />
		{#each ['left', 'right'] as side (side)}
			<svg class="side {side}" viewBox="0 0 500 700" preserveAspectRatio="xMinYMax meet">
				<path
					d="M0 700 V260 L100 160 L190 250 L260 190 L340 290 L410 400 L470 560 L490 700Z"
					fill="#2b3f5c"
				/>
				<path d="M100 160 L130 190 L112 200 L95 186 L78 198 L68 192Z" fill="#e8eef6" />
				<path d="M260 190 L292 222 L272 232 L255 220 L238 230 L232 222Z" fill="#e8eef6" />
				<path d="M0 700 V450 C130 420 260 460 380 540 C430 580 470 640 490 700Z" fill="#1c2c43" />
				<path d={snowyPines} fill="#0f1d30" />
			</svg>
		{/each}
		<svg class="ground" viewBox="0 0 1600 140" preserveAspectRatio="none">
			<path d="M0 60 C320 25 560 70 820 50 S1320 20 1600 55 V140 H0Z" fill="#cad6e6" />
		</svg>
		{#each snow as flake, i (i)}
			<span
				class="flake"
				style:left="{flake.x}%"
				style:--size="{2 + (flake.size % 5)}px"
				style:animation-duration="{flake.duration + 4}s"
				style:animation-delay="{flake.delay}s"
			>
				<span style:--drift="{flake.drift / 2}px" style:animation-duration="{flake.sway + 1}s"
				></span>
			</span>
		{/each}
	{:else if scene === 'foret'}
		{@render starField(sky.foret)}
		<div class="moonbeams" bind:this={glow}>
			<span class="beam" style:left="6%"></span>
			<span class="beam" style:left="13%" style:animation-delay="-3s"></span>
			<span class="beam" style:left="19%" style:animation-delay="-6s"></span>
			<span class="beam right" style:right="7%" style:animation-delay="-2s"></span>
			<span class="beam right" style:right="15%" style:animation-delay="-5s"></span>
		</div>
		{#each ['left', 'right'] as side (side)}
			<svg class="side tall {side}" viewBox="0 0 500 900" preserveAspectRatio="xMinYMax meet">
				<!-- Far trunks, then near ones with their crowns, ferns at their feet -->
				<rect x="300" y="0" width="16" height="900" fill="#14302e" />
				<rect x="390" y="80" width="12" height="820" fill="#173533" />
				<rect x="180" y="0" width="30" height="900" fill="#0d2120" />
				<rect x="40" y="0" width="48" height="900" fill="#081615" />
				<ellipse cx="80" cy="40" rx="190" ry="120" fill="#0a1c1b" />
				<ellipse cx="230" cy="10" rx="150" ry="90" fill="#0c201f" />
				<path
					d="M88 330 C140 320 190 300 240 296 L242 304 C192 310 144 330 88 342Z"
					fill="#081615"
				/>
				{#if side === 'left'}
					<!-- An owl on the branch, blinking now and then -->
					<g transform="translate(200 250)">
						<path
							d="M0 46 C-22 46 -24 10 -16 -6 L-20 -22 L-8 -12 C-3 -14 3 -14 8 -12 L20 -22 L16 -6 C24 10 22 46 0 46Z"
							fill="#0b1a19"
						/>
						<g class="eyes">
							<circle cx="-7" cy="0" r="4.5" fill="#f3d36b" />
							<circle cx="7" cy="0" r="4.5" fill="#f3d36b" />
							<circle cx="-7" cy="0" r="1.8" fill="#0b1a19" />
							<circle cx="7" cy="0" r="1.8" fill="#0b1a19" />
						</g>
					</g>
				{/if}
				<path
					d="M0 900 C30 820 60 800 110 790 C80 820 70 850 72 900Z M60 900 C110 830 170 810 230 812 C180 830 150 860 140 900Z M150 900 C200 850 260 840 320 850 C270 860 240 880 232 900Z"
					fill="#06100f"
				/>
			</svg>
		{/each}
		<div class="mist"></div>
		{#each fireflies as fly, i (i)}
			<span
				class="firefly green"
				style:left="{fly.x}%"
				style:top="{20 + fly.y * 0.75}%"
				style:--drift="{fly.drift}px"
				style:animation-duration="{fly.duration / 2}s, {fly.sway}s"
				style:animation-delay="{fly.delay}s, {fly.delay / 3}s"
			></span>
		{/each}
	{:else if scene === 'cascade'}
		<SkyLife clouds birds cloudColour="235 240 245" />
		<div class="rainbow" bind:this={glow}></div>
		<!-- The waterfall pours from the left cliff -->
		<div class="side left cliff">
			<svg viewBox="0 0 500 700" preserveAspectRatio="xMinYMax meet">
				<path d="M0 700 V120 L120 90 L250 130 L300 150 L310 700Z" fill="#1d3c3f" />
				<path d="M0 700 V300 L80 280 L160 320 L200 700Z" fill="#163133" />
			</svg>
			<div class="water"><span></span></div>
			<span class="spray" style:animation-delay="0s"></span>
			<span class="spray" style:animation-delay="-1.2s" style:margin-left="-30px"></span>
			<span class="spray" style:animation-delay="-2.3s" style:margin-left="26px"></span>
		</div>
		<svg class="side right" viewBox="0 0 500 700" preserveAspectRatio="xMinYMax meet">
			<path d="M0 700 V420 L90 380 L170 430 L230 520 L280 700Z" fill="#1d3c3f" />
			<path d="M0 700 V540 C60 500 120 520 160 560 C190 590 200 640 210 700Z" fill="#12292b" />
		</svg>
		<div class="river">
			<div class="waves"></div>
			<div class="waves slow"></div>
		</div>
	{:else}
		{@render starField(sky.lanternes)}
		<SkyLife stars />
		{#each ['left', 'right'] as side (side)}
			<svg class="side {side}" viewBox="0 0 500 700" preserveAspectRatio="xMinYMax meet">
				<path d="M0 700 V430 C120 380 260 400 360 470 C420 510 470 580 490 700Z" fill="#141029" />
				<path
					d={pines(side === 'left' ? 71 : 73, -10, 300, (x) => 470 + x * 0.25)}
					fill="#0c0a1d"
				/>
			</svg>
		{/each}
		<div class="lake">
			<div class="lake-glow" bind:this={glow}></div>
			<div class="glints"></div>
			<div class="glints late"></div>
		</div>
		{#each lanterns as lantern, i (i)}
			<span
				class="lantern"
				style:left="{lantern.x}%"
				style:--scale={0.6 + (lantern.size - 14) / 28}
				style:animation-duration="{lantern.duration * 2}s"
				style:animation-delay="{lantern.delay * 2}s"
			>
				<span style:--drift="{lantern.drift / 2}px" style:animation-duration="{lantern.sway + 2}s"
				></span>
			</span>
		{/each}
	{/if}
</div>

<style>
	.scene {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}

	.neige {
		background: linear-gradient(#06101f, #0d1f36 45%, #1b3350 75%, #2c4866);
	}

	.foret {
		background: linear-gradient(#050d14, #0b1f22 50%, #12302c);
	}

	.cascade {
		background: linear-gradient(#0b1a2e, #183b52 45%, #2d5f66 75%, #3e7a6e);
	}

	.lanternes {
		background: linear-gradient(#070b1d, #141a3a 45%, #2b2550 72%, #4a3355);
	}

	.layer {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	/* Every moving thing gets its own GPU layer and only changes transform or opacity */
	.twinkle,
	.aurora,
	.band,
	.flake,
	.flake > span,
	.moonbeams,
	.beam,
	.firefly,
	.mist,
	.rainbow,
	.water > span,
	.spray,
	.waves,
	.lake-glow,
	.glints,
	.lantern,
	.lantern > span {
		will-change: transform, opacity;
		pointer-events: none;
	}

	.twinkle {
		animation: twinkle 2.6s ease-in-out infinite alternate;
	}

	/* Scenery framing the screen */
	.side {
		position: absolute;
		bottom: 0;
		width: clamp(120px, 27vw, 560px);
		height: auto;
		max-height: 85%;
	}

	.side.tall {
		max-height: 100%;
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
		height: 12%;
	}

	/* Snow: aurora above, flakes falling along the edges */
	.aurora {
		position: absolute;
		inset: 0 0 auto 0;
		height: 34%;
		-webkit-mask-image: linear-gradient(transparent, #000 25%, #000 55%, transparent);
		mask-image: linear-gradient(transparent, #000 25%, #000 55%, transparent);
	}

	.band {
		position: absolute;
		inset: 10% -25% 20% -25%;
		background: linear-gradient(
			90deg,
			transparent 5%,
			rgb(80 255 170 / 0.32) 28%,
			rgb(100 200 255 / 0.28) 52%,
			rgb(170 120 255 / 0.24) 74%,
			transparent 95%
		);
		-webkit-mask-image: linear-gradient(transparent, #000 40%, #000 60%, transparent);
		mask-image: linear-gradient(transparent, #000 40%, #000 60%, transparent);
		transform-origin: 50% 0;
		animation: ripple 13s ease-in-out infinite alternate;
	}

	.band.second {
		top: 26%;
		opacity: 0.7;
		animation-duration: 17s;
		animation-direction: alternate-reverse;
	}

	.band.third {
		top: 0;
		opacity: 0.5;
		animation-duration: 21s;
		animation-delay: -6s;
	}

	.flake {
		position: absolute;
		top: -4%;
		animation: fall linear infinite;
	}

	.flake > span {
		display: block;
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		background: #fff;
		opacity: 0.85;
		animation: sway ease-in-out infinite alternate;
	}

	/* Forest: moonbeams between the trees, fireflies, mist */
	.moonbeams {
		position: absolute;
		inset: 0;
	}

	.beam {
		position: absolute;
		top: -10%;
		width: 5vw;
		height: 130vh;
		background: linear-gradient(rgb(200 230 255 / 0.2), rgb(200 230 255 / 0.05) 70%, transparent);
		transform-origin: 50% 0;
		transform: rotate(16deg);
		animation: beam 9s ease-in-out infinite alternate;
	}

	.beam.right {
		transform: rotate(-16deg);
		animation-name: beam-right;
	}

	.eyes {
		transform-box: fill-box;
		transform-origin: center;
		animation: owl 7s infinite;
	}

	.mist {
		position: absolute;
		inset: auto -30% 2% -30%;
		height: 28%;
		background: radial-gradient(
			ellipse 50% 50% at 50% 50%,
			rgb(190 230 220 / 0.14),
			transparent 70%
		);
		animation: drift 50s ease-in-out infinite alternate;
	}

	.firefly {
		position: absolute;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		animation-name: float, blink;
		animation-timing-function: ease-in-out;
		animation-iteration-count: infinite;
		animation-direction: alternate;
	}

	.firefly.green {
		background: radial-gradient(circle, #f1ffb0, rgb(180 230 90 / 0.6) 45%, transparent 70%);
		box-shadow: 0 0 12px 4px rgb(200 255 120 / 0.45);
	}

	/* Waterfall: water pouring, spray at its foot, a rainbow, the river below */
	.cliff {
		aspect-ratio: 500 / 700;
	}

	.cliff svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.water {
		position: absolute;
		left: 50%;
		top: 18%;
		bottom: 8%;
		width: 9%;
		overflow: hidden;
		/* A translucent body, lighter in the middle, appearing from the cliff's edge */
		background: linear-gradient(
			90deg,
			rgb(220 240 250 / 0.12),
			rgb(235 248 255 / 0.45) 35%,
			rgb(235 248 255 / 0.3) 65%,
			rgb(220 240 250 / 0.08)
		);
		-webkit-mask-image: linear-gradient(transparent, #000 12%);
		mask-image: linear-gradient(transparent, #000 12%);
	}

	/* Streaks of foam running down */
	.water > span {
		position: absolute;
		/* Two stripes of the pattern above the top: moved by exactly that, the loop is seamless */
		inset: -76px 0 0 0;
		background:
			repeating-linear-gradient(
				180deg,
				rgb(255 255 255 / 0) 0,
				rgb(255 255 255 / 0.5) 10px,
				rgb(255 255 255 / 0) 22px,
				rgb(255 255 255 / 0.28) 30px,
				rgb(255 255 255 / 0) 38px
			),
			repeating-linear-gradient(90deg, rgb(255 255 255 / 0.18) 0 2px, transparent 2px 7px);
		animation: pour 0.55s linear infinite;
	}

	.spray {
		position: absolute;
		left: calc(54% - 40px);
		bottom: 2%;
		width: 80px;
		height: 50px;
		border-radius: 50%;
		background: radial-gradient(ellipse, rgb(240 250 255 / 0.55), transparent 70%);
		animation: puff 3.4s ease-out infinite;
	}

	.rainbow {
		position: absolute;
		left: clamp(40px, 8vw, 160px);
		bottom: 8%;
		width: clamp(220px, 34vw, 640px);
		aspect-ratio: 2 / 1;
		border-radius: 50% 50% 0 0 / 100% 100% 0 0;
		background: radial-gradient(
			circle at 50% 100%,
			transparent 56%,
			rgb(170 120 255 / 0.18) 60%,
			rgb(90 160 255 / 0.18) 64%,
			rgb(90 220 140 / 0.18) 68%,
			rgb(255 230 90 / 0.18) 72%,
			rgb(255 150 80 / 0.18) 76%,
			rgb(255 90 90 / 0.16) 80%,
			transparent 84%
		);
		-webkit-mask-image: linear-gradient(90deg, #000 30%, transparent 75%);
		mask-image: linear-gradient(90deg, #000 30%, transparent 75%);
	}

	.river,
	.lake {
		position: absolute;
		inset: auto 0 0 0;
		height: 16%;
		overflow: hidden;
		background: linear-gradient(#2e6c72, #10303a);
		border-top: 1px solid rgb(255 255 255 / 0.12);
	}

	.waves {
		position: absolute;
		inset: 0 -50% 0 -50%;
		background: repeating-linear-gradient(
			178deg,
			transparent 0 10px,
			rgb(240 250 255 / 0.12) 10px 12px
		);
		animation: flow 9s ease-in-out infinite alternate;
	}

	.waves.slow {
		opacity: 0.6;
		animation-duration: 15s;
	}

	/* Lanterns: rising from the lake along the edges, a warm glow on the water */
	.lake {
		height: 22%;
		background: linear-gradient(#231c44, #0a0a1a);
	}

	.lake-glow {
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse 60% 90% at 50% 0, rgb(255 170 90 / 0.35), transparent 70%);
	}

	.glints {
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(
			180deg,
			rgb(255 190 110 / 0.3) 0 2px,
			transparent 2px 12px
		);
		/* Brightest under the lanterns on each side, fading towards the middle */
		-webkit-mask-image: linear-gradient(90deg, #000 5%, transparent 38% 62%, #000 95%);
		mask-image: linear-gradient(90deg, #000 5%, transparent 38% 62%, #000 95%);
		animation: shimmer 2.4s ease-in-out infinite alternate;
	}

	.glints.late {
		transform: translateY(5px);
		animation-delay: -1.2s;
	}

	.lantern {
		position: absolute;
		bottom: -6%;
		animation: rise linear infinite;
	}

	.lantern > span {
		display: block;
		width: 16px;
		height: 20px;
		border-radius: 42% 42% 30% 30%;
		background: radial-gradient(circle at 50% 38%, #fff1c2, #ffa64a 55%, #c2541c);
		box-shadow: 0 0 18px 6px rgb(255 170 80 / 0.45);
		scale: var(--scale);
		animation: sway ease-in-out infinite alternate;
	}

	@keyframes twinkle {
		from {
			opacity: 0.15;
		}
		to {
			opacity: 0.95;
		}
	}

	@keyframes ripple {
		from {
			transform: translateX(-7%) scaleY(0.75) skewX(-8deg);
			opacity: 0.6;
		}
		to {
			transform: translateX(7%) scaleY(1.25) skewX(8deg);
			opacity: 1;
		}
	}

	@keyframes fall {
		to {
			transform: translateY(110vh);
		}
	}

	@keyframes sway {
		from {
			transform: translateX(calc(var(--drift) * -1)) rotate(-12deg);
		}
		to {
			transform: translateX(var(--drift)) rotate(12deg);
		}
	}

	@keyframes beam {
		from {
			transform: rotate(14deg);
			opacity: 0.4;
		}
		to {
			transform: rotate(19deg);
			opacity: 1;
		}
	}

	@keyframes beam-right {
		from {
			transform: rotate(-14deg);
			opacity: 0.4;
		}
		to {
			transform: rotate(-19deg);
			opacity: 1;
		}
	}

	@keyframes owl {
		0%,
		92%,
		100% {
			transform: scaleY(1);
		}
		95% {
			transform: scaleY(0.1);
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

	@keyframes float {
		from {
			transform: translate(0, 0);
		}
		to {
			transform: translate(var(--drift), -90px);
		}
	}

	@keyframes blink {
		from {
			opacity: 0.1;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes pour {
		to {
			transform: translateY(76px);
		}
	}

	@keyframes puff {
		from {
			transform: scale(0.5) translateY(0);
			opacity: 0.9;
		}
		to {
			transform: scale(1.6) translateY(-30px);
			opacity: 0;
		}
	}

	@keyframes flow {
		from {
			transform: translateX(-12%);
		}
		to {
			transform: translateX(12%);
		}
	}

	@keyframes shimmer {
		from {
			opacity: 0.2;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes rise {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		8% {
			opacity: 1;
		}
		80% {
			opacity: 0.9;
		}
		100% {
			transform: translateY(-112vh);
			opacity: 0;
		}
	}

	/* TVs: half the flakes, fireflies and lanterns */
	:global([data-device='tv']) .flake:nth-of-type(2n),
	:global([data-device='tv']) .firefly:nth-of-type(2n),
	:global([data-device='tv']) .lantern:nth-of-type(2n) {
		display: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.twinkle,
		.band,
		.beam,
		.eyes,
		.mist,
		.firefly,
		.water > span,
		.spray,
		.waves,
		.glints {
			animation: none;
		}

		.flake,
		.lantern {
			display: none;
		}
	}
</style>
