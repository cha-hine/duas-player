<script lang="ts">
	import { link } from '#lib/i18n.ts';
	import { m } from '#lib/paraglide/messages.js';
</script>

<footer class="footer">
	<div class="container inner">
		<p class="brand">{m.site_name()} · <span>{m.site_tagline()}</span></p>
		<p>{m.footer_credits()} · <a href={link('/sources')}>{m.nav_sources()}</a></p>
	</div>
</footer>

<style>
	.footer {
		margin-top: var(--space-8);
		border-top: 1px solid var(--color-border);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.inner {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: var(--space-2);
		padding-block: var(--space-6);
		/* room for the phone bottom navigation */
		padding-bottom: calc(var(--space-6) + var(--bottom-nav-height) + env(safe-area-inset-bottom));
	}

	a {
		color: inherit;
	}

	a:hover {
		color: var(--color-accent-text);
	}

	.brand {
		color: var(--color-text);
		font-weight: 600;
	}

	.brand span {
		font-weight: 400;
		color: var(--color-text-muted);
	}

	@media (min-width: 768px) {
		.inner {
			padding-bottom: var(--space-6);
		}
	}
</style>
