<script lang="ts">
	import Headphones from '@lucide/svelte/icons/headphones';
	import Search from '@lucide/svelte/icons/search';
	import Seo from '#lib/components/Seo.svelte';
	import SectionTitle from '#lib/components/media/SectionTitle.svelte';
	import { link } from '#lib/i18n.ts';
	import { name } from '#lib/media.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { arabicNumber } from '#lib/quran.ts';
	import { normalizeSearch } from '#lib/search.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let query = $state('');

	const shown = $derived.by(() => {
		const q = normalizeSearch(query);
		if (!q) return data.surahs;
		return data.surahs.filter(
			(s) => String(s.number) === q || normalizeSearch(`${s.title_fr} ${s.title_ar}`).includes(q)
		);
	});

	/** "Sourate 2 — La vache" -> "La vache" */
	const frenchName = (title: string) => title.replace(/^Sourate \d+ — /, '');
	const isArabic = getLocale() === 'ar';
</script>

<Seo title={m.nav_quran()} description={m.quran_intro()} />

<div class="container page">
	<header>
		<h1>{m.nav_quran()}</h1>
		<p>{m.quran_intro()}</p>
	</header>

	<section>
		<SectionTitle title={m.all_surahs()} />
		<label class="search">
			<Search aria-hidden="true" />
			<input type="search" placeholder={m.quran_search()} bind:value={query} dir="auto" />
		</label>
		<ol class="surahs">
			{#each shown as s (s.number)}
				<li>
					<a href={link(`/quran/${s.number}`)}>
						<span class="number">{isArabic ? arabicNumber(s.number) : s.number}</span>
						<span class="names">
							<span class="ar" lang="ar" dir="rtl">{s.title_ar}</span>
							<span class="fr">{frenchName(s.title_fr)}</span>
						</span>
						<span class="meta">
							{m.verses_count({ count: s.verses })}
							{#if s.recitations}
								<span class="listen"><Headphones aria-hidden="true" />{s.recitations}</span>
							{/if}
						</span>
					</a>
				</li>
			{/each}
		</ol>
	</section>

	{#if data.reciters.length}
		<section>
			<SectionTitle title={m.quran_reciters()} />
			<ul class="reciters">
				{#each data.reciters as r (r.id)}
					<li>
						<a href={link(`/recitant/${r.slug}`)}>
							<span dir="auto">{name(r)}</span>
							<small>{m.surahs_count({ count: r.surahs })}</small>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>

<style>
	.page {
		display: grid;
		gap: var(--space-7);
		padding-block: var(--space-6);
	}

	header {
		display: grid;
		gap: var(--space-2);
	}

	h1 {
		font-size: var(--text-2xl);
	}

	header p {
		color: var(--color-text-muted);
	}

	.search {
		position: relative;
		display: block;
		max-width: 32rem;
		margin-bottom: var(--space-4);
	}

	.search :global(svg) {
		position: absolute;
		inset-inline-start: var(--space-4);
		top: 50%;
		width: 18px;
		height: 18px;
		transform: translateY(-50%);
		color: var(--color-text-muted);
	}

	.search input {
		width: 100%;
		min-height: 46px;
		padding-inline: calc(var(--space-4) * 2 + 18px) var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		background: var(--color-surface);
	}

	.surahs {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr));
		/* Every surah gets the same box, whatever the length of its names */
		grid-auto-rows: 1fr;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.surahs li {
		display: grid;
	}

	a {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: var(--space-1) var(--space-3);
		padding: var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		text-decoration: none;
		transition: border-color var(--duration) var(--ease);
	}

	a:hover,
	a:focus-visible {
		border-color: var(--color-accent);
	}

	.number {
		display: grid;
		place-items: center;
		grid-row: span 2;
		width: 2.6rem;
		height: 2.6rem;
		border-radius: 50%;
		background: color-mix(in srgb, var(--color-accent) 14%, transparent);
		color: var(--color-accent-text);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.names {
		display: flex;
		justify-content: space-between;
		gap: var(--space-2);
		min-width: 0;
	}

	.ar {
		flex-shrink: 0;
		font-family: var(--font-quran);
		font-size: 1.2rem;
		white-space: nowrap;
	}

	.fr {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		font-weight: 600;
	}

	.meta {
		display: flex;
		gap: var(--space-3);
		color: var(--color-text-muted);
		font-size: var(--text-xs);
	}

	.listen {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		color: var(--color-secondary-text);
	}

	.reciters {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.reciters a {
		display: inline-flex;
		align-items: baseline;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-pill);
		font-weight: 600;
	}

	.reciters small {
		color: var(--color-text-muted);
		font-weight: 400;
	}

	.listen :global(svg) {
		width: 12px;
		height: 12px;
	}
</style>
