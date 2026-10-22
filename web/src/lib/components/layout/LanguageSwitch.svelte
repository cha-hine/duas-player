<script lang="ts">
	import { page } from '$app/state';
	import { resolvePath } from '#lib/i18n.ts';
	import { getLocale, localizeHref } from '#lib/paraglide/runtime.js';

	const other = $derived(getLocale() === 'fr' ? 'ar' : 'fr');
	const href = $derived(resolvePath(localizeHref(page.url.pathname, { locale: other })));
</script>

<!-- Full reload so the server sets the page language and direction. -->
<a class="language" {href} hreflang={other} lang={other} data-sveltekit-reload>
	{other === 'ar' ? 'العربية' : 'Français'}
</a>

<style>
	.language {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 var(--space-3);
		border-radius: var(--radius-pill);
		font-size: var(--text-sm);
		font-weight: 600;
		text-decoration: none;
		color: var(--color-text);
	}

	.language:hover {
		background: var(--color-surface-2);
	}

	.language:lang(ar) {
		font-family: var(--font-arabic);
		font-size: var(--text-base);
	}

	.language:lang(fr) {
		font-family: var(--font-latin);
	}
</style>
