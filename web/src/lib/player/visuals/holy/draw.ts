// Drawing of the holy places on a 2D canvas, in a 1920 × 1080 design frame (ground at
// y = 1080). Each piece is shaded like an object under light: domes with roundness and a
// specular gleam, minarets as cylinders, tiles as a real pattern, lit arches. Everything that
// shines is also listed (glints, lamps) for the animation to bring to life.

export type Ctx = CanvasRenderingContext2D;
export type Point = { x: number; y: number };

export type Palette = {
	/** Light, middle and dark tones of the dome (gold, green, turquoise, silver). */
	dome: [string, string, string];
	drum: string;
	stone: string;
	tile: CanvasPattern | string;
	frieze: CanvasPattern | string;
	glow: string;
};

/** Points the animation lights up: glints on gold, lamps. */
export type Lights = { glints: Point[]; lamps: Point[] };

const GOLD: [string, string, string] = ['#fbe39a', '#d3a03a', '#6b4610'];

/** A small canvas, for patterns and sprites. */
export function surface(w: number, h: number) {
	const c = document.createElement('canvas');
	c.width = Math.max(1, Math.round(w));
	c.height = Math.max(1, Math.round(h));
	return c;
}

/** Repeating tiles: eight-pointed stars on lapis, or diamonds for friezes. */
export function tiles(ctx: Ctx, kind: 'stars' | 'diamonds', base: string, motif: string) {
	const s = kind === 'stars' ? 22 : 16;
	const c = surface(s, s);
	const t = c.getContext('2d')!;
	t.fillStyle = base;
	t.fillRect(0, 0, s, s);
	t.fillStyle = motif;
	if (kind === 'stars') {
		const m = s / 2;
		t.beginPath();
		for (let i = 0; i < 16; i++) {
			const r = i % 2 === 0 ? s * 0.42 : s * 0.18;
			const a = (i / 16) * Math.PI * 2;
			t.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r);
		}
		t.fill();
		t.fillStyle = '#6fc3e0';
		for (const [x, y] of [
			[0, 0],
			[s, 0],
			[0, s],
			[s, s]
		]) {
			t.beginPath();
			t.arc(x, y, 2.5, 0, Math.PI * 2);
			t.fill();
		}
	} else {
		t.beginPath();
		t.moveTo(s / 2, 1);
		t.lineTo(s - 1, s / 2);
		t.lineTo(s / 2, s - 1);
		t.lineTo(1, s / 2);
		t.fill();
	}
	return ctx.createPattern(c, 'repeat')!;
}

/** A horizontal cylinder shading over a vertical band: dark edges, light just left of centre. */
function cylinder(ctx: Ctx, x0: number, x1: number, light: string, mid: string, dark: string) {
	const g = ctx.createLinearGradient(x0, 0, x1, 0);
	g.addColorStop(0, dark);
	g.addColorStop(0.32, light);
	g.addColorStop(0.55, mid);
	g.addColorStop(1, dark);
	return g;
}

function onion(ctx: Ctx, cx: number, base: number, w: number, h: number) {
	const l = cx - w / 2;
	const r = cx + w / 2;
	const top = base - h;
	ctx.beginPath();
	ctx.moveTo(l, base);
	ctx.bezierCurveTo(l - w * 0.04, base - h * 0.55, cx - w * 0.3, top + h * 0.1, cx, top);
	ctx.bezierCurveTo(cx + w * 0.3, top + h * 0.1, r + w * 0.04, base - h * 0.55, r, base);
	ctx.closePath();
}

