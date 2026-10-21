<script lang="ts">
	import '#lib/fonts.ts';
	import '#lib/styles/tokens.css';
	import '#lib/styles/base.css';
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import { m } from '#lib/paraglide/messages.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
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

{@render children()}
