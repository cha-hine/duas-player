// Out-of-focus things close to the camera (grass, branches, reeds, ferns, rocks), drawn once as
// SVG paths from a seed: Depth.svelte blurs them and sets them in the corners, in front of the
// landscape, so the scenery reads as far away and in focus.
import { seeded } from './scenery.ts';

export type ForegroundKind = 'grass' | 'reeds' | 'ferns' | 'rocks' | 'branch' | 'bough';

/** Kinds that hang from a top corner; the others stand in a bottom corner. */
export const HANGING: ForegroundKind[] = ['branch', 'bough'];

/** Width and height of every drawing; bottom ones grow up from y = H, hanging ones down from 0. */
export const W = 400;
export const H = 300;

const f = (n: number) => n.toFixed(1);

/** Blades leaning this way and that, taller towards the corner. */
function grass(rand: () => number) {
	let d = '';
	for (let x = -10; x < W; x += 5 + rand() * 8) {
		const h = (60 + rand() * 170) * (1 - (x / W) * 0.7);
		const lean = (rand() - 0.4) * h * 0.5;
		const w = 6 + rand() * 7;
		d += `M${f(x)} ${H}Q${f(x + lean * 0.4)} ${f(H - h * 0.6)} ${f(x + lean)} ${f(H - h)}`;
		d += `Q${f(x + w + lean * 0.4)} ${f(H - h * 0.6)} ${f(x + w)} ${H}Z`;
	}
	return d;
}

/** Tall stalks with their brown heads. */
function reeds(rand: () => number) {
	let d = '';
	for (let x = 10; x < W * 0.8; x += 14 + rand() * 22) {
		const h = (140 + rand() * 140) * (1 - (x / W) * 0.6);
		const lean = (rand() - 0.5) * 30;
		const top = H - h;
		d += `M${f(x)} ${H}Q${f(x + lean * 0.5)} ${f(H - h / 2)} ${f(x + lean)} ${f(top)}`;
		d += `L${f(x + lean + 2.5)} ${f(top)}Q${f(x + lean * 0.5 + 2.5)} ${f(H - h / 2)} ${f(x + 3)} ${H}Z`;
		// The head: a long rounded shape a little under the tip
		const hy = top + 12 + rand() * 10;
		d += `M${f(x + lean - 3)} ${f(hy)}a4 16 0 1 0 9 0a4 16 0 1 0 -9 0Z`;
		// A leaf curling away from the stalk
		const ly = H - h * (0.3 + rand() * 0.3);
		d += `M${f(x + lean * 0.3)} ${f(ly)}q${f(30 + rand() * 30)} ${f(-40 - rand() * 40)} ${f(50 + rand() * 30)} ${f(-50 - rand() * 50)}q-30 30 -48 52Z`;
	}
	return d;
}

/** Arching fronds from one clump: a curved stem each, with leaflets along it. */
function ferns(rand: () => number) {
	let d = '';
	const fronds = 6;
	const bx = 70;
	for (let i = 0; i < fronds; i++) {
		// Fanning from upright (towards the corner) to lying out over the screen
		const spread = i / (fronds - 1);
		const length = 230 - spread * 60 + rand() * 30;
		const tipX = bx + Math.sin(-0.3 + spread * 1.7) * length;
		const tipY = H - Math.cos(-0.3 + spread * 1.7) * length * 0.95;
		// Control point above the line: the frond arches and its tip droops
		const cx = (bx + tipX) / 2 - 20 + spread * 10;
		const cy = Math.min(H, tipY) - 70 + spread * 30;
		const at = (t: number) => ({
			x: (1 - t) ** 2 * bx + 2 * (1 - t) * t * cx + t * t * tipX,
			y: (1 - t) ** 2 * H + 2 * (1 - t) * t * cy + t * t * tipY
		});
		for (let t = 0.06; t < 0.98; t += 0.055) {
			const p = at(t);
			const q = at(t + 0.01);
			const along = Math.atan2(q.y - p.y, q.x - p.x);
			const leaf = 34 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 5;
			for (const side of [1, -1]) {
				// Leaflets point outwards and a little towards the tip
				const a = along + side * (Math.PI / 2 - 0.45);
				const tx = p.x + Math.cos(a) * leaf;
				const ty = p.y + Math.sin(a) * leaf;
				const w = leaf * 0.22;
				const nx = Math.cos(a + Math.PI / 2) * w;
				const ny = Math.sin(a + Math.PI / 2) * w;
				const mx = (p.x + tx) / 2;
				const my = (p.y + ty) / 2;
				d += `M${f(p.x)} ${f(p.y)}Q${f(mx + nx)} ${f(my + ny)} ${f(tx)} ${f(ty)}Q${f(mx - nx)} ${f(my - ny)} ${f(p.x)} ${f(p.y)}Z`;
			}
		}
		// The stem itself
		d += `M${f(bx - 2)} ${H}Q${f(cx - 2)} ${f(cy)} ${f(tipX)} ${f(tipY)}L${f(tipX + 1)} ${f(tipY + 2)}Q${f(cx + 3)} ${f(cy + 4)} ${f(bx + 4)} ${H}Z`;
	}
	return d;
}