/** A crescent finial on a pole, gold. */
function finial(ctx: Ctx, cx: number, top: number, size: number) {
	ctx.fillStyle = cylinder(ctx, cx - size * 0.12, cx + size * 0.12, GOLD[0], GOLD[1], GOLD[2]);
	ctx.fillRect(cx - size * 0.05, top - size * 1.2, size * 0.1, size * 1.2);
	for (const [y, r] of [
		[top - size * 0.35, 0.16],
		[top - size * 0.8, 0.12]
	]) {
		ctx.beginPath();
		ctx.ellipse(cx, y, size * r, size * r * 0.8, 0, 0, Math.PI * 2);
		ctx.fillStyle = GOLD[0];
		ctx.fill();
	}
	ctx.save();
	ctx.translate(cx, top - size * 1.55);
	ctx.beginPath();
	ctx.arc(0, 0, size * 0.34, Math.PI * 0.15, Math.PI * 1.85, false);
	ctx.arc(size * 0.13, -size * 0.04, size * 0.27, Math.PI * 1.75, Math.PI * 0.25, true);
	ctx.closePath();
	ctx.fillStyle = GOLD[0];
	ctx.shadowColor = 'rgba(255,220,140,0.9)';
	ctx.shadowBlur = size * 0.4;
	ctx.fill();
	ctx.restore();
}

/** An onion dome on its drum, with ribs, roundness, a specular gleam and its finial. */
export function dome(
	ctx: Ctx,
	d: { cx: number; base: number; w: number; h: number },
	p: Palette,
	lights: Lights
) {
	const { cx, base, w, h } = d;
	// Drum: a short cylinder with a tiled band and lit windows
	const dw = w * 0.9;
	const dh = h * 0.42;
	ctx.fillStyle = cylinder(ctx, cx - dw / 2, cx + dw / 2, '#e9cf8a', p.drum, '#2a1d08');
	ctx.fillRect(cx - dw / 2, base, dw, dh);
	ctx.fillStyle = p.frieze;
	ctx.fillRect(cx - dw / 2, base + dh * 0.1, dw, dh * 0.2);
	ctx.fillStyle = 'rgba(0,0,0,0.25)';
	ctx.fillRect(cx - dw / 2, base, dw, 4);
	for (let i = 0; i < 9; i++) {
		const x = cx - dw * 0.42 + (dw * 0.84 * i) / 8;
		const ww = dw * 0.045;
		ctx.beginPath();
		ctx.moveTo(x - ww, base + dh * 0.95);
		ctx.lineTo(x - ww, base + dh * 0.5);
		ctx.arc(x, base + dh * 0.5, ww, Math.PI, 0);
		ctx.lineTo(x + ww, base + dh * 0.95);
		ctx.closePath();
		const g = ctx.createLinearGradient(0, base + dh * 0.4, 0, base + dh);
		g.addColorStop(0, '#fff2c4');
		g.addColorStop(1, '#e49a3a');
		ctx.fillStyle = g;
		ctx.fill();
	}
	// Dome body: light from the upper left
	onion(ctx, cx, base, w, h);
	const body = ctx.createLinearGradient(cx - w / 2, base - h, cx + w / 2, base);
	body.addColorStop(0, p.dome[0]);
	body.addColorStop(0.45, p.dome[1]);
	body.addColorStop(1, p.dome[2]);
	ctx.fillStyle = body;
	ctx.fill();
	// Roundness: darker towards the rim
	ctx.save();
	onion(ctx, cx, base, w, h);
	ctx.clip();
	const round = ctx.createRadialGradient(
		cx - w * 0.12,
		base - h * 0.55,
		w * 0.05,
		cx,
		base - h * 0.4,
		w * 0.62
	);
	round.addColorStop(0, 'rgba(255,255,255,0.35)');
	round.addColorStop(0.5, 'rgba(255,255,255,0)');
	round.addColorStop(1, 'rgba(0,0,0,0.45)');
	ctx.fillStyle = round;
	ctx.fillRect(cx - w, base - h * 1.1, w * 2, h * 1.2);
	// Ribs
	ctx.strokeStyle = 'rgba(60,35,5,0.28)';
	ctx.lineWidth = Math.max(1, w * 0.006);
	for (let i = 1; i < 14; i++) {
		const x = cx - w / 2 + (w * i) / 14;
		ctx.beginPath();
		ctx.moveTo(x, base);
		ctx.quadraticCurveTo(cx + (x - cx) * 1.02, base - h * 0.62, cx, base - h);
		ctx.stroke();
	}
	// Specular gleam
	const spec = ctx.createRadialGradient(
		cx - w * 0.2,
		base - h * 0.62,
		0,
		cx - w * 0.2,
		base - h * 0.62,
		w * 0.2
	);
	spec.addColorStop(0, 'rgba(255,255,240,0.75)');
	spec.addColorStop(1, 'rgba(255,255,240,0)');
	ctx.fillStyle = spec;
	ctx.fillRect(cx - w, base - h * 1.1, w * 2, h * 1.2);
	ctx.restore();
	// A thin dark rim where it meets the drum
	ctx.fillStyle = 'rgba(30,18,4,0.55)';
	ctx.fillRect(cx - w * 0.5, base - 3, w, 6);
	finial(ctx, cx, base - h + 4, w * 0.16);
	// Glints along the dome's light side
	for (let i = 0; i < 10; i++) {
		const t = (i + 0.5) / 10;
		const a = Math.PI * (0.62 + t * 0.7);
		lights.glints.push({
			x: cx + Math.cos(a) * w * 0.42,
			y: base - h * 0.45 - Math.sin(a) * h * 0.48
		});
	}
}

