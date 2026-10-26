<script lang="ts" module>
	export const SCENES = ['montagnes', 'mer', 'dunes'] as const;
	export type Scene = (typeof SCENES)[number];
</script>

<script lang="ts">
	import Depth from './Depth.svelte';
	import { particles, pines, stars } from './scenery.ts';
	import SkyLife from './SkyLife.svelte';

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

	const LEAF_COLOURS = ['#c9a24b', '#b8642f', '#8f3b2b'];
	const leaves = particles(21, 24);
	const fireflies = particles(33, 26);
	/** Sand blown along the ground, as [height %, length vw, seconds, delay]. */
	const SAND = [
		[4, 30, 6, -1],
		[7, 22, 8, -4],
		[2, 40, 5, -2],
		[9, 18, 9, -6],
		[5, 26, 7, -3]
	];
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

<div class="scene {scene}" aria-hidden="true">
	{#if scene === 'montagnes'}
		{@render starsSvg(skyStars.montagnes)}
		<div class="glow sunrise" bind:this={glow}></div>
		<div class="rays"></div>
		<div class="rays right"></div>
		<SkyLife stars clouds birds />
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
		<!-- Banks of cloud drifting between the ridges, at two distances -->
		<div class="cloudbank far"></div>
		<div class="cloudbank"></div>
		<!-- An eagle gliding in wide circles over the left ridges -->
		<span class="eagle">
			<svg viewBox="-40 -12 80 24" width="70">
				<path
					class="wings"
					d="M0 2 C-8 -2 -20 -4 -38 2 C-24 0 -12 4 -3 6 L0 8 L3 6 C12 4 24 0 38 2 C20 -4 8 -2 0 2Z"
					fill="#0c1726"
				/>
			</svg>
		</span>
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
		<Depth light="255 220 150" shade="#060d18" foreground={['grass', 'branch']} seed={2} />
	{:else if scene === 'mer'}
		{@render starsSvg(skyStars.mer)}
		<SkyLife stars clouds birds cloudColour="200 215 235" />
		<div class="moon-glow" bind:this={glow}></div>
		<div class="moon"></div>
		<!-- Cliff with a lighthouse whose beam sweeps the sky -->
		<div class="side left cliff">
			<span class="beam"></span>
			<span class="lamp"></span>
			<svg viewBox="0 0 500 700" preserveAspectRatio="xMinYMax meet">
				<path
					d="M0 700 V330 L60 300 L120 340 L150 420 L210 470 L240 560 L300 620 L320 700Z"
					fill="#13253b"
				/>
				<path d="M48 302 L54 230 L74 230 L80 312Z" fill="#1d3049" />
				<path d="M50 230 L64 214 L78 230Z" fill="#1d3049" />
				<rect x="55" y="232" width="18" height="10" fill="#ffe7a3" />
				<path d="M0 700 V470 L70 450 L130 520 L170 600 L230 660 L240 700Z" fill="#0b1828" />
			</svg>
		</div>
		<svg class="side right" viewBox="0 0 500 700" preserveAspectRatio="xMinYMax meet">
			<path d="M0 700 V560 L80 540 L150 590 L190 650 L210 700Z" fill="#0b1828" />
		</svg>
		<!-- A sailing boat crossing the horizon, rocking, its lamp lit -->
		<span class="boat">
			<span class="rock">
				<svg viewBox="0 0 60 50" width="56">
					<path d="M30 2 L30 38 L8 38Z" fill="#c9cfd8" opacity="0.85" />
					<path d="M32 8 L32 38 L50 38Z" fill="#aab3bf" opacity="0.8" />
					<path d="M4 40 H56 L48 48 H12Z" fill="#0b1828" />
					<circle cx="31" cy="3" r="1.6" fill="#ffe7a3" />
				</svg>
			</span>
		</span>
		<div class="sea">
			<div class="waves"></div>
			<div class="waves slow"></div>
			<div class="glints"></div>
			<div class="glints late"></div>
		</div>
		<Depth
			light="200 225 255"
			shade="#030a13"
			foreground={['rocks']}
			lights={[22, 12, 7]}
			seed={3}
		/>
	{:else}
		{@render starsSvg(skyStars.dunes)}
		<SkyLife stars clouds cloudColour="240 205 170" />
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
		<!-- A caravan walking along the far dunes -->
		<span class="caravan">
			<svg viewBox="0 0 260 50" width="200">
				<g fill="#2d2130">
					{#each [0, 70, 140] as x (x)}
						<path
							d="M{x + 8} 46 L{x + 10} 30 C{x + 6} 22 {x + 14} 14 {x + 24} 16 C{x + 30} 8 {x +
								40} 8 {x + 44} 18 C{x + 48} 18 {x + 50} 14 {x + 54} 10 L{x + 58} 10 L{x +
								60} 14 L{x + 56} 16 C{x + 54} 22 {x + 50} 28 {x + 46} 30 L{x + 46} 46 L{x +
								43} 46 L{x + 42} 32 L{x + 16} 32 L{x + 13} 46Z"
						/>
					{/each}
					<path
						d="M214 46 L216 28 C214 20 220 16 224 18 C228 16 232 22 230 28 L232 46 L228 46 L224 34 L220 46Z"
					/>
					<circle cx="224" cy="12" r="5" />
				</g>
			</svg>
		</span>
		<div class="haze"></div>
		{#each SAND as [y, length, seconds, delay], i (i)}
			<span
				class="sand"
				style:bottom="{y}%"
				style:width="{length}vw"
				style:animation-duration="{seconds}s"
				style:animation-delay="{delay}s"
			></span>
		{/each}
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
		<Depth light="255 200 140" shade="#120b12" foreground={['grass']} seed={4} />
	{/if}
</div>

<style>
	.scene {
		position: absolute;
		inset: 0;
		overflow: hidden;
		/* A slow camera move, like a film shot: the landscape comes a little closer */
		animation: camera 90s ease-in-out infinite alternate;
		will-change: transform;
	}

	@keyframes camera {
		from {
			transform: scale(1) translate(0, 0);
		}
		to {
			transform: scale(1.06) translate(-1%, -0.6%);
		}
	}

	/* Mountains: banks of cloud between the ridges, an eagle circling */
	.cloudbank {
		position: absolute;
		inset: auto -40% 18% -40%;
		height: 16%;
		background:
			radial-gradient(ellipse 18% 50% at 20% 50%, rgb(210 220 235 / 0.16), transparent 70%),
			radial-gradient(ellipse 22% 45% at 55% 60%, rgb(210 220 235 / 0.12), transparent 70%),
			radial-gradient(ellipse 16% 50% at 85% 45%, rgb(210 220 235 / 0.15), transparent 70%);
		animation: drift 40s linear infinite alternate;
		will-change: transform;
		pointer-events: none;
	}

	.cloudbank.far {
		bottom: 30%;
		height: 10%;
		opacity: 0.7;
		animation-duration: 70s;
		animation-direction: alternate-reverse;
	}

	.eagle {
		position: absolute;
		left: 8%;
		top: 18%;
		animation: circle 26s linear infinite;
		will-change: transform;
	}

	.eagle svg {
		display: block;
		animation: glide 3.5s ease-in-out infinite alternate;
	}

	@keyframes circle {
		from {
			transform: rotate(0deg) translateX(9vw) rotate(0deg) scale(1);
		}
		50% {
			transform: rotate(180deg) translateX(9vw) rotate(-180deg) scale(0.75);
		}
		to {
			transform: rotate(360deg) translateX(9vw) rotate(-360deg) scale(1);
		}
	}

	@keyframes glide {
		from {
			transform: scaleY(1) rotate(-4deg);
		}
		to {
			transform: scaleY(0.7) rotate(5deg);
		}
	}

	/* Sea: a boat sailing along the horizon, rocking */
	.boat {
		position: absolute;
		bottom: 21%;
		left: 0;
		animation: sail 160s linear infinite;
		animation-delay: -55s;
		will-change: transform;
	}

	.boat .rock {
		display: block;
		transform-origin: 50% 100%;
		animation: rock 4s ease-in-out infinite alternate;
	}

	.boat svg {
		display: block;
	}

	@keyframes sail {
		from {
			transform: translateX(-8vw);
		}
		to {
			transform: translateX(108vw);
		}
	}

	@keyframes rock {
		from {
			transform: rotate(-3deg) translateY(1px);
		}
		to {
			transform: rotate(3deg) translateY(-2px);
		}
	}

	/* Dunes: a caravan crossing the far dunes, slowly */
	.caravan {
		position: absolute;
		bottom: 17%;
		left: 0;
		animation: caravan 220s linear infinite;
		animation-delay: -70s;
		will-change: transform;
	}

	.caravan svg {
		display: block;
		animation: walk 1.6s ease-in-out infinite alternate;
	}

	@keyframes caravan {
		from {
			transform: translateX(108vw);
		}
		to {
			transform: translateX(-30vw);
		}
	}

	@keyframes walk {
		from {
			transform: translateY(0);
		}
		to {
			transform: translateY(-1.5px);
		}
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

	/* The cliff is a box shaped like its drawing, so the lighthouse beam can sit on it */
	.cliff {
		aspect-ratio: 500 / 700;
	}

	.cliff svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.lamp {
		position: absolute;
		left: 12.8%;
		top: 33.6%;
		width: 14px;
		height: 14px;
		margin: -7px 0 0 -7px;
		border-radius: 50%;
		background: #fff3c4;
		box-shadow: 0 0 24px 10px rgb(255 231 163 / 0.55);
		animation: blink 2.2s ease-in-out infinite alternate;
		will-change: opacity;
	}

	/* A long cone of light turning slowly over the sea and the sky */
	.beam {
		position: absolute;
		left: 12.8%;
		top: 33.6%;
		width: 30vw;
		height: 16vh;
		margin-top: -8vh;
		background: linear-gradient(
			90deg,
			rgb(255 240 200 / 0.38),
			rgb(255 240 200 / 0.08) 60%,
			transparent
		);
		clip-path: polygon(0 47%, 100% 0, 100% 100%, 0 53%);
		transform-origin: 0 50%;
		animation: beam 9s ease-in-out infinite alternate;
		will-change: transform, opacity;
		pointer-events: none;
	}

	/* Sand blown along the ground */
	.sand {
		position: absolute;
		left: 0;
		height: 2px;
		border-radius: 2px;
		background: linear-gradient(90deg, transparent, rgb(240 205 160 / 0.45), transparent);
		animation: blow linear infinite;
		will-change: transform, opacity;
		pointer-events: none;
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

	@keyframes beam {
		from {
			transform: rotate(-58deg);
			opacity: 0.55;
		}
		to {
			transform: rotate(-24deg);
			opacity: 1;
		}
	}

	@keyframes blow {
		from {
			transform: translateX(-40vw);
			opacity: 0;
		}
		20% {
			opacity: 1;
		}
		to {
			transform: translateX(110vw);
			opacity: 0;
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
		.scene,
		.cloudbank,
		.eagle,
		.eagle svg,
		.boat,
		.boat .rock,
		.caravan,
		.caravan svg,
		.twinkle,
		.rays,
		.mist,
		.haze,
		.moon-glow,
		.waves,
		.glints,
		.firefly,
		.lamp,
		.beam {
			animation: none;
		}

		.sand {
			display: none;
		}

		.leaf {
			display: none;
		}
	}
</style>
