// Fragment shaders of the immersive player's backgrounds (WebGL 1 / GLSL ES 1.0).
// Uniforms: u_res (pixels), u_time (seconds), u_energy (0..1, the reciter's voice, smoothed).
import type { Theme } from '../settings.svelte.ts';

export const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const COMMON = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_energy;

const vec3 NIGHT = vec3(0.043, 0.102, 0.180);
const vec3 DEEP = vec3(0.071, 0.149, 0.247);
const vec3 GOLD = vec3(0.788, 0.635, 0.294);
const vec3 EMERALD = vec3(0.122, 0.478, 0.420);

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
	           mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
	float v = 0.0;
	float a = 0.5;
	for (int i = 0; i < 4; i++) {
		v += a * noise(p);
		p *= 2.02;
		a *= 0.5;
	}
	return v;
}

vec2 centered() { return (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y); }
`;

// Dawn: slow flowing clouds of night blue with a golden light that swells with the voice
const AUBE = `
void main() {
	vec2 p = centered();
	vec2 uv = gl_FragCoord.xy / u_res;
	float t = u_time * 0.04;
	float n = fbm(p * 1.4 + vec2(t, -t * 0.6));
	vec3 col = mix(NIGHT, DEEP, smoothstep(0.2, 0.8, n + uv.y * 0.25));
	vec2 light = vec2(sin(t * 1.7) * 0.35, 0.15 + cos(t * 1.1) * 0.15);
	float glow = exp(-2.6 * length(p - light)) * (0.25 + 0.75 * u_energy);
	col += GOLD * glow * 0.55;
	col += EMERALD * 0.12 * smoothstep(0.55, 0.9, n);
	gl_FragColor = vec4(col, 1.0);
}
`;

// Night: a calm starry sky; the stars brighten with the voice
const NUIT = `
void main() {
	vec2 p = centered();
	float t = u_time;
	vec3 col = mix(NIGHT * 0.7, DEEP, smoothstep(-0.6, 0.8, p.y));
	col += EMERALD * 0.10 * fbm(p * 1.2 + vec2(t * 0.01, 0.0));
	for (int layer = 0; layer < 3; layer++) {
		float scale = 9.0 + float(layer) * 7.0;
		vec2 g = p * scale + vec2(t * 0.02 * float(layer + 1), 0.0);
		vec2 cell = floor(g);
		vec2 f = fract(g) - 0.5;
		float h = hash(cell + float(layer) * 7.0);
		vec2 pos = vec2(hash(cell + 3.1), hash(cell + 5.7)) - 0.5;
		float d = length(f - pos * 0.7);
		float twinkle = 0.55 + 0.45 * sin(t * (1.0 + h * 2.0) + h * 6.28);
		// Only some cells hold a star (smoothstep needs distinct edges, so the size is never 0)
		float size = 0.06 + 0.04 * u_energy;
		float star = step(0.8, h) * ((1.0 - smoothstep(0.0, size, d)) + 0.35 * (1.0 - smoothstep(0.0, size * 4.0, d)));
		col += mix(vec3(1.0), GOLD, h) * star * twinkle * (0.7 + 0.6 * u_energy);
	}
	gl_FragColor = vec4(col, 1.0);
}
`;

/** The themes drawn by a shader; the others are landscapes (NatureScene.svelte). */
export const FRAGMENTS: Partial<Record<Theme, string>> = {
	aube: COMMON + AUBE,
	nuit: COMMON + NUIT
};
