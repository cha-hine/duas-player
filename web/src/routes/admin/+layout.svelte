<script lang="ts">
	import { page } from '$app/state';
	import logo from '#lib/assets/favicon.svg';
	import Login from '#lib/admin/Login.svelte';
	import { session } from '#lib/admin/session.svelte.ts';
	import Button from '#lib/components/ui/Button.svelte';
	import PlayerHost from '#lib/player/PlayerHost.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const sections = [
		{ href: '/admin', label: 'Ajouter un contenu' },
		{ href: '/admin/textes', label: 'Textes synchronisés' },
		{ href: '/admin/bibliotheque', label: 'Bibliothèque de textes' }
	];
	const isActive = (href: string) =>
		href === '/admin' ? page.url.pathname === href : page.url.pathname.startsWith(href);
</script>

<svelte:head>
	<title>Admin · Sakina</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<header class="admin-header">
	<div class="container inner">
		<img src={logo} alt="" width="32" height="32" />
		<strong>Sakina</strong>
		<span class="badge">Admin</span>
		{#if session.loggedIn}
			<nav>
				{#each sections as section (section.href)}
					<a href={section.href} aria-current={isActive(section.href) ? 'page' : undefined}
						>{section.label}</a
					>
				{/each}
			</nav>
			<div class="session">
				<small>{session.email}</small>
				<Button variant="ghost" onclick={() => session.logout()}>Se déconnecter</Button>
			</div>
		{/if}
	</div>
</header>

<main class="container admin-main">
	{#if session.loggedIn}
		{@render children()}
	{:else}
		<div class="narrow"><Login /></div>
	{/if}
</main>

<!-- Used by the "preview in the player" buttons -->
<PlayerHost />

<style>
	.admin-header {
		border-bottom: 1px solid var(--color-border);
	}

	.inner {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
		min-height: var(--header-height);
	}

	.inner img {
		border-radius: 8px;
	}

	.inner strong {
		font-family: var(--font-display-latin);
		font-size: var(--text-lg);
	}

	.badge {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	nav {
		display: flex;
		gap: var(--space-1);
		margin-inline-start: var(--space-4);
	}

	nav a {
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-pill);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		font-weight: 600;
		text-decoration: none;
	}

	nav a[aria-current='page'] {
		color: var(--color-accent-text);
		background: color-mix(in srgb, var(--color-accent) 14%, transparent);
	}

	.session {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-inline-start: auto;
		color: var(--color-text-muted);
	}

	.admin-main {
		padding-block: var(--space-6) calc(var(--space-8) + var(--mini-player-height));
	}

	.narrow {
		max-width: 28rem;
		margin-inline: auto;
	}
</style>