/** A minaret: base, shaft, three balconies with muqarnas, a lit lantern, a cap and finial. */
export function minaret(
	ctx: Ctx,
	m: { x: number; top: number; w: number; ground?: number },
	p: Palette,
	lights: Lights
) {
	const { x, top, w } = m;
	const ground = m.ground ?? 1080;
	const h = ground - top;
	const shade = (x0: number, x1: number) => cylinder(ctx, x0, x1, p.dome[0], p.dome[1], p.dome[2]);
	// Base
	ctx.fillStyle = shade(x - w * 0.85, x + w * 0.85);
	ctx.fillRect(x - w * 0.85, ground - h * 0.12, w * 1.7, h * 0.12);
	// Shaft, tapering slightly
	ctx.beginPath();
	ctx.moveTo(x - w / 2, ground - h * 0.12);
	ctx.lineTo(x - w * 0.42, top + h * 0.1);
	ctx.lineTo(x + w * 0.42, top + h * 0.1);
	ctx.lineTo(x + w / 2, ground - h * 0.12);
	ctx.closePath();
	ctx.fillStyle = shade(x - w / 2, x + w / 2);
	ctx.fill();
	// Tile bands
	for (const t of [0.2, 0.47, 0.74]) {
		ctx.fillStyle = p.frieze;
		ctx.fillRect(x - w * 0.46, top + h * t + 18, w * 0.92, 10);
	}
	// Balconies with their muqarnas and a lamp
	for (const t of [0.17, 0.44, 0.71]) {
		const y = top + h * t;
		ctx.beginPath();
		ctx.ellipse(x, y, w * 1.05, 6, 0, 0, Math.PI * 2);
		ctx.fillStyle = shade(x - w * 1.05, x + w * 1.05);
		ctx.fill();
		ctx.fillStyle = 'rgba(0,0,0,0.35)';
		for (let i = 0; i < 7; i++) {
			const bx = x - w * 0.9 + (w * 1.8 * i) / 6;
			ctx.beginPath();
			ctx.arc(bx, y + 6, w * 0.13, 0, Math.PI);
			ctx.fill();
		}
		lights.lamps.push({ x, y: y - 8 });
	}
	// Lantern with lit openings
	const ly = top + h * 0.04;
	ctx.fillStyle = shade(x - w * 0.4, x + w * 0.4);
	ctx.fillRect(x - w * 0.4, ly, w * 0.8, h * 0.06);
	ctx.fillStyle = '#ffe7a8';
	ctx.fillRect(x - w * 0.16, ly + h * 0.012, w * 0.32, h * 0.035);
	lights.lamps.push({ x, y: ly + h * 0.03 });
	// Cap
	onion(ctx, x, ly, w * 0.95, w * 1.3);
	ctx.fillStyle = shade(x - w / 2, x + w / 2);
	ctx.fill();
	finial(ctx, x, ly - w * 1.3 + 2, w * 0.5);
}

