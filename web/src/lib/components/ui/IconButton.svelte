<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Props = {
		/** Accessible name; shown as tooltip too. */
		label: string;
		variant?: 'plain' | 'filled';
		size?: 'md' | 'lg';
		children: Snippet;
	} & HTMLButtonAttributes;

	let { label, variant = 'plain', size = 'md', children, ...rest }: Props = $props();
</script>

<button
	class="icon-button {variant} {size}"
	type="button"
	aria-label={label}
	title={label}
	{...rest}
>
	{@render children()}
</button>

<style>
	.icon-button {
		display: inline-grid;
		place-items: center;
		width: 44px;
		height: 44px;
		padding: 0;
		border: none;
		border-radius: var(--radius-pill);
		background: transparent;
		color: var(--color-text);
		cursor: pointer;
		transition:
			background-color var(--duration) var(--ease),
			transform var(--duration) var(--ease);
	}

	.icon-button:hover {
		background: var(--color-surface-2);
	}

	.icon-button:active {
		transform: scale(0.94);
	}

	.lg {
		width: 64px;
		height: 64px;
	}

	.filled {
		background: var(--color-accent);
		color: var(--color-on-accent);
	}

	.filled:hover {
		background: color-mix(in srgb, var(--color-accent) 88%, white);
	}

	.icon-button :global(svg) {
		width: 22px;
		height: 22px;
	}

	.lg :global(svg) {
		width: 28px;
		height: 28px;
	}
</style>
