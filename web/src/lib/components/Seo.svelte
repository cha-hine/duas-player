<script lang="ts">
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';

	let {
		title,
		description = m.site_description(),
		image,
		type = 'website'
	}: { title: string; description?: string; image?: string | null; type?: string } = $props();

	const fullTitle = $derived(
		title ? `${title} · ${m.site_name()}` : `${m.site_name()} · ${m.site_tagline()}`
	);
	const imageUrl = $derived(image ?? `${page.url.origin}/og.png`);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content={type} />
	<meta property="og:url" content={page.url.href} />
	<meta property="og:image" content={imageUrl} />
</svelte:head>