/** A courtyard wall: tiled top, crenellations, a row of arches lit from inside. */
export function wall(
	ctx: Ctx,
	w: { x0: number; x1: number; top: number; ground?: number },
	p: Palette
) {
	const ground = w.ground ?? 1080;
	const h = ground - w.top;
	const g = ctx.createLinearGradient(0, w.top, 0, ground);
	g.addColorStop(0, p.stone);
	g.addColorStop(1, '#0b0d16');
	ctx.fillStyle = g;
	ctx.fillRect(w.x0, w.top, w.x1 - w.x0, h);
	ctx.fillStyle = p.frieze;
	ctx.fillRect(w.x0, w.top, w.x1 - w.x0, 14);
	ctx.fillStyle = p.stone;
	for (let x = w.x0; x < w.x1; x += 22) ctx.fillRect(x, w.top - 9, 12, 9);
	// Upper tier: small pointed windows; lower tier: wide arches lit from inside
	const arch = (x: number, aw: number, top: number, bottom: number) => {
		ctx.beginPath();
		ctx.moveTo(x, bottom);
		ctx.lineTo(x, top + aw * 0.6);
		ctx.quadraticCurveTo(x, top, x + aw / 2, top - aw * 0.12);
		ctx.quadraticCurveTo(x + aw, top, x + aw, top + aw * 0.6);
		ctx.lineTo(x + aw, bottom);
		ctx.closePath();
	};
	const upperTop = w.top + 30;
	const upperBottom = w.top + h * 0.34;
	for (let x = w.x0 + 20; x + 26 < w.x1; x += 48) {
		arch(x, 22, upperTop, upperBottom);
		ctx.fillStyle = 'rgba(255,220,150,0.55)';
		ctx.fill();
	}
	ctx.fillStyle = 'rgba(0,0,0,0.3)';
	ctx.fillRect(w.x0, upperBottom + 6, w.x1 - w.x0, 6);
	const step = 104;
	for (let x = w.x0 + 16; x + step * 0.72 < w.x1; x += step) {
		const aw = step * 0.72;
		const top = upperBottom + 26;
		arch(x, aw, top, ground);
		const light = ctx.createLinearGradient(0, top, 0, ground);
		light.addColorStop(0, '#ffe9b0');
		light.addColorStop(0.45, '#e09a45');
		light.addColorStop(1, '#5a2c10');
		ctx.fillStyle = light;
		ctx.fill();
		ctx.strokeStyle = 'rgba(0,0,0,0.4)';
		ctx.lineWidth = 4;
		ctx.stroke();
		// Columns between the arches
		ctx.fillStyle = 'rgba(255,255,255,0.08)';
		ctx.fillRect(x + aw + 4, top, 6, ground - top);
	}
}

/** A portal (iwan): a tiled frame, its pointed arch glowing, muqarnas lines inside. */
export function iwan(
	ctx: Ctx,
	i: { cx: number; top: number; w: number; ground?: number; gold?: boolean },
	p: Palette
) {
	const ground = i.ground ?? 1080;
	const { cx, top, w } = i;
	ctx.fillStyle = i.gold
		? cylinder(ctx, cx - w / 2, cx + w / 2, GOLD[0], GOLD[1], GOLD[2])
		: p.tile;
	ctx.fillRect(cx - w / 2, top, w, ground - top);
	ctx.fillStyle = GOLD[1];
	ctx.fillRect(cx - w / 2, top, w, 10);
	ctx.fillRect(cx - w / 2, top, 8, ground - top);
	ctx.fillRect(cx + w / 2 - 8, top, 8, ground - top);
	const inner = w * 0.64;
	const spring = top + w * 0.6;
	ctx.beginPath();
	ctx.moveTo(cx - inner / 2, ground);
	ctx.lineTo(cx - inner / 2, spring);
	ctx.quadraticCurveTo(cx - inner / 2, top + w * 0.2, cx, top + w * 0.1);
	ctx.quadraticCurveTo(cx + inner / 2, top + w * 0.2, cx + inner / 2, spring);
	ctx.lineTo(cx + inner / 2, ground);
	ctx.closePath();
	const g = ctx.createLinearGradient(0, top, 0, ground);
	g.addColorStop(0, '#2a1a10');
	g.addColorStop(0.55, '#a8601f');
	g.addColorStop(1, '#ffd88a');
	ctx.fillStyle = g;
	ctx.fill();
	ctx.save();
	ctx.clip();
	ctx.strokeStyle = 'rgba(255,230,170,0.35)';
	ctx.lineWidth = 2;
	for (let k = 1; k < 6; k++) {
		ctx.beginPath();
		const y = top + w * 0.1 + k * w * 0.09;
		ctx.moveTo(cx - inner / 2, y + w * 0.1);
		for (let s = 0; s <= 8; s++) {
			const x = cx - inner / 2 + (inner * s) / 8;
			ctx.lineTo(x, y + (s % 2 === 0 ? 0 : w * 0.04));
		}
		ctx.stroke();
	}
	ctx.restore();
}

