<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		variant?: 'default' | 'accent' | 'live';
		children: Snippet;
	};

	let { variant = 'default', children }: Props = $props();
</script>

<span class="tag {variant}">{@render children()}</span>

<style>
	.tag {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: 2px var(--space-3);
		border-radius: var(--radius-pill);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.02em;
		background: var(--color-surface-2);
		color: var(--color-text-muted);
	}

	.accent {
		background: color-mix(in srgb, var(--color-accent) 18%, transparent);
		color: var(--color-accent-text);
	}

	.live {
		background: var(--color-secondary);
		color: var(--color-on-secondary);
		text-transform: uppercase;
	}

	.live::before {
		content: '';
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
		animation: pulse 1.6s ease-in-out infinite;
	}

	@keyframes pulse {
		50% {
			opacity: 0.3;
		}
	}
</style>
