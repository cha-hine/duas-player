<script lang="ts">
	import { page } from '$app/state';
	import Seo from '#lib/components/Seo.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { link } from '#lib/i18n.ts';
	import { m } from '#lib/paraglide/messages.js';

	const message = $derived(page.status === 404 ? m.not_found() : m.error_generic());
</script>

<Seo title={message} />

<section class="container error">
	<p class="code">{page.status}</p>
	<h1>{message}</h1>
	<Button href={link('/')}>{m.back_home()}</Button>
</section>

<style>
	.error {
		display: grid;
		justify-items: center;
		gap: var(--space-4);
		padding-block: var(--space-8);
		text-align: center;
	}

	.code {
		font-family: var(--font-display-latin);
		font-size: var(--text-3xl);
		color: var(--color-accent-text);
	}
</style>