/** A clock tower, golden, with its lit face. */
export function clockTower(
	ctx: Ctx,
	t: { x: number; top: number; w: number; ground?: number },
	p: Palette,
	lights: Lights
) {
	const ground = t.ground ?? 1080;
	ctx.fillStyle = cylinder(ctx, t.x - t.w / 2, t.x + t.w / 2, GOLD[0], GOLD[1], GOLD[2]);
	ctx.fillRect(t.x - t.w / 2, t.top, t.w, ground - t.top);
	ctx.fillStyle = p.frieze;
	ctx.fillRect(t.x - t.w / 2, t.top + 10, t.w, 14);
	const cy = t.top + t.w * 0.9;
	ctx.beginPath();
	ctx.arc(t.x, cy, t.w * 0.34, 0, Math.PI * 2);
	ctx.fillStyle = '#fbf6e2';
	ctx.fill();
	ctx.strokeStyle = '#5a4214';
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.moveTo(t.x, cy);
	ctx.lineTo(t.x, cy - t.w * 0.24);
	ctx.moveTo(t.x, cy);
	ctx.lineTo(t.x + t.w * 0.16, cy + t.w * 0.08);
	ctx.stroke();
	lights.lamps.push({ x: t.x, y: cy });
	onion(ctx, t.x, t.top, t.w * 1.1, t.w * 0.9);
	ctx.fillStyle = cylinder(ctx, t.x - t.w / 2, t.x + t.w / 2, GOLD[0], GOLD[1], GOLD[2]);
	ctx.fill();
	finial(ctx, t.x, t.top - t.w * 0.9 + 2, t.w * 0.32);
}

/** The Kaaba: black kiswa, its golden band with calligraphy lines, its golden door. */
export function kaaba(ctx: Ctx, k: { cx: number; base: number; size: number }) {
	const s = k.size;
	const x0 = k.cx - s * 0.55;
	const front = s;
	const side = s * 0.42;
	const lift = s * 0.14;
	const top = k.base - s * 1.05;
	// Top face
	ctx.beginPath();
	ctx.moveTo(x0, top);
	ctx.lineTo(x0 + side, top - lift);
	ctx.lineTo(x0 + side + front, top - lift);
	ctx.lineTo(x0 + front, top);
	ctx.closePath();
	ctx.fillStyle = '#26262e';
	ctx.fill();
	// Front face, with the soft sheen of the cloth
	const fg = ctx.createLinearGradient(x0, 0, x0 + front, 0);
	fg.addColorStop(0, '#15151a');
	fg.addColorStop(0.5, '#0a0a0d');
	fg.addColorStop(1, '#050507');
	ctx.fillStyle = fg;
	ctx.fillRect(x0, top, front, k.base - top);
	// Side face, darker
	ctx.beginPath();
	ctx.moveTo(x0 + front, top);
	ctx.lineTo(x0 + front + side, top - lift);
	ctx.lineTo(x0 + front + side, k.base - lift);
	ctx.lineTo(x0 + front, k.base);
	ctx.closePath();
	ctx.fillStyle = '#0d0d10';
	ctx.fill();
	// The golden band (hizam) on both faces, with lines of calligraphy
	const by = top + s * 0.16;
	const bh = s * 0.09;
	const band = ctx.createLinearGradient(0, by, 0, by + bh);
	band.addColorStop(0, '#f6d77e');
	band.addColorStop(0.5, '#c79534');
	band.addColorStop(1, '#8a6118');
	ctx.fillStyle = band;
	ctx.fillRect(x0, by, front, bh);
	ctx.beginPath();
	ctx.moveTo(x0 + front, by);
	ctx.lineTo(x0 + front + side, by - lift);
	ctx.lineTo(x0 + front + side, by - lift + bh);
	ctx.lineTo(x0 + front, by + bh);
	ctx.closePath();
	ctx.fillStyle = '#9b7225';
	ctx.fill();
	ctx.strokeStyle = 'rgba(70,45,8,0.7)';
	ctx.lineWidth = 1.2;
	for (let i = 0; i < 26; i++) {
		const x = x0 + 6 + (front - 12) * (i / 25);
		ctx.beginPath();
		ctx.moveTo(x, by + bh * 0.3);
		ctx.quadraticCurveTo(x + 4, by + bh * 0.1, x + 7, by + bh * 0.5);
		ctx.quadraticCurveTo(x + 3, by + bh * 0.85, x, by + bh * 0.7);
		ctx.stroke();
	}
	// Door
	const dx = x0 + front * 0.68;
	const dw = front * 0.17;
	const dt = top + s * 0.42;
	ctx.fillStyle = cylinder(ctx, dx, dx + dw, '#fbe39a', '#d3a03a', '#6b4610');
	ctx.fillRect(dx, dt, dw, k.base - s * 0.12 - dt);
	ctx.strokeStyle = 'rgba(90,60,10,0.8)';
	ctx.lineWidth = 2;
	ctx.strokeRect(dx + 4, dt + 4, dw - 8, k.base - s * 0.12 - dt - 8);
}

