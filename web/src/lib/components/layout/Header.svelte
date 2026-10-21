<script lang="ts">
	import { page } from '$app/state';
	import logo from '#lib/assets/favicon.svg';
	import { link } from '#lib/i18n.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { deLocalizeHref } from '#lib/paraglide/runtime.js';
	import type { Theme } from '#lib/theme.ts';
	import LanguageSwitch from './LanguageSwitch.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import { isActive, navItems } from './nav';

	let { theme }: { theme: Theme } = $props();

	const current = $derived(deLocalizeHref(page.url.pathname));
</script>

<header class="header">
	<div class="container inner">
		<a class="brand" href={link('/')}>
			<img src={logo} alt="" width="36" height="36" />
			<span>{m.site_name()}</span>
		</a>

		<nav class="nav" aria-label={m.main_nav()}>
			{#each navItems as item (item.path)}
				<a href={link(item.path)} aria-current={isActive(item.path, current) ? 'page' : undefined}>
					{item.label()}
				</a>
			{/each}
		</nav>

		<div class="actions">
			<LanguageSwitch />
			<ThemeToggle {theme} />
		</div>
	</div>
</header>

<style>
	.header {
		position: sticky;
		top: 0;
		z-index: 10;
		background: color-mix(in srgb, var(--color-bg) 85%, transparent);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--color-border);
	}

	.inner {
		display: flex;
		align-items: center;
		gap: var(--space-5);
		height: var(--header-height);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		text-decoration: none;
		font-family: var(--font-display);
		font-size: var(--text-lg);
		font-weight: 600;
	}

	.brand img {
		border-radius: 10px;
	}

	.nav {
		display: none;
		gap: var(--space-1);
	}

	.nav a {
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-pill);
		color: var(--color-text-muted);
		text-decoration: none;
		font-size: var(--text-sm);
		font-weight: 500;
	}

	.nav a:hover {
		color: var(--color-text);
	}

	.nav a[aria-current='page'] {
		color: var(--color-accent-text);
		background: color-mix(in srgb, var(--color-accent) 14%, transparent);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		margin-inline-start: auto;
	}

	@media (min-width: 768px) {
		.nav {
			display: flex;
		}
	}
</style>
