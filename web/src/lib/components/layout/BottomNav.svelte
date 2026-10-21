<script lang="ts">
	import { page } from '$app/state';
	import { link } from '#lib/i18n.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { deLocalizeHref } from '#lib/paraglide/runtime.js';
	import { isActive, navItems } from './nav';

	const current = $derived(deLocalizeHref(page.url.pathname));
</script>

<!-- Phone navigation; the header nav takes over from 768px. -->
<nav class="bottom-nav" aria-label={m.main_nav()}>
	{#each navItems as item (item.path)}
		<a href={link(item.path)} aria-current={isActive(item.path, current) ? 'page' : undefined}>
			<item.icon aria-hidden="true" />
			<span>{item.label()}</span>
		</a>
	{/each}
</nav>

<style>
	.bottom-nav {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		z-index: 10;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		height: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom));
		padding-bottom: env(safe-area-inset-bottom);
		background: color-mix(in srgb, var(--color-surface) 92%, transparent);
		backdrop-filter: blur(12px);
		border-top: 1px solid var(--color-border);
	}

	a {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		color: var(--color-text-muted);
		text-decoration: none;
		font-size: var(--text-xs);
		font-weight: 500;
	}

	a :global(svg) {
		width: 22px;
		height: 22px;
	}

	a[aria-current='page'] {
		color: var(--color-accent-text);
	}

	@media (min-width: 768px) {
		.bottom-nav {
			display: none;
		}
	}
</style>
