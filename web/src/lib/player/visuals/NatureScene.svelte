<script lang="ts" module>
	export const SCENES = ['montagnes', 'mer', 'dunes'] as const;
	export type Scene = (typeof SCENES)[number];
</script>

<script lang="ts">
	// Calm landscapes for the immersive player, light enough for TVs: the shapes are drawn once
	// (SVG), and only a few layers move, by transform or opacity, which the graphics chip does
	// alone. The light (sun, moon, dusk) swells softly with the reciter's voice.
	let { scene, level }: { scene: Scene; level: () => number } = $props();

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

	/** The same "random" sky every time. */
	function seeded(seed: number) {
		return () => {
			seed = (seed * 16807) % 2147483647;
			return (seed - 1) / 2147483646;
		};
	}

	/** Stars in the upper sky, as [x, y, radius]. */
	function stars(count: number, seed: number, maxY: number): [number, number, number][] {
		const rand = seeded(seed);
		return Array.from({ length: count }, () => [rand() * 1600, rand() * maxY, 0.6 + rand() * 1.4]);
	}

	/** Pine trees along the near ridge, as one path. */
	const pines = (() => {
		const rand = seeded(7);
		let d = '';
		for (let x = -20; x < 1620; x += 18 + rand() * 30) {
			const base = 772 + Math.sin(x / 180) * 18 + rand() * 10;
			const h = 34 + rand() * 46;
			const w = h * 0.32;
			d += `M${x.toFixed(0)} ${base.toFixed(0)}l${w.toFixed(0)} ${(-h).toFixed(0)}l${w.toFixed(0)} ${h.toFixed(0)}z`;
		}
		return d;
	})();

	const starsMer = stars(70, 3, 480);
	const starsDunes = stars(90, 11, 520);
	const starsMontagnes = stars(40, 5, 300);
</script>

