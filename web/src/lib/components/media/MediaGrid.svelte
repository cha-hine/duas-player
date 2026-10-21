<script lang="ts">
	import type { MediaItem } from '#lib/media.ts';
	import MediaCard from './MediaCard.svelte';

	let { items }: { items: MediaItem[] } = $props();
</script>

<div class="grid">
	{#each items as item (item.kind + item.id)}
		<MediaCard {item} />
	{/each}
</div>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
		gap: var(--space-4);
	}
</style>