/** Rounded stones, the big ones in the corner. */
function rocks(rand: () => number) {
	let d = '';
	let x = -40;
	while (x < W * 0.85) {
		const w = (90 + rand() * 120) * (1 - (x / W) * 0.5);
		const h = w * (0.45 + rand() * 0.3);
		d += `M${f(x)} ${H}C${f(x)} ${f(H - h)} ${f(x + w * 0.25)} ${f(H - h * 1.05)} ${f(x + w * 0.55)} ${f(H - h)}`;
		d += `C${f(x + w * 0.9)} ${f(H - h * 0.95)} ${f(x + w)} ${f(H - h * 0.4)} ${f(x + w)} ${H}Z`;
		x += w * (0.6 + rand() * 0.3);
	}
	return d;
}

/** A leafy branch reaching in from the top corner. */
function branch(rand: () => number) {
	let d = 'M-10 30C120 40 220 90 330 170L326 176C220 100 120 52 -10 44Z';
	for (let s = 0.05; s < 1; s += 0.045) {
		const x = -10 + s * 340;
		const y = 37 + s * 130 + Math.sin(s * 3) * 10;
		for (const side of [1, -1]) {
			const len = 26 + rand() * 26;
			const a = (side > 0 ? 1.1 : -0.6) + (rand() - 0.5) * 0.8;
			const tx = x + Math.cos(a) * len;
			const ty = y + Math.sin(a) * len;
			const mx = (x + tx) / 2;
			const my = (y + ty) / 2;
			const nx = -(ty - y) * 0.3;
			const ny = (tx - x) * 0.3;
			d += `M${f(x)} ${f(y)}Q${f(mx + nx)} ${f(my + ny)} ${f(tx)} ${f(ty)}Q${f(mx - nx)} ${f(my - ny)} ${f(x)} ${f(y)}Z`;
		}
	}
	return d;
}

/** A pine bough from the top corner, in tufts of needles (its snow is drawn by `boughSnow`). */
function bough(rand: () => number) {
	let d = 'M-10 24C130 40 240 80 360 150L355 157C238 90 128 52 -10 38Z';
	for (let s = 0.03; s < 1; s += 0.03) {
		const x = -10 + s * 365;
		const y = 31 + s * 122;
		for (const side of [1, -1]) {
			// A fan of needles: a wedge, notched at its end
			const len = (46 - s * 22) * (0.75 + rand() * 0.4);
			const a = (side > 0 ? 1.15 : -0.95) + (rand() - 0.5) * 0.3;
			const spread = 0.32;
			const p = (k: number) =>
				`${f(x + Math.cos(a + k * spread) * len)} ${f(y + Math.sin(a + k * spread) * len)}`;
			const notch = `${f(x + Math.cos(a) * len * 0.8)} ${f(y + Math.sin(a) * len * 0.8)}`;
			d += `M${f(x)} ${f(y)}L${p(-1)}L${p(-0.5)}L${notch}L${p(0.5)}L${p(1)}Z`;
		}
	}
	return d;
}

/** Snow lying on top of the bough. */
export function boughSnow(seed: number) {
	const rand = seeded(seed + 1);
	let d = '';
	for (let s = 0.06; s < 0.95; s += 0.09 + rand() * 0.06) {
		const x = -10 + s * 365;
		const y = 24 + s * 120;
		const w = 18 + rand() * 22;
		d += `M${f(x - w / 2)} ${f(y + 4)}q${f(w / 2)} ${f(-10 - rand() * 6)} ${f(w)} 0z`;
	}
	return d;
}

const DRAW: Record<ForegroundKind, (rand: () => number) => string> = {
	grass,
	reeds,
	ferns,
	rocks,
	branch,
	bough
};

/**
 * The drawing as separate shapes: in one path, leaves crossing each other in opposite
 * directions would cancel out and leave holes.
 */
export const foregroundShapes = (kind: ForegroundKind, seed: number) =>
	DRAW[kind](seeded(seed)).split(/(?=M)/);
