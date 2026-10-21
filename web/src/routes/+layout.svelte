<script lang="ts">
	import '#lib/fonts.ts';
	import '#lib/styles/tokens.css';
	import '#lib/styles/base.css';
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import { deLocalizeHref, locales, localizeHref } from '#lib/paraglide/runtime.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Each page exists in French (/...) and Arabic (/ar/...): tell search engines
	const path = $derived(deLocalizeHref(page.url.pathname));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta property="og:site_name" content="Sakina" />
	<meta name="twitter:card" content="summary_large_image" />
	{#each locales as locale (locale)}
		<link
			rel="alternate"
			hreflang={locale}
			href={page.url.origin + localizeHref(path, { locale })}
		/>
	{/each}
</svelte:head>

{@render children()}
