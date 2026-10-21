<script lang="ts">
	import '#lib/fonts.ts';
	import '#lib/styles/tokens.css';
	import '#lib/styles/base.css';
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import BottomNav from '#lib/components/layout/BottomNav.svelte';
	import Footer from '#lib/components/layout/Footer.svelte';
	import Header from '#lib/components/layout/Header.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="description" content={m.site_description()} />
	<meta property="og:site_name" content="Sakina" />
	<meta property="og:image" content="{page.url.origin}/og.png" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<a class="skip-link" href="#main">{m.skip_to_content()}</a>

<Header theme={data.theme} />

<main id="main">
	{@render children()}
</main>

<Footer />
<BottomNav />

<style>
	.skip-link {
		position: absolute;
		top: var(--space-2);
		inset-inline-start: var(--space-2);
		z-index: 100;
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-sm);
		background: var(--color-accent);
		color: var(--color-on-accent);
		font-weight: 600;
		transform: translateY(-200%);
	}

	.skip-link:focus {
		transform: none;
	}
</style>
