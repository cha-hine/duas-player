<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	let { src, poster, label }: { src: string | null; poster: string | null; label: string } =
		$props();

	let video = $state<HTMLVideoElement>();

	// Safari plays HLS natively; other browsers go through hls.js (loaded only when needed)
	$effect(() => {
		if (!video || !src) return;
		if (video.canPlayType('application/vnd.apple.mpegurl')) {
			video.src = src;
			return;
		}
		let destroy = () => {};
		import('hls.js').then(({ default: Hls }) => {
			if (!Hls.isSupported() || !video) return;
			const hls = new Hls({ capLevelToPlayerSize: true });
			hls.loadSource(src);
			hls.attachMedia(video);
			destroy = () => hls.destroy();
		});
		return () => destroy();
	});
</script>

<div class="player">
	{#if src}
		<video
			bind:this={video}
			controls
			playsinline
			preload="metadata"
			poster={poster ?? undefined}
			aria-label={label}
		></video>
	{:else}
		<p class="unavailable">{m.video_unavailable()}</p>
	{/if}
</div>

<style>
	.player {
		aspect-ratio: 16 / 9;
		border-radius: var(--radius-lg);
		overflow: hidden;
		background: #000;
	}

	video {
		display: block;
		width: 100%;
		height: 100%;
	}

	.unavailable {
		display: grid;
		place-items: center;
		height: 100%;
		color: var(--sakina-mist);
	}
</style>
