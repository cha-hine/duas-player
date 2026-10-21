<script lang="ts">
	import { page } from '$app/state';
	import { name, title } from '#lib/media.ts';
	import ImmersivePlayer from './ImmersivePlayer.svelte';
	import MiniPlayer from './MiniPlayer.svelte';
	import { player } from './player.svelte.ts';
	import { settings } from './settings.svelte.ts';

	// Lives in the site layout, so playback continues while visitors browse.
	let audio = $state<HTMLAudioElement>();

	$effect(() => {
		player.attach(audio ?? null);
	});

	$effect(() => {
		settings.load();
	});

	// Synced lines and loudness envelope of the track that just started
	$effect(() => {
		const item = player.current;
		if (!item) return;
		const controller = new AbortController();
		fetch(`/api/tracks/${item.id}/sync`, { signal: controller.signal })
			.then((res) => (res.ok ? res.json() : null))
			.then((sync: { lines: typeof player.lines; energy: number[] } | null) => {
				if (!sync || player.current?.id !== item.id) return;
				if (sync.lines.length) player.lines = sync.lines;
				player.energy = sync.energy;
			})
			.catch(() => {});
		return () => controller.abort();
	});

	// Lock screen, headphones and car controls (Media Session API)
	$effect(() => {
		const item = player.current;
		if (!item || !('mediaSession' in navigator)) return;
		navigator.mediaSession.metadata = new MediaMetadata({
			title: title(item),
			artist: item.reciter ? name(item.reciter) : 'Sakina',
			album: item.category ? name(item.category) : 'Sakina',
			artwork: [
				{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
				{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
			]
		});
	});

	$effect(() => {
		if (!('mediaSession' in navigator)) return;
		const session = navigator.mediaSession;
		const actions: [MediaSessionAction, MediaSessionActionHandler][] = [
			['play', () => (player.paused = false)],
			['pause', () => (player.paused = true)],
			['previoustrack', () => player.previous()],
			['nexttrack', () => player.next()],
			['seekbackward', (d) => player.skip(-(d.seekOffset ?? 10))],
			['seekforward', (d) => player.skip(d.seekOffset ?? 10)],
			['seekto', (d) => d.seekTime !== undefined && player.seek(d.seekTime)],
			['stop', () => player.stop()]
		];
		for (const [action, handler] of actions) {
			try {
				session.setActionHandler(action, handler);
			} catch {
				// action not supported by this browser
			}
		}
		return () => actions.forEach(([action]) => session.setActionHandler(action, null));
	});

	$effect(() => {
		if (!('mediaSession' in navigator)) return;
		navigator.mediaSession.playbackState = player.current
			? player.paused
				? 'paused'
				: 'playing'
			: 'none';
		if (player.duration && Number.isFinite(player.duration)) {
			try {
				navigator.mediaSession.setPositionState({
					duration: player.duration,
					position: Math.min(player.currentTime, player.duration),
					playbackRate: player.rate
				});
			} catch {
				// position briefly invalid while a new track loads
			}
		}
	});

	// Media keys on keyboards and TV remotes
	function onkeydown(event: KeyboardEvent) {
		if (!player.current) return;
		const actions: Record<string, () => void> = {
			MediaPlayPause: () => player.toggle(),
			MediaPlay: () => (player.paused = false),
			MediaPause: () => (player.paused = true),
			MediaStop: () => player.stop(),
			MediaTrackNext: () => player.next(),
			MediaTrackPrevious: () => player.previous(),
			MediaFastForward: () => player.skip(10),
			MediaRewind: () => player.skip(-10)
		};
		const action = actions[event.key];
		if (action) {
			event.preventDefault();
			action();
		}
	}
</script>

<svelte:window {onkeydown} />

<audio
	bind:this={audio}
	src={player.current?.audioUrl ?? undefined}
	bind:paused={player.paused}
	bind:currentTime={player.currentTime}
	bind:duration={player.duration}
	bind:playbackRate={player.rate}
	onloadedmetadata={() => player.loaded()}
	onended={() => player.ended()}
	preload="auto"
></audio>

{#if player.current}
	<MiniPlayer />
	{#if page.state.immersive}
		<ImmersivePlayer />
	{/if}
{/if}
