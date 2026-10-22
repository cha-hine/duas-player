// Shared drawing helpers of the landscapes (NatureScene, MoreScenes): the same "random"
// scenery every time, kept around the edges so nothing stands behind the text.

/** A repeatable random number generator. */
export function seeded(seed: number) {
	return () => {
		seed = (seed * 16807) % 2147483647;
		return (seed - 1) / 2147483646;
	};
}

/** Stars around the edges of the sky (none in the middle), as [x, y, radius] in 1600 × 900. */
export function stars(seed: number, count: number): [number, number, number][] {
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
export function pines(seed: number, from: number, to: number, baseAt: (x: number) => number) {
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

/** Moving things along the left and right edges (or anywhere), each with its own rhythm. */
export function particles(seed: number, count: number, sides = true) {
	const rand = seeded(seed);
	return Array.from({ length: count }, (_, i) => ({
		x: sides ? (i % 2 === 0 ? 1 + rand() * 20 : 79 + rand() * 20) : rand() * 100,
		y: rand() * 100,
		duration: 9 + rand() * 9,
		delay: -rand() * 18,
		sway: 2 + rand() * 3,
		drift: 20 + rand() * 50,
		size: 14 + rand() * 14,
		hue: i % 3
	}));
}
