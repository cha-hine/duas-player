<script lang="ts">
	import { link } from '#lib/i18n.ts';
	import { categoryIcon } from '#lib/icons.ts';
	import { localized, name, type Category } from '#lib/media.ts';
	import { m } from '#lib/paraglide/messages.js';

	let { category, count }: { category: Category; count?: number } = $props();

	const Icon = $derived(categoryIcon(category.icon));
</script>

<a class="category" href={link(`/categorie/${category.slug}`)}>
	<span class="icon"><Icon aria-hidden="true" /></span>
	<span class="text">
		<strong>{name(category)}</strong>
		{#if localized(category.description_fr, category.description_ar)}
			<small>{localized(category.description_fr, category.description_ar)}</small>
		{/if}
	</span>
	{#if count !== undefined}<span class="count">{m.items_count({ count })}</span>{/if}
</a>

<style>
	.category {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: var(--space-2) var(--space-4);
		padding: var(--space-4);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		text-decoration: none;
		transition: border-color var(--duration) var(--ease);
	}

	.category:hover {
		border-color: var(--color-accent);
	}

	.icon {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--color-accent) 14%, transparent);
		color: var(--color-accent-text);
	}

	.icon :global(svg) {
		width: 24px;
		height: 24px;
	}

	.text {
		display: grid;
		gap: 2px;
		min-width: 0;
	}

	strong {
		font-weight: 600;
	}

	small {
		color: var(--color-text-muted);
		font-size: var(--text-xs);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.count {
		grid-column: 2;
		color: var(--color-text-muted);
		font-size: var(--text-xs);
	}
</style>
