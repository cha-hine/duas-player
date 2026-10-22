// Renders a holy place at night on a canvas, like a slow film shot: layers drawn once (sky,
// far city, the shrines, the foreground) and moved by a drifting camera with parallax; on top,
// every frame, the living light: god rays turning behind the domes, bloom swelling with the
// reciter's voice, glints running over the gold, flickering lamps, dust floating in the light,
// pigeons circling the domes, flags rippling, and around the Kaaba hundreds of lights for the
// tawaf passing in front of it and behind. No people are drawn.
import * as draw from './draw.ts';
import type { Ctx, Lights, Palette, Point } from './draw.ts';

export type HolyScene = 'kaaba' | 'medine' | 'karbala' | 'najaf' | 'mashhad';

type Dome = { cx: number; base: number; w: number; h: number };
type Plan = {
	sky: [string, string, string, string];
	city: { seed: number; tint: string };
	/** Draws the shrines into the middle layer; returns the main domes (rays, pigeons). */
	shrines: (ctx: Ctx, kit: Kit, lights: Lights) => Dome[];
	flags?: Point[];
	palms?: boolean;
	crescent?: boolean;
	kaaba?: boolean;
	lamp: string;
};
type Kit = { gold: Palette; green: Palette; turquoise: Palette; white: Palette; dark: Palette };

const W0 = 1920;
const H0 = 1080;

function palettes(ctx: Ctx): Kit {
	const lapis = draw.tiles(ctx, 'stars', '#163a72', '#dcb14c');
	const frieze = draw.tiles(ctx, 'diamonds', '#1d4f8f', '#e3c063');
	const greenFrieze = draw.tiles(ctx, 'diamonds', '#0f5a31', '#e3c063');
	const turquoiseTiles = draw.tiles(ctx, 'stars', '#11607d', '#f0e2b0');
	const gold: [string, string, string] = ['#fbe39a', '#d3a03a', '#6b4610'];
	return {
		gold: {
			dome: gold,
			drum: '#9c7424',
			stone: '#22345c',
			tile: lapis,
			frieze,
			glow: '255 205 120'
		},
		green: {
			dome: ['#6fe39d', '#1f8a4c', '#0a3a20'],
			drum: '#15633a',
			stone: '#4a4f60',
			tile: lapis,
			frieze: greenFrieze,
			glow: '120 235 160'
		},
		turquoise: {
			dome: ['#a4ecf7', '#2f8fb3', '#0c3a4f'],
			drum: '#1d6a88',
			stone: '#22345c',
			tile: turquoiseTiles,
			frieze,
			glow: '150 230 255'
		},
		white: {
			dome: ['#ffffff', '#cfd4de', '#6f7686'],
			drum: '#aab1be',
			stone: '#9097a8',
			tile: lapis,
			frieze: greenFrieze,
			glow: '255 236 190'
		},
		dark: {
			dome: ['#3b4058', '#222638', '#0c0e18'],
			drum: '#222638',
			stone: '#1b1e2e',
			tile: lapis,
			frieze,
			glow: '160 255 190'
		}
	};
}

