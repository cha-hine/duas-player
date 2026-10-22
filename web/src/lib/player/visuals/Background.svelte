<script lang="ts">
	import type { Theme } from '../settings.svelte.ts';
	import NatureScene, { SCENES, type Scene } from './NatureScene.svelte';
	import { FRAGMENTS, VERTEX } from './shaders.ts';

	// Animated background of the immersive player: a WebGL sky, or a calm landscape. `level`
	// returns the voice loudness (0..1) for the current moment; it is read every frame, outside
	// Svelte's reactivity.
	let { theme, level }: { theme: Theme; level: () => number } = $props();

	const scene = $derived((SCENES as readonly string[]).includes(theme) ? (theme as Scene) : null);

	let canvas = $state<HTMLCanvasElement>();
	let fallback = $state(false);

	/** Pixels drawn per CSS pixel: the soft visuals look the same at a fraction of the cost. */
	const RESOLUTION = 0.5;
	/**
	 * The skies move slowly: 30 frames a second look as smooth as 60 for half the work. TVs have
	 * weak graphics chips for their large screens: fewer frames, fewer pixels.
	 */
	const FPS = 30;
	const TV = { fps: 20, resolution: 0.3 };

	function compile(gl: WebGLRenderingContext, type: number, source: string) {
		const shader = gl.createShader(type)!;
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			throw new Error(gl.getShaderInfoLog(shader) ?? 'shader error');
		}
		return shader;
	}

	$effect(() => {
		const fragment = FRAGMENTS[theme];
		if (!canvas || !fragment) return;
		const tv = document.documentElement.dataset.device === 'tv';
		const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const gl = canvas.getContext('webgl', {
			antialias: false,
			alpha: false,
			powerPreference: 'low-power'
		});
		if (!gl) {
			fallback = true;
			return;
		}

		let program: WebGLProgram;
		try {
			program = gl.createProgram()!;
			gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
			gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
			gl.linkProgram(program);
			if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('link error');
		} catch (error) {
			console.warn(`Sakina background "${theme}" unavailable, using the plain gradient`, error);
			fallback = true;
			return;
		}
		gl.useProgram(program);

		// One triangle covering the screen
		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		const pos = gl.getAttribLocation(program, 'a_pos');
		gl.enableVertexAttribArray(pos);
		gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

		const uRes = gl.getUniformLocation(program, 'u_res');
		const uTime = gl.getUniformLocation(program, 'u_time');
		const uEnergy = gl.getUniformLocation(program, 'u_energy');

		let frame = 0;
		let energy = 0;
		let scale = tv ? TV.resolution : RESOLUTION;
		const interval = 1000 / (tv ? TV.fps : FPS);
		let drawn = 0;
		let slowFrames = 0;
		let last = performance.now();
		const start = last;

		const resize = () => {
			const w = Math.max(1, Math.round(canvas!.clientWidth * scale));
			const h = Math.max(1, Math.round(canvas!.clientHeight * scale));
			if (canvas!.width !== w || canvas!.height !== h) {
				canvas!.width = w;
				canvas!.height = h;
				gl.viewport(0, 0, w, h);
			}
		};

		const draw = (now: number) => {
			if (now - drawn < interval - 2 && !reduceMotion) {
				frame = requestAnimationFrame(draw);
				return;
			}
			drawn = now;
			// Weak device: if frames keep taking too long, draw at a lower resolution
			const spent = now - last;
			last = now;
			slowFrames = spent > interval * 1.6 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
			if (slowFrames > 20 && scale > 0.2) {
				scale /= 1.5;
				slowFrames = 0;
			}
			resize();
			// Rise quickly with the voice, fall back slowly
			const target = level();
			energy += (target - energy) * (target > energy ? 0.25 : 0.06);
			gl.uniform2f(uRes, canvas!.width, canvas!.height);
			gl.uniform1f(uTime, (now - start) / 1000);
			gl.uniform1f(uEnergy, energy);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
			if (!reduceMotion) frame = requestAnimationFrame(draw);
		};
		frame = requestAnimationFrame(draw);

		return () => {
			cancelAnimationFrame(frame);
			gl.deleteBuffer(buffer);
			gl.deleteProgram(program);
		};
	});
</script>

{#if scene}
	<NatureScene {scene} {level} />
{:else if fallback}
	<div class="fallback" aria-hidden="true"></div>
{:else}
	<canvas bind:this={canvas} aria-hidden="true"></canvas>
{/if}

<style>
	canvas,
	.fallback {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	/* Devices without WebGL: a slow gradient instead */
	.fallback {
		background:
			radial-gradient(circle at 30% 30%, rgb(201 162 75 / 0.25), transparent 55%),
			radial-gradient(circle at 70% 80%, rgb(31 122 107 / 0.2), transparent 50%),
			linear-gradient(160deg, var(--sakina-deep), var(--sakina-night));
		background-size: 200% 200%;
		animation: drift 30s ease-in-out infinite alternate;
	}

	@keyframes drift {
		to {
			background-position: 100% 100%;
		}
	}
</style>
