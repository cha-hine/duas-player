<script lang="ts" module>
	export const HOLY_SCENES = ['kaaba', 'medine', 'karbala', 'najaf', 'mashhad'] as const;
	export type HolyScene = (typeof HOLY_SCENES)[number];
</script>

<script lang="ts">
	import { holyRenderer } from './holy/renderer.ts';

	// The holy places at night, rendered on a canvas like a slow film shot (see
	// holy/renderer.ts): the Kaaba, Medina, Karbala, Najaf, Mashhad.
	let { scene, level }: { scene: HolyScene; level: () => number } = $props();

	let canvas = $state<HTMLCanvasElement>();

	$effect(() => {
		if (!canvas) return;
		const tv = document.documentElement.dataset.device === 'tv';
		const renderer = holyRenderer(canvas, scene, level, tv);
		const observer = new ResizeObserver(() => renderer.resize());
		observer.observe(canvas);
		return () => {
			observer.disconnect();
			renderer.stop();
		};
	});
</script>

<canvas bind:this={canvas} aria-hidden="true"></canvas>

<style>
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		background: #050a18;
	}
</style>