const PLANS: Record<HolyScene, Plan> = {
	karbala: {
		sky: ['#030713', '#0b1630', '#2a2440', '#6a4430'],
		city: { seed: 11, tint: '#1a2340' },
		lamp: '255 214 140',
		palms: true,
		flags: [
			{ x: 330, y: 345 },
			{ x: 1600, y: 412 }
		],
		shrines(ctx, k, l) {
			const hussain = { cx: 330, base: 700, w: 330, h: 300 };
			const abbas = { cx: 1600, base: 720, w: 290, h: 262 };
			draw.minaret(ctx, { x: 110, top: 210, w: 32 }, k.gold, l);
			draw.minaret(ctx, { x: 560, top: 210, w: 32 }, k.gold, l);
			draw.minaret(ctx, { x: 1390, top: 260, w: 30 }, k.gold, l);
			draw.minaret(ctx, { x: 1820, top: 260, w: 30 }, k.gold, l);
			draw.dome(ctx, hussain, k.gold, l);
			draw.dome(ctx, abbas, k.gold, l);
			draw.wall(ctx, { x0: -20, x1: 720, top: 860 }, k.gold);
			draw.wall(ctx, { x0: 1220, x1: 1940, top: 870 }, k.gold);
			draw.iwan(ctx, { cx: 330, top: 790, w: 210 }, k.gold);
			draw.iwan(ctx, { cx: 1600, top: 805, w: 190 }, k.gold);
			return [hussain, abbas];
		}
	},
	najaf: {
		sky: ['#030713', '#0b1630', '#2a2440', '#6a4430'],
		city: { seed: 13, tint: '#1a2340' },
		lamp: '255 214 140',
		palms: true,
		shrines(ctx, k, l) {
			const ali = { cx: 420, base: 690, w: 380, h: 340 };
			draw.minaret(ctx, { x: 140, top: 170, w: 36 }, k.gold, l);
			draw.minaret(ctx, { x: 700, top: 170, w: 36 }, k.gold, l);
			draw.dome(ctx, ali, k.gold, l);
			draw.dome(ctx, { cx: 1790, base: 820, w: 140, h: 120 }, k.gold, l);
			draw.clockTower(ctx, { x: 1560, top: 470, w: 96 }, k.gold, l);
			draw.wall(ctx, { x0: -20, x1: 840, top: 860 }, k.gold);
			draw.wall(ctx, { x0: 1140, x1: 1940, top: 875 }, k.gold);
			draw.iwan(ctx, { cx: 420, top: 770, w: 250, gold: true }, k.gold);
			draw.iwan(ctx, { cx: 1340, top: 810, w: 190 }, k.gold);
			return [ali];
		}
	},
	medine: {
		sky: ['#020c14', '#0a2030', '#1b3838', '#4a4630'],
		city: { seed: 17, tint: '#16302f' },
		lamp: '150 240 170',
		palms: true,
		crescent: true,
		shrines(ctx, k, l) {
			const green = { cx: 420, base: 700, w: 320, h: 300 };
			draw.minaret(ctx, { x: 120, top: 150, w: 32 }, k.white, l);
			draw.minaret(ctx, { x: 1460, top: 160, w: 32 }, k.white, l);
			draw.minaret(ctx, { x: 1780, top: 230, w: 30 }, k.white, l);
			draw.dome(ctx, green, k.green, l);
			draw.dome(ctx, { cx: 720, base: 790, w: 120, h: 112 }, k.white, l);
			draw.wall(ctx, { x0: -20, x1: 820, top: 860 }, k.white);
			draw.wall(ctx, { x0: 1180, x1: 1940, top: 870 }, k.white);
			draw.iwan(ctx, { cx: 1620, top: 800, w: 190 }, k.white);
			// The courtyard's great umbrellas, open
			for (const [x, y] of [
				[1280, 900],
				[1460, 885],
				[1800, 905]
			]) {
				ctx.fillStyle = '#d8d3c6';
				ctx.fillRect(x - 4, y, 8, 1080 - y);
				const g = ctx.createLinearGradient(x - 110, y - 80, x + 110, y);
				g.addColorStop(0, '#ffffff');
				g.addColorStop(1, '#b9b3a4');
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.moveTo(x - 120, y);
				ctx.quadraticCurveTo(x, y - 95, x + 120, y);
				for (let i = 6; i >= 0; i--)
					ctx.quadraticCurveTo(x - 120 + i * 40 + 20, y - 18, x - 120 + i * 40, y);
				ctx.fill();
				l.lamps.push({ x, y: y - 20 });
			}
			return [green];
		}
	},
	mashhad: {
		sky: ['#030816', '#0c1d38', '#1b344f', '#4a4436'],
		city: { seed: 19, tint: '#18304a' },
		lamp: '190 240 255',
		shrines(ctx, k, l) {
			const reza = { cx: 400, base: 700, w: 330, h: 300 };
			const goharshad = { cx: 1540, base: 710, w: 340, h: 280 };
			draw.minaret(ctx, { x: 640, top: 200, w: 34 }, k.gold, l);
			draw.minaret(ctx, { x: 1290, top: 190, w: 34 }, k.turquoise, l);
			draw.minaret(ctx, { x: 1810, top: 190, w: 34 }, k.turquoise, l);
			draw.dome(ctx, reza, k.gold, l);
			draw.dome(ctx, goharshad, k.turquoise, l);
			draw.wall(ctx, { x0: -20, x1: 800, top: 860 }, k.gold);
			draw.wall(ctx, { x0: 1160, x1: 1940, top: 860 }, k.turquoise);
			draw.iwan(ctx, { cx: 400, top: 770, w: 250, gold: true }, k.gold);
			draw.iwan(ctx, { cx: 1540, top: 740, w: 300 }, k.turquoise);
			return [reza, goharshad];
		}
	},
	kaaba: {
		sky: ['#02050f', '#0a1430', '#2b2944', '#70503a'],
		city: { seed: 7, tint: '#1c2238' },
		lamp: '255 236 180',
		kaaba: true,
		shrines(ctx, k, l) {
			// Abraj al-Bait over the hotels, its clock lit green
			const t = { x: 1660, w: 190 };
			const tower = ctx.createLinearGradient(t.x - t.w / 2, 0, t.x + t.w / 2, 0);
			tower.addColorStop(0, '#2a2f48');
			tower.addColorStop(0.4, '#3c4262');
			tower.addColorStop(1, '#141726');
			ctx.fillStyle = tower;
			ctx.fillRect(t.x - t.w / 2, 260, t.w, 820);
			ctx.fillRect(t.x - t.w * 0.38, 140, t.w * 0.76, 140);
			ctx.fillRect(t.x - t.w * 0.22, 70, t.w * 0.44, 80);
			ctx.fillStyle = '#e8c867';
			ctx.fillRect(t.x - 3, -10, 6, 85);
			ctx.save();
			ctx.shadowColor = 'rgba(120,255,170,0.9)';
			ctx.shadowBlur = 40;
			ctx.beginPath();
			ctx.arc(t.x, 210, 58, 0, Math.PI * 2);
			ctx.fillStyle = '#d8ffe4';
			ctx.fill();
			ctx.restore();
			ctx.strokeStyle = '#2f8a52';
			ctx.lineWidth = 5;
			ctx.beginPath();
			ctx.arc(t.x, 210, 50, 0, Math.PI * 2);
			ctx.stroke();
			ctx.lineWidth = 3;
			for (let i = 0; i < 12; i++) {
				const a = (i / 12) * Math.PI * 2;
				ctx.beginPath();
				ctx.moveTo(t.x + Math.cos(a) * 40, 210 + Math.sin(a) * 40);
				ctx.lineTo(t.x + Math.cos(a) * 47, 210 + Math.sin(a) * 47);
				ctx.stroke();
			}
			ctx.strokeStyle = '#1b3a28';
			ctx.lineWidth = 4;
			ctx.beginPath();
			ctx.moveTo(t.x, 210);
			ctx.lineTo(t.x, 172);
			ctx.moveTo(t.x, 210);
			ctx.lineTo(t.x + 26, 222);
			ctx.stroke();
			ctx.fillStyle = '#2f8a52';
			ctx.font = 'bold 22px serif';
			ctx.textAlign = 'center';
			ctx.fillText('الله أكبر', t.x, 138);
			l.lamps.push({ x: t.x, y: 210 });
			for (let i = 0; i < 40; i++) {
				ctx.fillStyle = i % 3 ? 'rgba(255,215,140,0.55)' : 'rgba(255,240,200,0.85)';
				ctx.fillRect(t.x - t.w / 2 + 14 + (i % 8) * 21, 330 + Math.floor(i / 8) * 70, 9, 30);
			}
			ctx.fillStyle = '#171a2b';
			ctx.fillRect(1300, 560, 260, 520);
			ctx.fillRect(1760, 600, 200, 480);
			draw.minaret(ctx, { x: 150, top: 220, w: 30 }, k.white, l);
			draw.minaret(ctx, { x: 380, top: 190, w: 30 }, k.white, l);
			draw.minaret(ctx, { x: 610, top: 240, w: 30 }, k.white, l);
			draw.minaret(ctx, { x: 1380, top: 260, w: 30 }, k.white, l);
			draw.wall(ctx, { x0: -20, x1: 700, top: 820 }, k.white);
			draw.wall(ctx, { x0: 1230, x1: 1940, top: 830 }, k.white);
			// The mataf, white marble catching the light
			const floor = ctx.createRadialGradient(960, 945, 40, 960, 945, 560);
			floor.addColorStop(0, 'rgba(255,248,230,0.55)');
			floor.addColorStop(1, 'rgba(255,248,230,0)');
			ctx.fillStyle = floor;
			ctx.beginPath();
			ctx.ellipse(960, 945, 640, 105, 0, 0, Math.PI * 2);
			ctx.fill();
			return [];
		}
	}
};

