<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type Props = {
		variant?: 'primary' | 'secondary' | 'ghost';
		size?: 'md' | 'lg';
		icon?: Snippet;
		children: Snippet;
	} & (({ href: string } & HTMLAnchorAttributes) | ({ href?: undefined } & HTMLButtonAttributes));

	let { variant = 'primary', size = 'md', icon, children, ...rest }: Props = $props();
</script>

{#if rest.href !== undefined}
	<a class="button {variant} {size}" {...rest as HTMLAnchorAttributes}>
		{@render icon?.()}
		{@render children()}
	</a>
{:else}
	<button class="button {variant} {size}" type="button" {...rest as HTMLButtonAttributes}>
		{@render icon?.()}
		{@render children()}
	</button>
{/if}

<style>
	.button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		min-height: 44px;
		padding: 0 var(--space-5);
		border: 1px solid transparent;
		border-radius: var(--radius-pill);
		font-weight: 600;
		font-size: var(--text-sm);
		text-decoration: none;
		cursor: pointer;
		transition:
			background-color var(--duration) var(--ease),
			border-color var(--duration) var(--ease),
			transform var(--duration) var(--ease);
	}

	.button:active {
		transform: scale(0.97);
	}

	.button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.lg {
		min-height: 52px;
		padding: 0 var(--space-6);
		font-size: var(--text-base);
	}

	.primary {
		background: var(--color-accent);
		color: var(--color-on-accent);
	}

	.primary:hover {
		background: color-mix(in srgb, var(--color-accent) 88%, white);
	}

	.secondary {
		background: transparent;
		border-color: var(--color-border);
		color: var(--color-text);
	}

	.secondary:hover {
		border-color: var(--color-accent);
	}

	.ghost {
		background: transparent;
		color: var(--color-text);
	}

	.ghost:hover {
		background: var(--color-surface-2);
	}
</style>
