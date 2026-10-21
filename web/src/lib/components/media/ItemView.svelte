<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import Tag from '#lib/components/ui/Tag.svelte';
	import { link } from '#lib/i18n.ts';
	import { LANGUAGES } from '#lib/languages.ts';
	import {
		formatDuration,
		localized,
		name,
		otherTitle,
		title,
		type MediaItem
	} from '#lib/media.ts';
	import { m } from '#lib/paraglide/messages.js';
	import AudioPlayer from './AudioPlayer.svelte';
	import MediaGrid from './MediaGrid.svelte';
	import SectionTitle from './SectionTitle.svelte';
	import VideoPlayer from './VideoPlayer.svelte';

	let { item, related }: { item: MediaItem; related: MediaItem[] } = $props();

	const description = $derived(localized(item.description_fr, item.description_ar));
	const seoDescription = $derived(
		[otherTitle(item), item.reciter && name(item.reciter), item.category && name(item.category)]
			.filter(Boolean)
			.join(' · ')
	);
</script>

<Seo
	title={title(item)}
	description={description || seoDescription}
	image={item.posterUrl}
	type={item.kind === 'video' ? 'video.other' : 'music.song'}
/>

<article class="container item">
	<div class="media">
		{#if item.kind === 'video'}
			<VideoPlayer src={item.hlsUrl} poster={item.posterUrl} label={title(item)} />
		{:else}
			<AudioPlayer {item} label={title(item)} />
		{/if}
	</div>

	<header>
		{#if item.category}
			<a class="category" href={link(`/categorie/${item.category.slug}`)}>{name(item.category)}</a>
		{/if}
		<h1><bdi>{title(item)}</bdi></h1>
		{#if otherTitle(item)}<p class="other"><bdi>{otherTitle(item)}</bdi></p>{/if}
		<div class="meta">
			{#if item.reciter}
				<a href={link(`/recitant/${item.reciter.slug}`)} dir="auto">{name(item.reciter)}</a>
			{/if}
			{#if item.duration}<span>{formatDuration(item.duration)}</span>{/if}
			{#if item.language}<Tag>{LANGUAGES[item.language].native}</Tag>{/if}
			<Tag>{item.kind === 'video' ? m.video_label() : m.audio_label()}</Tag>
		</div>
		{#if description}<p class="description"><bdi>{description}</bdi></p>{/if}
	</header>

	{#if item.lines.length}
		<section class="lines">
			<h2>{m.synced_text()}</h2>
			{#each item.lines as line, i (i)}
				<div class="line">
					{#if line.ar}<p class="ar" lang="ar" dir="rtl">{line.ar}</p>{/if}
					{#if line.fr}<p class="fr" lang="fr" dir="ltr">{line.fr}</p>{/if}
				</div>
			{/each}
		</section>
	{/if}

	{#if related.length}
		<section class="related">
			<SectionTitle
				title={m.more_in_category()}
				href={item.category ? link(`/categorie/${item.category.slug}`) : undefined}
			/>
			<MediaGrid items={related} />
		</section>
	{/if}
</article>

<style>
	.item {
		display: grid;
		gap: var(--space-6);
		padding-block: var(--space-5) var(--space-7);
	}

	.media {
		max-width: 960px;
	}

	header {
		display: grid;
		gap: var(--space-2);
	}

	.category {
		justify-self: start;
		color: var(--color-accent-text);
		font-size: var(--text-sm);
		font-weight: 600;
		text-decoration: none;
	}

	h1 {
		font-family: var(--font-ui);
		font-size: clamp(1.5rem, 4vw, 2.25rem);
	}

	.other {
		color: var(--color-text-muted);
		font-size: var(--text-lg);
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.meta a {
		color: var(--color-text);
		font-weight: 600;
	}

	.description {
		max-width: 48rem;
		white-space: pre-line;
		color: var(--color-text-muted);
	}

	.lines {
		display: grid;
		gap: var(--space-4);
		max-width: 48rem;
	}

	.lines h2 {
		font-size: var(--text-xl);
	}

	.line {
		display: grid;
		gap: var(--space-1);
		padding-bottom: var(--space-4);
		border-bottom: 1px solid var(--color-border);
	}

	.ar {
		font-family: var(--font-arabic);
		font-size: 1.5rem;
		line-height: 1.9;
	}

	.fr {
		color: var(--color-text-muted);
	}
</style>