/** A soft round glow, drawn many times. */
function glowSprite(colour: string) {
	const c = draw.surface(64, 64);
	const t = c.getContext('2d')!;
	const g = t.createRadialGradient(32, 32, 0, 32, 32, 32);
	g.addColorStop(0, `rgba(${colour.replaceAll(' ', ',')},1)`);
	g.addColorStop(0.25, `rgba(${colour.replaceAll(' ', ',')},0.5)`);
	g.addColorStop(1, `rgba(${colour.replaceAll(' ', ',')},0)`);
	t.fillStyle = g;
	t.fillRect(0, 0, 64, 64);
	return c;
}

/** God rays: soft wedges of light around a centre, drawn once. */
function raysSprite(colour: string) {
	const c = draw.surface(512, 512);
	const t = c.getContext('2d')!;
	t.translate(256, 256);
	let s = 5;
	const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
	for (let i = 0; i < 34; i++) {
		const a = (i / 34) * Math.PI * 2 + rand() * 0.1;
		const w = 0.03 + rand() * 0.06;
		const g = t.createRadialGradient(0, 0, 0, 0, 0, 256);
		const alpha = 0.05 + rand() * 0.1;
		g.addColorStop(0, `rgba(${colour.replaceAll(' ', ',')},${alpha * 2})`);
		g.addColorStop(1, `rgba(${colour.replaceAll(' ', ',')},0)`);
		t.fillStyle = g;
		t.beginPath();
		t.moveTo(0, 0);
		t.arc(0, 0, 256, a - w, a + w);
		t.fill();
	}
	return c;
}