/** A far city: buildings shaded by the glow of the holy places, and their lit windows. */
export function city(ctx: Ctx, seed: number, horizon: number, tint: string) {
	let s = seed;
	const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
	for (let x = -40; x < 1960;) {
		const w = 50 + rand() * 120;
		const h = 60 + rand() * 210;
		const g = ctx.createLinearGradient(0, horizon - h, 0, horizon);
		g.addColorStop(0, tint);
		g.addColorStop(1, '#070a14');
		ctx.fillStyle = g;
		ctx.fillRect(x, horizon - h, w, h);
		for (let wy = horizon - h + 14; wy < horizon - 10; wy += 18) {
			for (let wx = x + 9; wx < x + w - 10; wx += 15) {
				const r = rand();
				if (r < 0.3) {
					ctx.fillStyle = r < 0.1 ? 'rgba(255,240,200,0.9)' : 'rgba(255,200,120,0.6)';
					ctx.fillRect(wx, wy, 6, 8);
				}
			}
		}
		x += w + rand() * 14;
	}
}

/** A palm tree silhouette, its fronds catching a little light. */
export function palm(ctx: Ctx, x: number, ground: number, size: number, flip: boolean) {
	ctx.save();
	ctx.translate(x, ground);
	if (flip) ctx.scale(-1, 1);
	ctx.fillStyle = '#05070c';
	ctx.beginPath();
	ctx.moveTo(-size * 0.06, 0);
	ctx.bezierCurveTo(-size * 0.02, -size * 0.5, size * 0.05, -size * 0.8, size * 0.14, -size);
	ctx.lineTo(size * 0.18, -size * 0.99);
	ctx.bezierCurveTo(size * 0.1, -size * 0.8, size * 0.04, -size * 0.5, size * 0.04, 0);
	ctx.fill();
	const hx = size * 0.16;
	const hy = -size;
	for (const [a, l] of [
		[-2.7, 0.62],
		[-2.2, 0.5],
		[-1.6, 0.42],
		[-0.9, 0.55],
		[-0.35, 0.62],
		[0.1, 0.5],
		[-3.1, 0.5]
	]) {
		const ex = hx + Math.cos(a) * size * l;
		const ey = hy + Math.sin(a) * size * l * 0.7 + size * 0.18;
		ctx.beginPath();
		ctx.moveTo(hx, hy);
		ctx.quadraticCurveTo((hx + ex) / 2, hy - size * 0.12, ex, ey);
		ctx.quadraticCurveTo((hx + ex) / 2, hy - size * 0.04, hx, hy + size * 0.02);
		ctx.fill();
	}
	ctx.restore();
}
