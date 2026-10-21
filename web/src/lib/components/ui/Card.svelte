<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		/** Makes the whole card a link. */
		href?: string;
		children: Snippet;
	};

	let { href, children }: Props = $props();
</script>

{#if href}
	<a class="card link" {href}>{@render children()}</a>
{:else}
	<div class="card">{@render children()}</div>
{/if}

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-5);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
	}

	.link {
		text-decoration: none;
		transition:
			border-color var(--duration) var(--ease),
			transform var(--duration) var(--ease);
	}

	.link:hover {
		border-color: var(--color-accent);
		transform: translateY(-2px);
	}
</style>
