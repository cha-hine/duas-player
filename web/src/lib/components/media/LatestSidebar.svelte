<script lang="ts">
	import Headphones from '@lucide/svelte/icons/headphones';
	import Video from '@lucide/svelte/icons/video';
	import { link } from '#lib/i18n.ts';
	import { categoryIcon } from '#lib/icons.ts';
	import { formatDuration, itemPath, name, title, type MediaItem } from '#lib/media.ts';
	import { m } from '#lib/paraglide/messages.js';

	let { items }: { items: MediaItem[] } = $props();
</script>

<aside class="latest" aria-labelledby="latest-title">
	<h2 id="latest-title">{m.latest_title()}</h2>
	<ol>
		{#each items as item (item.kind + item.id)}
			{@const Icon = categoryIcon(item.category?.icon)}
			<li>
				<a href={link(itemPath(item))}>
					<span class="thumb">
						{#if item.posterUrl}
							<img src={item.posterUrl} alt="" loading="lazy" />
						{:else}
							<span class="art"><Icon aria-hidden="true" /></span>
						{/if}
					</span>
					<span class="text">
						<strong><bdi>{title(item)}</bdi></strong>
						<small>
							{#if item.kind === 'video'}<Video aria-label={m.video_label()} />{:else}<Headphones
									aria-label={m.audio_label()}
								/>{/if}
							{#if item.duration}{formatDuration(item.duration)}{/if}
							{#if item.reciter}· <bdi>{name(item.reciter)}</bdi>{/if}
						</small>
						{#if item.category}<small class="category">{name(item.category)}</small>{/if}
					</span>
				</a>
			</li>
		{/each}
	</ol>
</aside>

<style>
	.latest {
		display: grid;
		gap: var(--space-4);
		align-content: start;
	}

	h2 {
		font-size: var(--text-xl);
	}

	ol {
		display: grid;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	a {
		display: grid;
		grid-template-columns: 7rem 1fr;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2);
		border-radius: var(--radius-md);
		text-decoration: none;
		transition: background-color var(--duration) var(--ease);
	}

	a:hover,
	a:focus-visible {
		background: var(--color-surface);
	}

	.thumb {
		aspect-ratio: 16 / 9;
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: var(--color-surface-2);
	}

	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.art {
		display: grid;
		place-items: center;
		height: 100%;
		background: linear-gradient(135deg, var(--sakina-deep), var(--sakina-night));
		color: var(--sakina-gold);
	}

	.art :global(svg) {
		width: 24px;
		height: 24px;
	}

	.text {
		display: grid;
		gap: 2px;
		min-width: 0;
	}

	strong {
		font-size: var(--text-sm);
		font-weight: 600;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	small {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		color: var(--color-text-muted);
		font-size: var(--text-xs);
		white-space: nowrap;
		overflow: hidden;
	}

	small :global(svg) {
		flex: none;
		width: 12px;
		height: 12px;
	}

	.category {
		color: var(--color-accent-text);
	}
</style>