export type Renderer = { stop: () => void; resize: () => void };

/**
 * Starts rendering `scene` on `canvas`. `level` gives the voice's loudness (0..1). `tv`:
 * fewer pixels, frames and particles for the weak graphics chips of TVs.
 */
export function holyRenderer(
	canvas: HTMLCanvasElement,
	scene: HolyScene,
	level: () => number,
	tv: boolean
): Renderer {
	const plan = PLANS[scene];
	const ctx = canvas.getContext('2d')!;
	const RES = tv ? 0.5 : Math.min(1, 0.75 * (window.devicePixelRatio || 1));
	const FPS = tv ? 24 : 30;
	const MARGIN = 0.06;
	const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

	let W = 0;
	let H = 0;
	let scale = 1;
	let ox = 0;
	let oy = 0;
	let layers: Record<
		'sky' | 'far' | 'mid' | 'bloom' | 'kaaba' | 'front' | 'veil',
		HTMLCanvasElement
	>;
	let lights: Lights = { glints: [], lamps: [] };
	let domes: Dome[] = [];
	const glow = glowSprite(plan.lamp);
	const white = glowSprite('255 250 235');
	const rays = raysSprite(scene === 'medine' ? '170 255 200' : '255 225 160');

	/** Design point to layer pixels (layers are larger than the screen by the margin). */
	const toLayer = (p: Point) => ({ x: ox + p.x * scale, y: oy + p.y * scale });

	function layer(paint: (c: Ctx) => void) {
		const c = draw.surface(W * (1 + MARGIN * 2), H * (1 + MARGIN * 2));
		const t = c.getContext('2d')!;
		t.translate(W * MARGIN, H * MARGIN);
		paint(t);
		return c;
	}

	/** In design units, scaled to cover the screen: by height, or by width on tall screens. */
	function withDesign(t: Ctx, paint: () => void) {
		t.save();
		t.translate(ox, oy);
		t.scale(scale, scale);
		paint();
		t.restore();
	}

	function build() {
		W = Math.max(1, Math.round(canvas.clientWidth * RES));
		H = Math.max(1, Math.round(canvas.clientHeight * RES));
		canvas.width = W;
		canvas.height = H;
		scale = W / H < 1.2 ? (W / W0) * 1.15 : H / H0;
		ox = (W - W0 * scale) / 2;
		oy = H - H0 * scale;
		lights = { glints: [], lamps: [] };

		layers = {
			sky: layer((t) => {
				const g = t.createLinearGradient(0, -H * MARGIN, 0, H);
				g.addColorStop(0, plan.sky[0]);
				g.addColorStop(0.5, plan.sky[1]);
				g.addColorStop(0.8, plan.sky[2]);
				g.addColorStop(1, plan.sky[3]);
				t.fillStyle = g;
				t.fillRect(-W * MARGIN, -H * MARGIN, W * (1 + MARGIN * 2), H * (1 + MARGIN * 2));
				let s = 3;
				const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
				for (let i = 0; i < 260; i++) {
					const x = rand() * W * 1.1 - W * 0.05;
					const y = rand() * H * 0.7 - H * 0.05;
					t.globalAlpha = 0.2 + rand() * 0.7;
					t.fillStyle = '#f4efe3';
					t.fillRect(x, y, rand() < 0.1 ? 2 : 1, rand() < 0.1 ? 2 : 1);
				}
				t.globalAlpha = 1;
				if (plan.crescent) {
					const cx = W * 0.82;
					const cy = H * 0.13;
					const r = Math.max(14, H * 0.045);
					const moon = draw.surface(r * 4, r * 4);
					const m = moon.getContext('2d')!;
					m.fillStyle = '#f6f0de';
					m.beginPath();
					m.arc(r * 2, r * 2, r, 0, Math.PI * 2);
					m.fill();
					m.globalCompositeOperation = 'destination-out';
					m.beginPath();
					m.arc(r * 2 + r * 0.42, r * 2 - r * 0.18, r * 0.85, 0, Math.PI * 2);
					m.fill();
					t.shadowColor = 'rgba(255,250,230,0.8)';
					t.shadowBlur = r * 0.8;
					t.drawImage(moon, cx - r * 2, cy - r * 2);
					t.shadowBlur = 0;
				}
				// The glow of the city on the horizon
				const h = t.createRadialGradient(W / 2, H * 1.05, 0, W / 2, H * 1.05, W * 0.7);
				h.addColorStop(0, 'rgba(255,190,110,0.35)');
				h.addColorStop(1, 'rgba(255,190,110,0)');
				t.fillStyle = h;
				t.fillRect(-W * MARGIN, 0, W * (1 + MARGIN * 2), H);
			}),
			far: layer((t) =>
				withDesign(t, () => {
					t.globalAlpha = 0.55;
					draw.city(t, plan.city.seed, H0 - 150, plan.city.tint);
					t.globalAlpha = 1;
				})
			),
			mid: layer((t) =>
				withDesign(t, () => {
					domes = plan.shrines(t, palettes(t), lights);
				})
			),
			kaaba: layer((t) => {
				if (plan.kaaba) withDesign(t, () => draw.kaaba(t, { cx: 960, base: 930, size: 270 }));
			}),
			front: layer((t) =>
				withDesign(t, () => {
					if (plan.palms) {
						draw.palm(t, -10, H0, 340, false);
						draw.palm(t, 1935, H0, 310, true);
					}
					// Lamp posts along the ground
					for (let i = 0; i < 6; i++) {
						const x = 720 + i * 96;
						t.fillStyle = '#080a12';
						t.fillRect(x - 3, H0 - 150, 6, 150);
						t.fillRect(x - 12, H0 - 154, 24, 6);
						lights.lamps.push({ x, y: H0 - 160 });
					}
				})
			),
			bloom: draw.surface(1, 1),
			veil: layer((t) => {
				const g = t.createRadialGradient(
					W / 2,
					H * 0.44,
					0,
					W / 2,
					H * 0.44,
					Math.max(W, H) * 0.45
				);
				g.addColorStop(0, 'rgba(3,6,16,0.55)');
				g.addColorStop(1, 'rgba(3,6,16,0)');
				t.fillStyle = g;
				t.fillRect(-W * MARGIN, -H * MARGIN, W * (1 + MARGIN * 2), H * (1 + MARGIN * 2));
				const v = t.createRadialGradient(
					W / 2,
					H / 2,
					Math.min(W, H) * 0.4,
					W / 2,
					H / 2,
					Math.max(W, H) * 0.8
				);
				v.addColorStop(0, 'rgba(0,0,0,0)');
				v.addColorStop(1, 'rgba(0,0,0,0.5)');
				t.fillStyle = v;
				t.fillRect(-W * MARGIN, -H * MARGIN, W * (1 + MARGIN * 2), H * (1 + MARGIN * 2));
			})
		};
		// Bloom: a blurred copy of the shrines, added on top (brighter with the voice)
		const bloom = draw.surface(layers.mid.width / 4, layers.mid.height / 4);
		const b = bloom.getContext('2d')!;
		b.filter = 'blur(6px) brightness(1.4)';
		b.drawImage(layers.mid, 0, 0, bloom.width, bloom.height);
		layers.bloom = bloom;
	}

	// ——— Moving things ———

	let seed = 9;
	const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
	const birds = Array.from({ length: tv ? 10 : 18 }, (_, i) => ({
		dome: i % 2,
		angle: rand() * Math.PI * 2,
		speed: 0.22 + rand() * 0.14,
		radius: 0.75 + rand() * 0.45,
		height: rand(),
		flap: rand() * 10
	}));
	const dust = Array.from({ length: tv ? 40 : 90 }, () => ({
		x: rand() * W0,
		y: 300 + rand() * 700,
		speed: 6 + rand() * 14,
		sway: rand() * 6,
		size: 0.6 + rand() * 1.6
	}));
	const tawaf = plan.kaaba
		? Array.from({ length: tv ? 320 : 700 }, () => ({
				angle: rand() * Math.PI * 2,
				ring: 200 + Math.pow(rand(), 0.7) * 300,
				speed: 0.05 + rand() * 0.035,
				bright: 0.4 + rand() * 0.6
			}))
		: [];
	const glintPhase = Array.from({ length: 200 }, () => rand() * 20);

	let camX = 0;
	let camY = 0;
	let zoom = 1;
	let energy = 0;
	let frame = 0;
	let last = 0;
	const start = performance.now();
	let shooting = { at: 4, x: 0, y: 0, a: 0 };

	/** Draws a layer through the camera, moving `depth` times as much as the shrines. */
	function blit(
		c: HTMLCanvasElement,
		depth: number,
		alpha = 1,
		mode: GlobalCompositeOperation = 'source-over'
	) {
		const z = 1 + (zoom - 1) * depth;
		ctx.globalAlpha = alpha;
		ctx.globalCompositeOperation = mode;
		ctx.setTransform(z, 0, 0, z, (W / 2) * (1 - z) + camX * depth, H * (1 - z) + camY * depth);
		ctx.drawImage(c, -W * MARGIN, -H * MARGIN, W * (1 + MARGIN * 2), H * (1 + MARGIN * 2));
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
	}

	/** A design point as seen through the camera, at the shrines' depth. */
	function screen(p: Point, depth = 1) {
		const q = toLayer(p);
		const z = 1 + (zoom - 1) * depth;
		return {
			x: q.x * z + (W / 2) * (1 - z) + camX * depth,
			y: q.y * z + H * (1 - z) + camY * depth,
			z
		};
	}

	function sprite(img: HTMLCanvasElement, x: number, y: number, size: number, alpha: number) {
		ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
		ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
	}

	function drawBird(x: number, y: number, size: number, flap: number, alpha: number) {
		const up = Math.sin(flap) * size * 0.45;
		ctx.globalAlpha = alpha;
		ctx.beginPath();
		ctx.moveTo(x - size, y - up);
		ctx.quadraticCurveTo(x - size * 0.45, y - size * 0.25 - up * 0.3, x, y);
		ctx.quadraticCurveTo(x + size * 0.45, y - size * 0.25 - up * 0.3, x + size, y - up);
		ctx.stroke();
	}

	function birdsPass(t: number, front: boolean) {
		if (!domes.length) return;
		ctx.strokeStyle = '#efe9da';
		ctx.lineWidth = Math.max(1, scale * 3);
		ctx.lineCap = 'round';
		for (const b of birds) {
			const d = domes[b.dome % domes.length];
			const a = b.angle + t * b.speed;
			const depth = Math.sin(a);
			if (front !== depth > 0) continue;
			const p = screen({
				x: d.cx + Math.cos(a) * d.w * b.radius,
				y:
					d.base -
					d.h * (0.6 + b.height * 0.7) +
					depth * d.w * 0.18 +
					Math.sin(t * 0.7 + b.flap) * 14
			});
			drawBird(p.x, p.y, scale * (10 + depth * 4) * p.z, t * 11 + b.flap, front ? 0.95 : 0.55);
		}
		ctx.globalAlpha = 1;
	}

	function tawafPass(t: number, front: boolean) {
		ctx.globalCompositeOperation = 'lighter';
		for (const p of tawaf) {
			const a = p.angle - t * p.speed;
			const depth = Math.sin(a);
			if (front !== depth > 0) continue;
			const s = screen({ x: 960 + Math.cos(a) * p.ring * 1.3, y: 925 + depth * p.ring * 0.17 });
			const size = scale * (front ? 7 : 5) * s.z;
			sprite(white, s.x, s.y, size * 2.2, p.bright * (front ? 0.85 : 0.5));
		}
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = 1;
	}

	function flags(t: number) {
		for (const [i, f] of (plan.flags ?? []).entries()) {
			const pole = screen(f);
			const w = 78 * scale * pole.z;
			const h = 46 * scale * pole.z;
			ctx.fillStyle = '#e8c867';
			ctx.fillRect(pole.x - 1.5, pole.y - h * 0.2, 3, h * 1.6);
			const strips = 12;
			for (let s = 0; s < strips; s++) {
				const wave = (k: number) => Math.sin(t * 4.2 - k * 0.55 + i) * h * 0.22 * (k / strips);
				const x0 = pole.x + (w * s) / strips;
				const x1 = pole.x + (w * (s + 1)) / strips;
				const slope = Math.cos(t * 4.2 - s * 0.55 + i);
				const light = 40 + slope * 14;
				ctx.fillStyle = `hsl(356 78% ${light}%)`;
				ctx.beginPath();
				ctx.moveTo(x0, pole.y + wave(s));
				ctx.lineTo(x1 + 0.5, pole.y + wave(s + 1));
				ctx.lineTo(x1 + 0.5, pole.y + h + wave(s + 1));
				ctx.lineTo(x0, pole.y + h + wave(s));
				ctx.closePath();
				ctx.fill();
			}
		}
	}

	function render(now: number) {
		const t = (now - start) / 1000;
		const target = level();
		energy += (target - energy) * (target > energy ? 0.15 : 0.04);
		// A slow drifting camera: a gentle pan, rise and push-in
		camX = Math.sin(t * 0.045) * W * 0.018;
		camY = Math.sin(t * 0.031) * H * 0.008;
		zoom = 1.025 + Math.sin(t * 0.027) * 0.02;

		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, W, H);
		blit(layers.sky, 0.15);

		// Twinkling stars and, now and then, a shooting star
		ctx.globalCompositeOperation = 'lighter';
		for (let i = 0; i < 24; i++) {
			const x = ((i * 397) % 1000) / 1000;
			const y = ((i * 211) % 1000) / 1000;
			const a = Math.pow(Math.max(0, Math.sin(t * (0.8 + (i % 5) * 0.3) + i)), 6);
			sprite(white, x * W, y * H * 0.55, 10 * RES + 6, a * 0.9);
		}
		if (t > shooting.at + 1.2)
			shooting = {
				at: t + 5 + rand() * 7,
				x: rand(),
				y: rand() * 0.25,
				a: rand() < 0.5 ? 0.35 : Math.PI - 0.35
			};
		if (t > shooting.at && t < shooting.at + 1.2) {
			const k = (t - shooting.at) / 1.2;
			const x = shooting.x * W + Math.cos(shooting.a) * k * W * 0.25;
			const y = shooting.y * H + Math.sin(shooting.a) * k * W * 0.25;
			const g = ctx.createLinearGradient(
				x,
				y,
				x - Math.cos(shooting.a) * W * 0.08,
				y - Math.sin(shooting.a) * W * 0.08
			);
			g.addColorStop(0, `rgba(255,255,255,${(1 - k) * 0.9})`);
			g.addColorStop(1, 'rgba(255,255,255,0)');
			ctx.strokeStyle = g;
			ctx.lineWidth = Math.max(1, RES * 2);
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x - Math.cos(shooting.a) * W * 0.08, y - Math.sin(shooting.a) * W * 0.08);
			ctx.stroke();
		}
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = 1;

		blit(layers.far, 0.45);
		// Haze between the city and the shrines
		const haze = ctx.createLinearGradient(0, H * 0.55, 0, H);
		haze.addColorStop(0, 'rgba(150,140,180,0)');
		haze.addColorStop(0.6, `rgba(200,170,150,${0.1 + Math.sin(t * 0.2) * 0.03})`);
		haze.addColorStop(1, 'rgba(150,140,180,0)');
		ctx.fillStyle = haze;
		ctx.fillRect(0, H * 0.55, W, H * 0.45);

		// God rays turning slowly behind the domes, stronger with the voice
		ctx.globalCompositeOperation = 'lighter';
		for (const [i, d] of domes.entries()) {
			const p = screen({ x: d.cx, y: d.base - d.h * 0.7 });
			const size = d.w * scale * 7;
			ctx.save();
			ctx.globalAlpha = 0.22 + energy * 0.4;
			ctx.translate(p.x, p.y);
			ctx.rotate(t * 0.02 * (i % 2 ? -1 : 1));
			ctx.drawImage(rays, -size / 2, -size / 2, size, size);
			ctx.restore();
		}
		if (plan.kaaba) {
			const p = screen({ x: 960, y: 850 });
			const size = 1500 * scale;
			ctx.save();
			ctx.globalAlpha = 0.25 + energy * 0.4;
			ctx.translate(p.x, p.y);
			ctx.rotate(t * 0.015);
			ctx.drawImage(rays, -size / 2, -size / 2, size, size);
			ctx.restore();
		}
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = 1;

		birdsPass(t, false);
		blit(layers.mid, 1);
		if (plan.kaaba) {
			tawafPass(t, false);
			blit(layers.kaaba, 1);
			tawafPass(t, true);
		}
		// Bloom on everything that shines, swelling with the voice
		blit(layers.bloom, 1, 0.45 + energy * 0.45, 'lighter');
		flags(t);
		birdsPass(t, true);

		// Glints running over the gold, lamps flickering, dust floating in the light
		ctx.globalCompositeOperation = 'lighter';
		for (const [i, g] of lights.glints.entries()) {
			const a = Math.pow(Math.max(0, Math.sin(t * 0.9 + glintPhase[i % glintPhase.length])), 18);
			if (a < 0.02) continue;
			const p = screen(g);
			sprite(white, p.x, p.y, 34 * scale * p.z, a);
			ctx.globalAlpha = a * 0.8;
			ctx.fillStyle = '#fff8e0';
			ctx.fillRect(p.x - 18 * scale, p.y - 0.75, 36 * scale, 1.5);
			ctx.fillRect(p.x - 0.75, p.y - 18 * scale, 1.5, 36 * scale);
		}
		for (const [i, l] of lights.lamps.entries()) {
			const flicker = 0.65 + Math.sin(t * 7 + i * 1.7) * 0.08 + Math.sin(t * 13 + i) * 0.06;
			const p = screen(l, l.y > H0 - 200 ? 1.25 : 1);
			sprite(glow, p.x, p.y, 70 * scale * p.z, flicker);
		}
		for (const m of dust) {
			const y = ((m.y - t * m.speed) % 800) + (m.y - t * m.speed < 0 ? 800 : 0) + 250;
			const p = screen({ x: m.x + Math.sin(t * 0.5 + m.sway) * 20, y });
			sprite(glow, p.x, p.y, m.size * 9 * scale * 2, 0.35);
		}
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = 1;

		blit(layers.front, 1.25);
		blit(layers.veil, 0);
	}

	function loop(now: number) {
		frame = requestAnimationFrame(loop);
		if (now - last < 1000 / FPS - 2) return;
		last = now;
		render(now);
	}

	build();
	if (reduce) render(performance.now());
	else frame = requestAnimationFrame(loop);

	return {
		stop: () => cancelAnimationFrame(frame),
		resize: () => {
			build();
			if (reduce) render(performance.now());
		}
	};
}
