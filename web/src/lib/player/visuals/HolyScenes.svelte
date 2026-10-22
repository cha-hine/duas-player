<script lang="ts" module>
	export const HOLY_SCENES = ['kaaba', 'medine', 'karbala', 'najaf', 'mashhad'] as const;
	export type HolyScene = (typeof HOLY_SCENES)[number];
</script>

<script lang="ts">
	import { seeded, stars } from './scenery.ts';
	import SkyLife from './SkyLife.svelte';

	// The holy places at night, drawn in depth: a far city with its lit windows, drifting haze,
	// the shrines themselves framing the screen (ribbed domes swept by a gleam, tiled drums,
	// minarets with three balconies, portals), lamp posts and palms in front, light rising
	// from the domes. The Kaaba, the Prophet's Mosque in Medina, Imam Hussain and al-Abbas in
	// Karbala, Imam Ali in Najaf, Imam Reza in Mashhad. Life: the domes' light swells with the
	// voice, pigeons circle, flags fly, lamps flicker, rings of light turn for the tawaf. No
	// people are drawn. Only transform and opacity move, which the graphics chip does alone.
	let { scene, level }: { scene: HolyScene; level: () => number } = $props();

	let glow = $state<HTMLElement>();

	$effect(() => {
		if (!glow) return;
		let frame = 0;
		let energy = 0;
		const tick = () => {
			const target = level();
			energy += (target - energy) * (target > energy ? 0.15 : 0.04);
			glow!.style.opacity = (0.35 + energy * 0.65).toFixed(3);
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});

	// ——— Drawing: the sides are 600 × 800 frames, ground at y = 800 ———

	type Dome = { cx: number; base: number; w: number; h: number };

	/** An onion dome. */
	function dome({ cx, base, w, h }: Dome) {
		const l = cx - w / 2;
		const r = cx + w / 2;
		const top = base - h;
		return (
			`M${l} ${base} C${l} ${base - h * 0.55} ${cx - w * 0.3} ${top + h * 0.12} ${cx} ${top} ` +
			`C${cx + w * 0.3} ${top + h * 0.12} ${r} ${base - h * 0.55} ${r} ${base} Z`
		);
	}

	/** The ribs of a dome, from its rim to its top. */
	function ribs({ cx, base, w, h }: Dome, count = 9) {
		let d = '';
		for (let i = 1; i < count; i++) {
			const x = cx - w / 2 + (w * i) / count;
			d += `M${x} ${base} Q${cx + (x - cx) * 0.95} ${base - h * 0.62} ${cx} ${base - h} `;
		}
		return d;
	}

	/** The drum under a dome, with its band of tiles. */
	const drum = ({ cx, base, w, h }: Dome) => ({
		body: `M${cx - w * 0.44} ${base} h${w * 0.88} v${h * 0.42} h${-w * 0.88} Z`,
		band: { x: cx - w * 0.44, y: base + h * 0.06, w: w * 0.88, h: h * 0.14 },
		windows: Array.from({ length: 7 }, (_, i) => cx - w * 0.36 + (w * 0.72 * i) / 6)
	});

	/** A minaret: base, tiled shaft, three balconies with muqarnas, a cap and finial. */
	function minaret(x: number, top: number, w: number, ground = 800) {
		const h = ground - top;
		const balconies = [0.16, 0.42, 0.68].map((t) => top + 40 + (h - 40) * t);
		let d = `M${x - w * 0.75} ${ground} V${ground - 70} H${x + w * 0.75} V${ground} Z `;
		d += `M${x - w / 2} ${ground - 70} V${top + 40} H${x + w / 2} V${ground - 70} Z `;
		for (const y of balconies) {
			d += `M${x - w * 1.05} ${y} h${w * 2.1} v7 h${-w * 2.1} Z `;
			// Muqarnas: a little zigzag under the balcony
			d += `M${x - w * 0.95} ${y + 7} `;
			for (let i = 0; i < 6; i++) d += `l${(w * 1.9) / 12} 8 l${(w * 1.9) / 12} -8 `;
			d += 'Z ';
		}
		// Lantern, cap and finial
		d += `M${x - w * 0.42} ${top + 40} V${top + 12} H${x + w * 0.42} V${top + 40} Z `;
		d += `M${x - w * 0.55} ${top + 12} Q${x - w * 0.5} ${top - 14} ${x} ${top - 30} Q${x + w * 0.5} ${top - 14} ${x + w * 0.55} ${top + 12} Z `;
		d += `M${x - 1.5} ${top - 30} V${top - 52} H${x + 1.5} V${top - 30} Z`;
		return { d, balconies, top };
	}

	/** A portal (iwan): a pointed arch in a tiled frame. */
	function iwan(cx: number, top: number, w: number, ground = 800) {
		const inner = w * 0.62;
		const spring = top + w * 0.55;
		return {
			frame: `M${cx - w / 2} ${ground} V${top} H${cx + w / 2} V${ground} Z`,
			arch:
				`M${cx - inner / 2} ${ground} V${spring} Q${cx - inner / 2} ${top + w * 0.22} ${cx} ${top + w * 0.12} ` +
				`Q${cx + inner / 2} ${top + w * 0.22} ${cx + inner / 2} ${spring} V${ground} Z`
		};
	}

	/** A row of lit arches along a wall, as one path. */
	function arches(from: number, to: number, bottom: number, height: number, step = 40) {
		let d = '';
		for (let x = from; x + step * 0.6 <= to; x += step) {
			const w = step * 0.6;
			d += `M${x} ${bottom} V${bottom - height + w / 2} a${w / 2} ${w / 2} 0 0 1 ${w} 0 V${bottom} Z`;
		}
		return d;
	}

	/** A crescent finial above a dome's top. */
	const finial = (cx: number, top: number) =>
		`M${cx - 2.5} ${top} V${top - 36} H${cx + 2.5} V${top} Z M${cx - 6} ${top - 12} h12 v6 h-12 Z ` +
		`M${cx} ${top - 54} a11 11 0 1 0 10 15 a8.5 8.5 0 1 1 -10 -15 Z`;

	/** A far city of the scene's own kind, as [buildings, lit windows] in 1600 × 300. */
	function city(seed: number) {
		const rand = seeded(seed);
		let buildings = '';
		let windows = '';
		for (let x = -20; x < 1620;) {
			const w = 40 + rand() * 90;
			const h = 50 + rand() * 150;
			buildings += `M${x.toFixed(0)} 300 V${(300 - h).toFixed(0)} H${(x + w).toFixed(0)} V300 Z `;
			for (let wy = 300 - h + 12; wy < 290; wy += 16) {
				for (let wx = x + 8; wx < x + w - 8; wx += 14) {
					if (rand() < 0.28) windows += `M${wx.toFixed(0)} ${wy.toFixed(0)} h5 v7 h-5 Z `;
				}
			}
			x += w + rand() * 12;
		}
		return { buildings, windows };
	}

	/** Where a point of a side frame is, in % of that frame. */
	const at = (x: number, y: number, w = 600, h = 800) => ({
		left: `${(x / w) * 100}%`,
		top: `${(y / h) * 100}%`
	});

	// ——— The scenes ———

	type Side = {
		domes: (Dome & { fill: string; drumFill: string; flag?: boolean; pigeons?: boolean })[];
		minarets: { x: number; top: number; w: number; fill: string }[];
		iwans: { cx: number; top: number; w: number; fill: string }[];
		wall: { from: number; to: number; top: number; fill: string };
		extra?: 'clock' | 'umbrellas' | 'tower';
	};
	type Composition = { left: Side; right: Side; lamps: string; city: number; palms: boolean };

	const GOLD = 'url(#h-gold)';
	const COMPOSITIONS: Record<Exclude<HolyScene, 'kaaba'>, Composition> = {
		karbala: {
			left: {
				domes: [
					{
						cx: 250,
						base: 560,
						w: 260,
						h: 240,
						fill: GOLD,
						drumFill: '#9c7424',
						flag: true,
						pigeons: true
					}
				],
				minarets: [
					{ x: 90, top: 150, w: 22, fill: GOLD },
					{ x: 400, top: 150, w: 22, fill: GOLD }
				],
				iwans: [{ cx: 250, top: 600, w: 150, fill: 'url(#h-tiles)' }],
				wall: { from: 0, to: 600, top: 640, fill: '#1b2f55' }
			},
			right: {
				domes: [
					{ cx: 340, base: 590, w: 220, h: 205, fill: GOLD, drumFill: '#9c7424', flag: true }
				],
				minarets: [
					{ x: 190, top: 200, w: 20, fill: GOLD },
					{ x: 500, top: 200, w: 20, fill: GOLD }
				],
				iwans: [{ cx: 340, top: 630, w: 130, fill: 'url(#h-tiles)' }],
				wall: { from: 0, to: 600, top: 660, fill: '#1b2f55' }
			},
			lamps: '255 214 140',
			city: 11,
			palms: true
		},
		najaf: {
			left: {
				domes: [
					{ cx: 300, base: 540, w: 290, h: 265, fill: GOLD, drumFill: '#9c7424', pigeons: true }
				],
				minarets: [
					{ x: 110, top: 120, w: 24, fill: GOLD },
					{ x: 490, top: 120, w: 24, fill: GOLD }
				],
				iwans: [{ cx: 300, top: 590, w: 170, fill: GOLD }],
				wall: { from: 0, to: 600, top: 630, fill: '#1b2f55' }
			},
			right: {
				domes: [{ cx: 470, base: 640, w: 110, h: 100, fill: GOLD, drumFill: '#9c7424' }],
				minarets: [],
				iwans: [{ cx: 230, top: 610, w: 150, fill: 'url(#h-tiles)' }],
				wall: { from: 0, to: 600, top: 670, fill: '#1b2f55' },
				extra: 'clock'
			},
			lamps: '255 214 140',
			city: 13,
			palms: true
		},
		medine: {
			left: {
				domes: [
					{
						cx: 290,
						base: 560,
						w: 240,
						h: 230,
						fill: 'url(#h-green)',
						drumFill: '#15633a',
						pigeons: true
					},
					{ cx: 500, base: 610, w: 90, h: 85, fill: '#a9b6c3', drumFill: '#7d8893' }
				],
				minarets: [{ x: 90, top: 110, w: 22, fill: '#dfe3ea' }],
				iwans: [],
				wall: { from: 0, to: 600, top: 640, fill: '#3b3f4f' }
			},
			right: {
				domes: [],
				minarets: [
					{ x: 170, top: 120, w: 22, fill: '#dfe3ea' },
					{ x: 430, top: 160, w: 20, fill: '#d2d7e0' }
				],
				iwans: [{ cx: 300, top: 600, w: 150, fill: '#cfd3dc' }],
				wall: { from: 0, to: 600, top: 650, fill: '#3b3f4f' },
				extra: 'umbrellas'
			},
			lamps: '150 240 170',
			city: 17,
			palms: true
		},
		mashhad: {
			left: {
				domes: [
					{ cx: 270, base: 560, w: 260, h: 240, fill: GOLD, drumFill: '#9c7424', pigeons: true }
				],
				minarets: [{ x: 440, top: 150, w: 24, fill: GOLD }],
				iwans: [{ cx: 270, top: 590, w: 180, fill: GOLD }],
				wall: { from: 0, to: 600, top: 640, fill: '#1b2f55' }
			},
			right: {
				domes: [
					{ cx: 320, base: 560, w: 270, h: 225, fill: 'url(#h-turquoise)', drumFill: '#1d6a88' }
				],
				minarets: [
					{ x: 120, top: 140, w: 24, fill: 'url(#h-turquoise)' },
					{ x: 520, top: 140, w: 24, fill: 'url(#h-turquoise)' }
				],
				iwans: [{ cx: 320, top: 560, w: 210, fill: 'url(#h-tiles)' }],
				wall: { from: 0, to: 600, top: 650, fill: '#1b2f55' }
			},
			lamps: '190 240 255',
			city: 19,
			palms: false
		}
	};

	const composition = $derived(scene === 'kaaba' ? null : COMPOSITIONS[scene]);
	const sky = stars(81, 70);
	const far = $derived(city(scene === 'kaaba' ? 7 : (composition?.city ?? 7)));
	/** Lamp posts along the ground, in % across the screen. */
	const POSTS = [30, 38, 46, 54, 62, 70];
</script>

{#snippet starField()}
	<svg class="layer" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
		{#each sky as [x, y, r], i (i)}
			<circle cx={x} cy={y} {r} fill="#f4efe3" opacity={0.35 + (i % 4) * 0.12} />
		{/each}
	</svg>
	<svg class="layer twinkle" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
		{#each sky.filter((_, i) => i % 4 === 0) as [x, y, r], i (i)}
			<circle cx={x} cy={y} r={r * 1.3} fill="#fff" />
		{/each}
	</svg>
{/snippet}

{#snippet defs()}
	<defs>
		<linearGradient id="h-gold" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#f8dc86" />
			<stop offset="0.4" stop-color="#cf9c34" />
			<stop offset="1" stop-color="#6e4a10" />
		</linearGradient>
		<linearGradient id="h-green" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#4fd085" />
			<stop offset="0.5" stop-color="#1f8a4c" />
			<stop offset="1" stop-color="#0b4024" />
		</linearGradient>
		<linearGradient id="h-turquoise" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#8fe0f0" />
			<stop offset="0.5" stop-color="#2f8fb3" />
			<stop offset="1" stop-color="#103f55" />
		</linearGradient>
		<!-- Tiles: small gold and blue stars on lapis -->
		<pattern id="h-tiles" width="16" height="16" patternUnits="userSpaceOnUse">
			<rect width="16" height="16" fill="#163a72" />
			<path d="M8 1 L10 6 L15 8 L10 10 L8 15 L6 10 L1 8 L6 6 Z" fill="#d9b04a" opacity="0.85" />
			<circle cx="0" cy="0" r="2" fill="#5fb3d6" />
			<circle cx="16" cy="16" r="2" fill="#5fb3d6" />
		</pattern>
		<pattern id="h-frieze" width="12" height="12" patternUnits="userSpaceOnUse">
			<rect width="12" height="12" fill="#1d4f8f" />
			<path d="M6 0 L12 6 L6 12 L0 6 Z" fill="#e3c063" opacity="0.8" />
		</pattern>
		<linearGradient id="h-sheen" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#fff" stop-opacity="0" />
			<stop offset="0.5" stop-color="#fff8dc" stop-opacity="0.55" />
			<stop offset="1" stop-color="#fff" stop-opacity="0" />
		</linearGradient>
	</defs>
{/snippet}

{#snippet sideFrame(side: Side, name: 'left' | 'right')}
	<div class="side {name}">
		<!-- Light rising from each dome -->
		{#each side.domes as d, i (i)}
			<span
				class="shaft"
				style:left={at(d.cx, 0).left}
				style:bottom="{(1 - (d.base - d.h) / 800) * 100}%"
				style:width="{(d.w / 600) * 60}%"
				style:animation-delay="{-i * 2}s"
			></span>
		{/each}
		<svg viewBox="0 0 600 800" preserveAspectRatio="xMidYMax meet">
			{@render defs()}
			<!-- Minarets behind, then the courtyard wall with its arches -->
			{#each side.minarets as m, i (i)}
				{@const shape = minaret(m.x, m.top, m.w)}
				<path d={shape.d} fill={m.fill} />
				<rect
					x={m.x - m.w * 0.42}
					y={m.top + 80}
					width={m.w * 0.84}
					height="10"
					fill="url(#h-frieze)"
				/>
			{/each}
			{#each side.domes as d, i (i)}
				{@const base = drum(d)}
				<path d={base.body} fill={d.drumFill} />
				<rect
					x={base.band.x}
					y={base.band.y}
					width={base.band.w}
					height={base.band.h}
					fill="url(#h-frieze)"
				/>
				{#each base.windows as wx (wx)}
					<path
						d="M{wx - 6} {d.base + d.h * 0.38} v{-d.h * 0.12} a6 6 0 0 1 12 0 v{d.h * 0.12} Z"
						fill="#ffe4a0"
						opacity="0.75"
					/>
				{/each}
				<path d={dome(d)} fill={d.fill} />
				<path d={ribs(d)} fill="none" stroke="rgb(60 35 5 / 0.35)" stroke-width="2" />
				<!-- A gleam of light sweeping across the dome -->
				<clipPath id="h-dome-{name}-{i}"><path d={dome(d)} /></clipPath>
				<g clip-path="url(#h-dome-{name}-{i})">
					<rect
						class="sheen"
						x={d.cx - d.w / 2 - 80}
						y={d.base - d.h}
						width="70"
						height={d.h}
						fill="url(#h-sheen)"
						style:--travel="{d.w + 160}px"
						style:animation-delay="{-i * 3}s"
					/>
				</g>
				<path d={finial(d.cx, d.base - d.h)} fill="#f2d680" />
			{/each}
			<rect
				x={side.wall.from}
				y={side.wall.top}
				width={side.wall.to - side.wall.from}
				height={800 - side.wall.top}
				fill={side.wall.fill}
			/>
			<rect
				x={side.wall.from}
				y={side.wall.top}
				width={side.wall.to - side.wall.from}
				height="12"
				fill="url(#h-frieze)"
			/>
			<path
				d={arches(side.wall.from + 12, side.wall.to - 12, 792, (800 - side.wall.top) * 0.62)}
				fill="#f2d48c"
				opacity="0.6"
			/>
			{#each side.iwans as g, i (i)}
				{@const portal = iwan(g.cx, g.top, g.w)}
				<path d={portal.frame} fill={g.fill} />
				<rect x={g.cx - g.w / 2} y={g.top} width={g.w} height="10" fill="#e3c063" />
				<path d={portal.arch} fill="#0d1428" />
				<path d={portal.arch} fill="#ffd98a" opacity="0.25" />
			{/each}
			{#if side.extra === 'clock'}
				<!-- The clock tower of the shrine's courtyard -->
				<path d="M405 800 V300 H465 V800 Z" fill="url(#h-gold)" />
				<rect x="405" y="300" width="60" height="14" fill="url(#h-frieze)" />
				<circle cx="435" cy="345" r="20" fill="#fbf4de" />
				<path d="M435 345 V331 M435 345 L445 351" stroke="#5a4214" stroke-width="2.5" />
				<path d={dome({ cx: 435, base: 300, w: 70, h: 60 })} fill="url(#h-gold)" />
				<path d={finial(435, 240)} fill="#f2d680" />
			{:else if side.extra === 'umbrellas'}
				<!-- The courtyard's great umbrellas, open -->
				{#each [[150, 700], [330, 690], [510, 705]] as [x, y] (x)}
					<path
						d="M{x - 80} {y} Q{x} {y - 60} {x + 80} {y} Q{x + 40} {y - 14} {x} {y - 4} Q{x -
							40} {y - 14} {x - 80} {y} Z"
						fill="#ece8dd"
					/>
					<rect x={x - 3} y={y - 4} width="6" height={800 - y + 4} fill="#d8d3c6" />
				{/each}
			{/if}
		</svg>
		<!-- Lamps on the minarets, flags, pigeons -->
		{#each side.minarets as m, i (i)}
			{#each minaret(m.x, m.top, m.w).balconies as y, b (b)}
				<span
					class="lamp"
					style:left={at(m.x, y - 4).left}
					style:top={at(m.x, y - 4).top}
					style:animation-delay="{-(i * 3 + b) * 0.6}s"
				></span>
			{/each}
		{/each}
		{#each side.domes as d, i (i)}
			{#if d.flag}
				<span
					class="flag"
					style:left={at(d.cx, d.base - d.h - 30).left}
					style:top={at(d.cx, d.base - d.h - 30).top}
					style:animation-delay="{-i * 0.8}s"
				></span>
			{/if}
			{#if d.pigeons}
				<span
					class="orbit"
					style:left={at(d.cx, d.base - d.h * 0.8).left}
					style:top={at(d.cx, d.base - d.h * 0.8).top}
					style:--size="{(d.w / 600) * 230}%"
				>
					{#each [0, 1, 2, 3, 4, 5, 6, 7] as b (b)}
						<span
							class="ring-bird"
							style:animation-delay="{-b * 1.7}s"
							style:animation-duration="{11 + (b % 3) * 1.5}s"
						>
							<svg viewBox="0 0 24 10"
								><path
									d="M1 6 Q6 0 12 6 Q18 0 23 6"
									fill="none"
									stroke="#efe9da"
									stroke-width="2"
								/></svg
							>
						</span>
					{/each}
				</span>
			{/if}
		{/each}
	</div>
{/snippet}

<div class="scene {scene}" aria-hidden="true">
	{@render starField()}
	{#if scene === 'medine'}
		<div class="crescent"></div>
	{/if}
	<SkyLife stars />

	<!-- Far: the city, its windows lighting up -->
	<svg class="city" viewBox="0 0 1600 300" preserveAspectRatio="xMidYMax slice">
		<path d={far.buildings} fill="#121a30" />
	</svg>
	<svg class="city windows" viewBox="0 0 1600 300" preserveAspectRatio="xMidYMax slice">
		<path d={far.windows} fill="#ffd98a" />
	</svg>
	<div class="haze"></div>
	<div class="glow" bind:this={glow}></div>

	{#if composition}
		{@render sideFrame(composition.left, 'left')}
		{@render sideFrame(composition.right, 'right')}
	{:else}
		<!-- Masjid al-Haram: arcades and minarets on the left, the clock tower on the right, the
		     Kaaba low in the middle with the rings of the tawaf -->
		<div class="side left">
			<svg viewBox="0 0 600 800" preserveAspectRatio="xMidYMax meet">
				{@render defs()}
				{#each [[110, 140], [290, 120], [470, 150]] as [x, top] (x)}
					<path d={minaret(x, top, 22).d} fill="#d7dae2" />
					<rect x={x - 9} y={top + 80} width="18" height="10" fill="#8f9bb0" />
				{/each}
				<rect x="0" y="600" width="600" height="200" fill="#c9ccd6" />
				<rect x="0" y="600" width="600" height="10" fill="#9aa2b4" />
				<path d={arches(10, 590, 792, 150, 46)} fill="#f6e2a6" opacity="0.7" />
				<path d={arches(10, 590, 690, 60, 46)} fill="#f6e2a6" opacity="0.55" />
			</svg>
			{#each [[110, 140], [290, 120], [470, 150]] as [x, top], i (x)}
				{#each minaret(x, top, 22).balconies as y, b (b)}
					<span
						class="lamp"
						style:left={at(x, y - 4).left}
						style:top={at(x, y - 4).top}
						style:animation-delay="{-(i * 3 + b) * 0.6}s"
					></span>
				{/each}
			{/each}
		</div>
		<div class="side right">
			<svg viewBox="0 0 600 800" preserveAspectRatio="xMidYMax meet">
				{@render defs()}
				<!-- Abraj al-Bait: the clock tower over the hotels -->
				<path d="M250 800 V170 H410 V800 Z" fill="#20243a" />
				<path d="M270 170 V90 H390 V170 Z" fill="#262b45" />
				<path d="M300 90 V40 H360 V90 Z" fill="#2c3150" />
				<path d="M330 40 V-10" stroke="#e8c867" stroke-width="5" />
				<path d={finial(330, -10)} fill="#e8c867" />
				<rect x="250" y="250" width="160" height="10" fill="#e8c867" opacity="0.7" />
				{#each Array.from({ length: 24 }, (_, i) => i) as i (i)}
					<rect
						x={262 + (i % 6) * 24}
						y={300 + Math.floor(i / 6) * 60}
						width="10"
						height="30"
						fill="#ffd98a"
						opacity={0.25 + (i % 3) * 0.15}
					/>
				{/each}
				<path d="M0 800 V430 H220 V800 Z M420 800 V470 H600 V800 Z" fill="#191c2e" />
				<path d={minaret(120, 200, 20).d} fill="#d7dae2" />
				<rect x="0" y="620" width="600" height="180" fill="#c9ccd6" />
				<path d={arches(10, 590, 792, 130, 46)} fill="#f6e2a6" opacity="0.7" />
			</svg>
			<span class="clock" style:left={at(330, 130).left} style:top={at(330, 130).top}></span>
			{#each minaret(120, 200, 20).balconies as y, b (b)}
				<span
					class="lamp"
					style:left={at(120, y - 4).left}
					style:top={at(120, y - 4).top}
					style:animation-delay="{-b * 0.6}s"
				></span>
			{/each}
		</div>
		<div class="kaaba-box">
			<svg viewBox="0 0 600 300" preserveAspectRatio="xMidYMax meet">
				{@render defs()}
				<ellipse cx="300" cy="292" rx="290" ry="28" fill="#efe9da" opacity="0.28" />
				<path d="M210 120 L270 100 H420 L360 120 Z" fill="#26262e" />
				<rect x="210" y="120" width="150" height="160" fill="#07070a" />
				<path d="M360 120 L420 100 V262 L360 280 Z" fill="#111115" />
				<rect x="210" y="146" width="150" height="14" fill="url(#h-gold)" />
				<path d="M360 146 L420 126 V140 L360 160 Z" fill="#a8822f" />
				<path d="M222 150 h126 M222 155 h126" stroke="#5a4214" stroke-width="1" />
				<rect x="318" y="196" width="24" height="62" fill="url(#h-gold)" />
				<path d="M322 202 h16 v50 h-16 Z" fill="none" stroke="#6e4a10" stroke-width="1.5" />
				<!-- Maqam Ibrahim -->
				<path d="M150 280 V250 a14 14 0 0 1 28 0 V280 Z" fill="url(#h-gold)" opacity="0.9" />
			</svg>
			{#each [44, 62, 80, 98] as size, i (size)}
				<span class="tawaf" style:--size="{size}%" style:animation-duration="{36 + i * 12}s"></span>
			{/each}
		</div>
	{/if}

	<!-- Near: lamp posts along the ground, palms in the corners -->
	{#each POSTS as x, i (x)}
		<span
			class="post"
			style:left="{x}%"
			style:--colour={composition?.lamps ?? '255 236 180'}
			style:animation-delay="{-i * 0.9}s"
		></span>
	{/each}
	{#if composition?.palms}
		<svg class="palm left" viewBox="0 0 300 400" preserveAspectRatio="xMinYMax meet">
			<g fill="#06090f">
				<path d="M90 400 C96 320 104 250 122 180 L130 182 C114 250 108 320 106 400Z" />
				<path d="M126 182 C90 150 50 152 14 180 C54 164 92 166 126 188Z" />
				<path d="M126 182 C110 132 80 108 40 104 C78 120 104 146 122 188Z" />
				<path d="M126 182 C152 140 190 128 230 140 C192 142 160 160 130 190Z" />
				<path d="M126 182 C172 176 210 194 236 226 C196 204 164 196 130 192Z" />
				<path d="M126 182 C126 140 140 108 166 90 C150 120 140 150 132 188Z" />
			</g>
		</svg>
		<svg class="palm right" viewBox="0 0 300 400" preserveAspectRatio="xMaxYMax meet">
			<g fill="#06090f">
				<path d="M200 400 C196 330 190 270 176 210 L184 208 C198 270 206 330 214 400Z" />
				<path d="M180 210 C220 176 260 176 296 204 C258 190 220 192 184 216Z" />
				<path d="M180 210 C196 160 226 140 266 138 C228 150 204 176 186 214Z" />
				<path d="M180 210 C150 170 112 160 74 172 C112 174 144 190 176 218Z" />
				<path d="M180 210 C140 210 104 230 82 262 C118 238 150 228 178 220Z" />
			</g>
		</svg>
	{/if}
	<!-- In front of it all, darker towards the middle so the text reads well -->
	<div class="veil"></div>
</div>

<style>
	.scene {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background: linear-gradient(#040916, #0c1730 50%, #2a2640 78%, #5c4130);
	}

	.medine {
		background: linear-gradient(#03101a, #0b2131 50%, #1d3a3a 78%, #4c4a33);
	}

	.mashhad {
		background: linear-gradient(#040a18, #0d1d38 50%, #1b344f 78%, #4a4436);
	}

	.kaaba {
		background: linear-gradient(#030712, #0b1530 50%, #2c2a44 78%, #6b4c33);
	}

	.layer {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	/* Every moving thing gets its own GPU layer and only changes transform or opacity */
	.twinkle,
	.windows,
	.haze,
	.glow,
	.shaft,
	.lamp,
	.flag,
	.orbit,
	.ring-bird,
	.tawaf,
	.clock,
	.post {
		will-change: transform, opacity;
		pointer-events: none;
	}

	.twinkle {
		animation: twinkle 3s ease-in-out infinite alternate;
	}

	/* Far city, low and bluish; its windows light up and go out */
	.city {
		position: absolute;
		inset: auto 0 0 0;
		width: 100%;
		height: 30%;
		opacity: 0.9;
	}

	.windows {
		opacity: 0.55;
		animation: twinkle 5s ease-in-out infinite alternate;
	}

	.haze {
		position: absolute;
		inset: auto -30% 8% -30%;
		height: 30%;
		background: radial-gradient(
			ellipse 50% 50% at 50% 50%,
			rgb(200 190 220 / 0.14),
			transparent 70%
		);
		animation: drift 45s ease-in-out infinite alternate;
	}

	/* The light of the holy places over the horizon, swelling with the voice */
	.glow {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse 70% 40% at 50% 100%,
			rgb(255 205 120 / 0.38),
			transparent 70%
		);
	}

	.medine .glow {
		background: radial-gradient(
			ellipse 70% 40% at 50% 100%,
			rgb(110 230 150 / 0.3),
			transparent 70%
		);
	}

	/* The shrines framing the screen, sized by height: a 600 × 800 frame */
	.side {
		position: absolute;
		bottom: 0;
		height: min(76%, 46vw);
		aspect-ratio: 600 / 800;
	}

	.side.left {
		left: 0;
	}

	.side.right {
		right: 0;
	}

	.side svg,
	.kaaba-box svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	/* Light rising from a dome into the sky */
	.shaft {
		position: absolute;
		height: 140%;
		translate: -50% 0;
		background: linear-gradient(transparent, rgb(255 225 160 / 0.16) 60%, rgb(255 225 160 / 0.3));
		-webkit-mask-image: linear-gradient(90deg, transparent, #000 40%, #000 60%, transparent);
		mask-image: linear-gradient(90deg, transparent, #000 40%, #000 60%, transparent);
		animation: breathe 6s ease-in-out infinite alternate;
	}

	.medine .shaft {
		background: linear-gradient(transparent, rgb(140 240 170 / 0.14) 60%, rgb(140 240 170 / 0.26));
	}

	.sheen {
		transform-box: view-box;
		animation: sweep 9s ease-in-out infinite;
	}

	.lamp {
		position: absolute;
		width: 6px;
		height: 6px;
		margin: -3px 0 0 -3px;
		border-radius: 50%;
		background: #fff3c4;
		box-shadow: 0 0 10px 4px rgb(255 220 140 / 0.6);
		animation: blink 2.4s ease-in-out infinite alternate;
	}

	.medine .lamp {
		background: #d9ffe4;
		box-shadow: 0 0 10px 4px rgb(120 230 150 / 0.6);
	}

	/* The red flag of Karbala, in the wind */
	.flag {
		position: absolute;
		width: 40px;
		height: 24px;
		margin-top: -12px;
		background: linear-gradient(90deg, #a5101a, #e0333b 55%, #a5101a);
		clip-path: polygon(0 0, 100% 10%, 90% 50%, 100% 90%, 0 100%);
		transform-origin: 0 50%;
		animation: wave 1.5s ease-in-out infinite alternate;
	}

	/* Pigeons circling a dome: a turning ring, flattened into an ellipse */
	.orbit {
		position: absolute;
		width: var(--size);
		aspect-ratio: 1;
		translate: -50% -50%;
		scale: 1 0.32;
	}

	.ring-bird {
		position: absolute;
		inset: 0;
		animation: turn linear infinite;
	}

	.ring-bird svg {
		position: absolute;
		top: 0;
		left: 50%;
		width: 16px;
		height: 7px;
		scale: 1 3;
	}

	/* The Kaaba, low in the middle */
	.kaaba-box {
		position: absolute;
		/* Just above the player's bar */
		bottom: clamp(52px, 10%, 96px);
		left: 50%;
		width: min(42vw, 70vh);
		aspect-ratio: 2 / 1;
		translate: -50% 0;
	}

	/* Tawaf: dotted rings of light turning round the Kaaba (seen from above, flattened) */
	.tawaf {
		position: absolute;
		left: 50%;
		top: 88%;
		width: var(--size);
		aspect-ratio: 1;
		translate: -50% -50%;
		scale: 1 0.14;
	}

	.tawaf::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 50%;
		border: 3px dotted rgb(255 250 235 / 0.8);
		animation: turn linear infinite reverse;
		animation-duration: inherit;
	}

	.clock {
		position: absolute;
		width: 46px;
		height: 46px;
		translate: -50% -50%;
		border-radius: 50%;
		background: radial-gradient(circle, #f4fff6 30%, rgb(160 255 190 / 0.55) 55%, transparent 72%);
		animation: blink 4s ease-in-out infinite alternate;
	}

	/* Lamp posts: a slim post and a warm light */
	.post {
		position: absolute;
		bottom: 0;
		width: 3px;
		height: clamp(40px, 9vh, 110px);
		background: #0a0d18;
		animation: none;
	}

	.post::before {
		content: '';
		position: absolute;
		top: -6px;
		left: 50%;
		width: 10px;
		height: 10px;
		translate: -50% 0;
		border-radius: 50%;
		background: rgb(var(--colour));
		box-shadow: 0 0 22px 10px rgb(var(--colour) / 0.45);
		animation: blink 3s ease-in-out infinite alternate;
		animation-delay: inherit;
	}

	.palm {
		position: absolute;
		bottom: 0;
		height: min(42%, 30vw);
		aspect-ratio: 3 / 4;
	}

	.palm.left {
		left: -2%;
	}

	.palm.right {
		right: -2%;
	}

	.crescent {
		position: absolute;
		top: 8%;
		right: 14%;
		width: clamp(40px, 5vw, 76px);
		aspect-ratio: 1;
		border-radius: 50%;
		box-shadow:
			inset clamp(9px, 1.2vw, 18px) clamp(-6px, -0.8vw, -4px) 0 0 #f4efe3,
			-6px 2px 22px -8px rgb(244 239 227 / 0.5);
	}

	/* Darker towards the middle, where the text is: depth, and the words read well */
	.veil {
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse 34% 42% at 50% 46%, rgb(4 8 20 / 0.55), transparent 75%);
		pointer-events: none;
	}

	@keyframes twinkle {
		from {
			opacity: 0.2;
		}
		to {
			opacity: 0.9;
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
			opacity: 0.35;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes sweep {
		0%,
		15% {
			transform: translateX(0);
		}
		85%,
		100% {
			transform: translateX(var(--travel));
		}
	}

	@keyframes blink {
		from {
			opacity: 0.4;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes wave {
		from {
			transform: skewY(-7deg) scaleX(0.9);
		}
		to {
			transform: skewY(6deg) scaleX(1.05);
		}
	}

	@keyframes turn {
		to {
			transform: rotate(360deg);
		}
	}

	/* TVs: fewer pigeons */
	:global([data-device='tv']) .ring-bird:nth-of-type(2n) {
		display: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.twinkle,
		.windows,
		.haze,
		.shaft,
		.sheen,
		.lamp,
		.flag,
		.ring-bird,
		.tawaf::before,
		.clock,
		.post::before {
			animation: none;
		}
	}
</style>