<div class="scene {scene}" aria-hidden="true">
	{#if scene === 'montagnes'}
		<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
			<defs>
				<linearGradient id="m-sky" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stop-color="#0b1a2e" />
					<stop offset="0.5" stop-color="#16304a" />
					<stop offset="0.72" stop-color="#3d4257" />
					<stop offset="0.85" stop-color="#8a6a45" />
				</linearGradient>
			</defs>
			<rect width="1600" height="900" fill="url(#m-sky)" />
			{#each starsMontagnes as [x, y, r] (`${x}-${y}`)}
				<circle cx={x} cy={y} r={r * 0.8} fill="#f4efe3" opacity="0.5" />
			{/each}
		</svg>
		<div class="glow" bind:this={glow}>
			<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
				<defs>
					<radialGradient id="m-sun">
						<stop offset="0" stop-color="#e9be6e" stop-opacity="0.55" />
						<stop offset="0.55" stop-color="#c9a24b" stop-opacity="0.18" />
						<stop offset="1" stop-color="#c9a24b" stop-opacity="0" />
					</radialGradient>
				</defs>
				<ellipse cx="800" cy="600" rx="620" ry="330" fill="url(#m-sun)" />
			</svg>
		</div>
		<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
			<path
				d="M0 560 L120 500 L230 540 L360 450 L470 520 L600 430 L720 510 L820 470 L950 540 L1080 440 L1200 520 L1320 470 L1460 540 L1600 490 V900 H0Z"
				fill="#34405a"
			/>
		</svg>
		<div class="mist slow"></div>
		<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
			<path
				d="M0 640 C150 590 250 600 380 560 S600 620 760 580 S1000 520 1150 600 S1420 560 1600 610 V900 H0Z"
				fill="#1f2f47"
			/>
			<path
				d="M0 770 C200 720 380 760 560 745 S900 715 1100 760 S1450 725 1600 750 V900 H0Z"
				fill="#0f1f33"
			/>
			<path d={pines} fill="#0f1f33" />
		</svg>
		<div class="mist"></div>
	{:else if scene === 'mer'}
		<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
			<defs>
				<linearGradient id="s-sky" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stop-color="#081526" />
					<stop offset="0.45" stop-color="#12263f" />
					<stop offset="0.62" stop-color="#22405c" />
				</linearGradient>
				<linearGradient id="s-sea" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stop-color="#173451" />
					<stop offset="1" stop-color="#06111f" />
				</linearGradient>
			</defs>
			<rect width="1600" height="900" fill="url(#s-sky)" />
			{#each starsMer as [x, y, r] (`${x}-${y}`)}
				<circle cx={x} cy={y} {r} fill="#f4efe3" opacity="0.55" />
			{/each}
			<rect y="560" width="1600" height="340" fill="url(#s-sea)" />
			<rect y="559" width="1600" height="2" fill="#f4efe3" opacity="0.12" />
		</svg>
		<div class="glow" bind:this={glow}>
			<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
				<defs>
					<radialGradient id="s-moon">
						<stop offset="0" stop-color="#f4efe3" stop-opacity="0.3" />
						<stop offset="0.3" stop-color="#96b4d2" stop-opacity="0.1" />
						<stop offset="1" stop-color="#96b4d2" stop-opacity="0" />
					</radialGradient>
				</defs>
				<ellipse cx="960" cy="100" rx="380" ry="380" fill="url(#s-moon)" />
			</svg>
		</div>
		<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
			<circle cx="960" cy="100" r="40" fill="#f4efe3" />
		</svg>
		<div class="shimmer">
			<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
				{#each Array.from({ length: 16 }, (_, i) => i) as i (i)}
					<rect
						x={960 - (14 + i * 9) / 2 + ((i * 37) % 23) - 11}
						y={572 + i * 20}
						width={14 + i * 9}
						height="2.5"
						rx="1.2"
						fill="#f4efe3"
						opacity={0.5 - i * 0.022}
					/>
				{/each}
			</svg>
		</div>
		<div class="shimmer late">
			<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
				{#each Array.from({ length: 15 }, (_, i) => i) as i (i)}
					<rect
						x={960 - (20 + i * 10) / 2 + ((i * 53) % 29) - 14}
						y={582 + i * 20}
						width={20 + i * 10}
						height="2"
						rx="1"
						fill="#f4efe3"
						opacity={0.4 - i * 0.02}
					/>
				{/each}
			</svg>
		</div>
	{:else}
		<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
			<defs>
				<linearGradient id="d-sky" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stop-color="#0b1a2e" />
					<stop offset="0.45" stop-color="#1d2b48" />
					<stop offset="0.66" stop-color="#5a4552" />
					<stop offset="0.8" stop-color="#b98a52" />
				</linearGradient>
			</defs>
			<rect width="1600" height="900" fill="url(#d-sky)" />
			{#each starsDunes as [x, y, r] (`${x}-${y}`)}
				<circle cx={x} cy={y} r={r * 0.9} fill="#f4efe3" opacity={y < 300 ? 0.6 : 0.3} />
			{/each}
			<mask id="d-crescent">
				<circle cx="640" cy="210" r="34" fill="white" />
				<circle cx="656" cy="200" r="30" fill="black" />
			</mask>
			<circle cx="640" cy="210" r="34" fill="#f4efe3" mask="url(#d-crescent)" />
		</svg>
		<div class="glow" bind:this={glow}>
			<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
				<defs>
					<radialGradient id="d-dusk">
						<stop offset="0" stop-color="#e6aa64" stop-opacity="0.45" />
						<stop offset="0.55" stop-color="#c9784b" stop-opacity="0.12" />
						<stop offset="1" stop-color="#c9784b" stop-opacity="0" />
					</radialGradient>
				</defs>
				<ellipse cx="800" cy="700" rx="980" ry="300" fill="url(#d-dusk)" />
			</svg>
		</div>
		<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
			<path
				d="M0 690 C220 640 420 650 640 680 S1050 620 1260 650 S1500 690 1600 670 V900 H0Z"
				fill="#5b4148"
			/>
		</svg>
		<div class="haze"></div>
		<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
			<path
				d="M0 760 C260 700 520 730 760 770 S1180 720 1400 745 S1560 760 1600 755 V900 H0Z"
				fill="#3a2b36"
			/>
			<path d="M0 840 C300 800 600 820 900 850 S1350 815 1600 830 V900 H0Z" fill="#231a25" />
		</svg>
	{/if}
</div>

<style>
	.scene,
	.scene > * {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	/* Drawings inside a moving layer fill it, framed like the landscape */
	.glow svg,
	.shimmer svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.scene {
		overflow: hidden;
		background: #0b1a2e;
	}

	/* The moving layers get their own GPU layer and only change transform or opacity */
	.glow,
	.mist,
	.shimmer,
	.haze {
		will-change: transform, opacity;
		pointer-events: none;
	}

	/* Mist drifting across the valleys */
	.mist {
		inset: auto -30% 8% -30%;
		width: 160%;
		height: 30%;
		background: radial-gradient(
			ellipse 50% 50% at 50% 50%,
			rgb(220 228 240 / 0.12),
			transparent 70%
		);
		animation: drift 70s ease-in-out infinite alternate;
	}

	.mist.slow {
		bottom: 26%;
		opacity: 0.8;
		animation-duration: 110s;
		animation-direction: alternate-reverse;
	}

	/* Moonlight on the water: two sets of glints taking turns */
	.shimmer {
		animation: shimmer 5s ease-in-out infinite alternate;
	}

	.shimmer.late {
		animation-delay: -2.5s;
	}

	/* Warm haze over the far dunes */
	.haze {
		inset: auto -30% 10% -30%;
		width: 160%;
		height: 26%;
		background: radial-gradient(
			ellipse 50% 50% at 50% 50%,
			rgb(240 200 150 / 0.1),
			transparent 70%
		);
		animation: drift 90s ease-in-out infinite alternate;
	}

	@keyframes drift {
		from {
			transform: translateX(-8%);
		}
		to {
			transform: translateX(8%);
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

	@media (prefers-reduced-motion: reduce) {
		.mist,
		.shimmer,
		.haze {
			animation: none;
		}
	}
</style>
