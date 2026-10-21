<script lang="ts">
	import UserRound from '@lucide/svelte/icons/user-round';
	import Seo from '#lib/components/Seo.svelte';
	import MediaGrid from '#lib/components/media/MediaGrid.svelte';
	import SectionTitle from '#lib/components/media/SectionTitle.svelte';
	import { localized, name } from '#lib/media.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const bio = $derived(localized(data.reciter.bio_fr, data.reciter.bio_ar));
	const otherName = $derived(getLocale() === 'ar' ? data.reciter.name_fr : data.reciter.name_ar);
</script>

<Seo title={name(data.reciter)} description={bio || undefined} image={data.reciter.photoUrl} />

<div class="container page">
	<header>
		<div class="avatar">
			{#if data.reciter.photoUrl}
				<img src={data.reciter.photoUrl} alt="" />
			{:else}
				<UserRound aria-hidden="true" />
			{/if}
		</div>
		<div>
			<small>{m.reciter_label()}</small>
			<h1><bdi>{name(data.reciter)}</bdi></h1>
			{#if otherName && otherName !== name(data.reciter)}<p class="other">
					<bdi>{otherName}</bdi>
				</p>{/if}
		</div>
	</header>

	{#if bio}<p class="bio"><bdi>{bio}</bdi></p>{/if}

	<section>
		<SectionTitle title={m.reciter_items()} />
		{#if data.items.length}
			<MediaGrid items={data.items} />
		{:else}
			<p class="empty">{m.empty_category()}</p>
		{/if}
	</section>
</div>

<style>
	.page {
		display: grid;
		gap: var(--space-6);
		padding-block: var(--space-6);
	}

	header {
		display: flex;
		align-items: center;
		gap: var(--space-5);
	}

	.avatar {
		display: grid;
		place-items: center;
		flex: none;
		width: 96px;
		height: 96px;
		border-radius: 50%;
		overflow: hidden;
		background: var(--color-surface-2);
		color: var(--color-text-muted);
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar :global(svg) {
		width: 44px;
		height: 44px;
	}

	small {
		color: var(--color-accent-text);
		font-weight: 600;
	}

	h1 {
		font-family: var(--font-ui);
		font-size: var(--text-2xl);
	}

	.other {
		color: var(--color-text-muted);
	}

	.bio {
		max-width: 48rem;
		white-space: pre-line;
		color: var(--color-text-muted);
	}

	.empty {
		color: var(--color-text-muted);
	}
</style>
