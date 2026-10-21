<script lang="ts">
	// Draws the waveform of [from, to] with the start of each line as a marker.
	// Clicking places the playhead; dragging the selected line's marker moves its start.
	type Props = {
		samples: Float32Array | null;
		sampleRate: number;
		from: number;
		to: number;
		starts: (number | null)[];
		selected: number;
		playhead: number;
		height?: number;
		onpick?: (time: number) => void;
		onmove?: (index: number, time: number) => void;
	};

	let {
		samples,
		sampleRate,
		from,
		to,
		starts,
		selected,
		playhead,
		height = 120,
		onpick,
		onmove
	}: Props = $props();

	let canvas = $state<HTMLCanvasElement>();
	let width = $state(600);
	let dragging = false;

	const timeAt = (clientX: number) => {
		const rect = canvas!.getBoundingClientRect();
		const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
		return from + (x / rect.width) * (to - from);
	};

	$effect(() => {
		if (!canvas) return;
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		canvas.width = Math.round(width * dpr);
		canvas.height = Math.round(height * dpr);
		const ctx = canvas.getContext('2d')!;
		ctx.scale(dpr, dpr);
		const styles = getComputedStyle(canvas);
		const wave = styles.getPropertyValue('--wave').trim() || '#8a9bb0';
		const accent = styles.getPropertyValue('--accent').trim() || '#c9a24b';
		const marker = styles.getPropertyValue('--marker').trim() || '#f4efe3';
		ctx.clearRect(0, 0, width, height);

		// One min/max bar per CSS pixel
		const span = to - from;
		const mid = height / 2;
		if (samples && span > 0) {
			ctx.fillStyle = wave;
			const perPixel = (span * sampleRate) / width;
			for (let x = 0; x < width; x++) {
				const a = Math.floor(from * sampleRate + x * perPixel);
				const b = Math.min(samples.length, Math.floor(a + Math.max(1, perPixel)));
				let peak = 0;
				for (let i = Math.max(0, a); i < b; i += Math.max(1, Math.floor((b - a) / 64))) {
					const v = Math.abs(samples[i]);
					if (v > peak) peak = v;
				}
				const h = Math.max(1, peak * (height - 8));
				ctx.fillRect(x, mid - h / 2, 1, h);
			}
		}

		// Line starts
		ctx.font = '11px system-ui, sans-serif';
		starts.forEach((start, i) => {
			if (start === null || start < from || start > to) return;
			const x = ((start - from) / span) * width;
			ctx.fillStyle = i === selected ? accent : marker;
			ctx.globalAlpha = i === selected ? 1 : 0.55;
			ctx.fillRect(x - (i === selected ? 1 : 0.5), 0, i === selected ? 2 : 1, height);
			ctx.fillText(String(i + 1), x + 3, 12);
		});
		ctx.globalAlpha = 1;

		// Playhead
		if (playhead >= from && playhead <= to) {
			ctx.fillStyle = accent;
			ctx.fillRect(((playhead - from) / span) * width - 0.5, 0, 1, height);
		}
	});

	function pointerdown(event: PointerEvent) {
		const time = timeAt(event.clientX);
		const start = starts[selected];
		// Grabbing near the selected marker moves it; anywhere else places the playhead
		const near =
			start !== null && start !== undefined && Math.abs(time - start) < ((to - from) / width) * 8;
		if (near && onmove) {
			dragging = true;
			canvas!.setPointerCapture(event.pointerId);
		} else {
			onpick?.(time);
		}
	}

	function pointermove(event: PointerEvent) {
		if (dragging) onmove?.(selected, timeAt(event.clientX));
	}

	function pointerup() {
		dragging = false;
	}
</script>

<div class="waveform" bind:clientWidth={width}>
	<canvas
		bind:this={canvas}
		style:height="{height}px"
		onpointerdown={pointerdown}
		onpointermove={pointermove}
		onpointerup={pointerup}
		aria-hidden="true"
	></canvas>
</div>

<style>
	.waveform {
		width: 100%;
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		overflow: hidden;
	}

	canvas {
		display: block;
		width: 100%;
		touch-action: none;
		cursor: crosshair;
		--wave: var(--color-text-muted);
		--accent: var(--color-accent);
		--marker: var(--color-text);
	}
</style>
