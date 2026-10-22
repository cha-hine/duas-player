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
	import { player } from '#lib/player/player.svelte.ts';
	import { settings } from '#lib/player/settings.svelte.ts';
	import { lineAt } from '#lib/player/sync.ts';
	import { verseMark } from '#lib/quran.ts';
	import { isSynced, lineLanguages, TEXT_LANGUAGES } from '#lib/text-languages.ts';
	import AudioPlayer from './AudioPlayer.svelte';
	import MediaGrid from './MediaGrid.svelte';
	import SectionTitle from './SectionTitle.svelte';
	import VideoPlayer from './VideoPlayer.svelte';

	let { item, related }: { item: MediaItem; related: MediaItem[] } = $props();

	const description = $derived(localized(item.description_fr, item.description_ar));
	const languages = $derived(lineLanguages(item.lines));
	// Highlights the line being recited when this track is the one playing
	const currentLine = $derived(
		player.isCurrent(item) && isSynced(item.lines)
			? lineAt(item.lines, player.currentTime + 0.15)
			: -1
	);
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
			<AudioPlayer {item} queue={related} />
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
				<!-- Each line starts the recitation from there -->
				<button
					class="line"
					class:current={i === currentLine}
					type="button"
					onclick={() => player.playFrom([item, ...related], item, line.start)}
				>
					{#each languages as code (code)}
						{#if line[code]}
							<span
								class="text"
								class:ar={code === 'ar'}
								lang={TEXT_LANGUAGES[code].lang}
								dir={TEXT_LANGUAGES[code].dir}
								style:font-family={settings.font(code).family}
								style:--scale={settings.scale(code)}
								>{line[code]}{#if code === 'ar' && line.n}
									<span class="mark">{verseMark(line.n)}</span>{/if}</span
							>
						{/if}
					{/each}
				</button>
			{/each}
			{#if item.textSource}
				<p class="credit">
					{m.text_source()}
					{#if item.textSource.url}
						<a href={item.textSource.url} target="_blank" rel="noopener">{item.textSource.label}</a>
					{:else}
						{item.textSource.label}
					{/if}
				</p>
			{/if}
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

	.mark {
		color: var(--color-accent-text);
		margin-inline-start: 0.25em;
	}

	.credit {
		color: var(--color-text-muted);
		font-size: var(--text-xs);
	}

	.credit a {
		color: inherit;
	}

	.lines h2 {
		font-size: var(--text-xl);
	}

	.line {
		display: grid;
		gap: var(--space-1);
		width: 100%;
		padding: var(--space-3) var(--space-4) var(--space-4);
		border: none;
		border-bottom: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: transparent;
		text-align: start;
		cursor: pointer;
		transition: background-color var(--duration) var(--ease);
	}

	.line:hover {
		background: var(--color-surface);
	}

	.line.current {
		background: color-mix(in srgb, var(--color-accent) 14%, transparent);
	}

	.line.current .ar {
		color: var(--color-accent-text);
	}

	/* Each language aligned in its own direction (dir on the element) */
	/* Fonts and sizes the listener chose in the player's text settings */
	.text {
		text-align: start;
		color: var(--color-text-muted);
		font-size: calc(1rem * var(--scale, 1));
	}

	.ar {
		font-size: calc(1.5rem * var(--scale, 1));
		line-height: 1.9;
		color: var(--color-text);
	}
</style>
