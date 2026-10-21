<script lang="ts">
	import logo from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<title>Admin · Sakina</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<header class="admin-header">
	<div class="container inner">
		<img src={logo} alt="" width="32" height="32" />
		<strong>Sakina</strong>
		<span>Admin</span>
	</div>
</header>

<main class="container admin-main">
	{@render children()}
</main>

<style>
	.admin-header {
		border-bottom: 1px solid var(--color-border);
	}

	.inner {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		height: var(--header-height);
	}

	.inner img {
		border-radius: 8px;
	}

	.inner strong {
		font-family: var(--font-display-latin);
		font-size: var(--text-lg);
	}

	.inner span {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.admin-main {
		padding-block: var(--space-6) var(--space-8);
		max-width: 44rem;
	}
</style>
