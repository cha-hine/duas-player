// Generates app icons and the social preview image from brand/logo.svg.
// Run with: npm run brand
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const logoPath = `${root}../brand/logo.svg`;
const iconsDir = `${root}static/icons/`;

const NIGHT = '#0b1a2e';
const GOLD = '#c9a24b';
const IVORY = '#f4efe3';
const MIST = '#8a9bb0';

const logo = await readFile(logoPath);
await mkdir(iconsDir, { recursive: true });

// Rounded icons with the logo's own background
for (const [name, size] of [
	['icon-192.png', 192],
	['icon-512.png', 512],
	['icon-32.png', 32]
] as const) {
	await sharp(logo, { density: 72 * (size / 128) * 2 })
		.resize(size, size)
		.png()
		.toFile(iconsDir + name);
}

// Full-bleed icons: Android maskable and Apple touch icon (the OS applies its own rounding)
async function fullBleed(name: string, size: number, logoScale: number) {
	const inner = Math.round(size * logoScale);
	const art = await sharp(logo, { density: 72 * (inner / 128) * 2 })
		.resize(inner, inner)
		.png()
		.toBuffer();
	await sharp({ create: { width: size, height: size, channels: 4, background: NIGHT } })
		.composite([{ input: art, gravity: 'center' }])
		.png()
		.toFile(iconsDir + name);
}
await fullBleed('icon-maskable-512.png', 512, 0.8);
await fullBleed('apple-touch-icon.png', 180, 1);

// Social preview (Open Graph), 1200x630
const ogLogo = await sharp(logo, { density: 72 * (220 / 128) * 2 })
	.resize(220, 220)
	.png()
	.toBuffer();
const ogText = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
	<text x="390" y="290" font-family="Georgia, serif" font-size="96" font-weight="600" fill="${IVORY}">Sakina</text>
	<text x="390" y="370" font-family="Segoe UI, Arial, sans-serif" font-size="40" fill="${GOLD}">Écouter · Comprendre · S'apaiser</text>
	<text x="390" y="430" font-family="Segoe UI, Arial, sans-serif" font-size="30" fill="${MIST}">Coran, douas, ziyarat et web TV</text>
</svg>`);
await sharp({ create: { width: 1200, height: 630, channels: 4, background: NIGHT } })
	.composite([
		{ input: ogLogo, left: 120, top: 205 },
		{ input: ogText, left: 0, top: 0 }
	])
	.png()
	.toFile(`${root}static/og.png`);

console.log('Brand assets written to web/static/');
