<script lang="ts">
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';

	// Turning circle while something loads; `label` is read out by screen readers.
	let { label, size = 18 }: { label: string; size?: number } = $props();
</script>

<span class="spinner" role="status" aria-label={label} style:--size="{size}px">
	<LoaderCircle aria-hidden="true" />
</span>

<style>
	.spinner {
		display: inline-grid;
		place-items: center;
		color: var(--color-text-muted);
	}

	.spinner :global(svg) {
		width: var(--size);
		height: var(--size);
		animation: spin 0.9s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(1turn);
		}
	}
</style>
