<script lang="ts">
	import type { RecordModel } from 'pocketbase';
	import { pb } from '#lib/admin/pb.ts';
	import { formatDuration } from '#lib/media.ts';
	import { isSynced, lineLanguages, TEXT_LANGUAGES, type Line } from '#lib/text-languages.ts';

	// Audio of the categories that get synced text (Quran, Douas, Sahifa, Ziyarat by default)
	type Filter = 'all' | 'none' | 'text' | 'synced';
	const FILTERS: { id: Filter; label: string }[] = [
		{ id: 'all', label: 'Tout' },
		{ id: 'none', label: 'Sans texte' },
		{ id: 'text', label: 'Texte à synchroniser' },
		{ id: 'synced', label: 'Synchronisé' }
	];

	let tracks = $state<RecordModel[]>([]);
	let loading = $state(true);
	let filter = $state<Filter>('none');
	let query = $state('');

	const textState = (r: RecordModel): Filter => {
		const lines = (r.lines as Line[] | null) ?? [];
		if (lines.length === 0) return 'none';
		return isSynced(lines) ? 'synced' : 'text';
	};

	const shown = $derived(
		tracks.filter(
			(r) =>
				(filter === 'all' || textState(r) === filter) &&
				`${r.title_fr} ${r.title_ar} ${r.expand?.reciter?.name_fr ?? ''}`
					.toLowerCase()
					.includes(query.toLowerCase())
		)
	);

	$effect(() => {
		pb.collection('tracks')
			.getFullList({
				filter: 'category.synced_text = true',
				sort: '-created',
				expand: 'category,reciter',
				fields:
					'id,title_fr,title_ar,status,published,duration,lines,expand.category.name_fr,expand.reciter.name_fr'
			})
			.then((list) => (tracks = list))
			.finally(() => (loading = false));
	});
</script>

<section class="texts">
	<h1>Textes synchronisés</h1>
	<p class="help">
		Audios des catégories avec texte synchronisé. Choisissez une piste pour saisir son texte
		(plusieurs langues possibles) puis le caler sur la voix.
	</p>

	<div class="bar">
		<div class="filters" role="group" aria-label="Filtrer">
			{#each FILTERS as f (f.id)}
				<button type="button" aria-pressed={filter === f.id} onclick={() => (filter = f.id)}>
					{f.label}
					<span
						>{f.id === 'all'
							? tracks.length
							: tracks.filter((r) => textState(r) === f.id).length}</span
					>
				</button>
			{/each}
		</div>
		<input type="search" placeholder="Rechercher un titre, un récitant…" bind:value={query} />
	</div>

	{#if loading}
		<p>Chargement…</p>
	{:else if shown.length === 0}
		<p class="help">Aucune piste dans ce filtre.</p>
	{:else}
		<ul>
			{#each shown as r (r.id)}
				{@const lines = (r.lines as Line[] | null) ?? []}
				<li>
					<a href="/admin/textes/{r.id}">
						<span class="title">
							<strong>{r.title_fr}</strong>
							<span lang="ar" dir="rtl">{r.title_ar}</span>
						</span>
						<span class="meta">
							{r.expand?.category?.name_fr ?? ''}
							{r.expand?.reciter ? `· ${r.expand.reciter.name_fr}` : ''}
							· {formatDuration(r.duration)}
							{#if r.status !== 'ready'}· en traitement{/if}
							{#if !r.published}· brouillon{/if}
						</span>
						<span class="langs">
							{#each lineLanguages(lines) as code (code)}<span class="lang"
									>{TEXT_LANGUAGES[code].short}</span
								>{/each}
						</span>
						<span class="state {textState(r)}">
							{textState(r) === 'synced'
								? `Synchronisé · ${lines.length} lignes`
								: textState(r) === 'text'
									? `Texte · ${lines.length} lignes à caler`
									: 'Pas de texte'}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.texts {
		display: grid;
		gap: var(--space-4);
	}

	h1 {
		font-family: var(--font-ui);
		font-size: var(--text-2xl);
	}

	.help {
		color: var(--color-text-muted);
	}

	.bar {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		align-items: center;
		justify-content: space-between;
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.filters button {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		background: none;
		color: var(--color-text);
		font-size: var(--text-sm);
		cursor: pointer;
	}

	.filters button[aria-pressed='true'] {
		border-color: var(--color-accent);
		color: var(--color-accent-text);
	}

	.filters span {
		margin-inline-start: var(--space-1);
		color: var(--color-text-muted);
	}

	input {
		min-width: 18rem;
		min-height: 40px;
		padding: 0 var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		background: var(--color-surface);
	}

	ul {
		display: grid;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	a {
		display: grid;
		grid-template-columns: 2fr 2fr auto auto;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		text-decoration: none;
	}

	a:hover {
		border-color: var(--color-accent);
	}

	.title {
		display: grid;
	}

	.title span {
		color: var(--color-text-muted);
		text-align: start;
	}

	.meta {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.langs {
		display: flex;
		gap: var(--space-1);
	}

	.lang {
		padding: 1px var(--space-2);
		border-radius: var(--radius-pill);
		background: var(--color-surface-2);
		font-size: var(--text-xs);
	}

	.state {
		font-size: var(--text-sm);
		font-weight: 600;
		white-space: nowrap;
	}

	.state.none {
		color: var(--color-text-muted);
	}

	.state.text {
		color: #e5a96b;
	}

	.state.synced {
		color: var(--color-secondary-text);
	}

	@media (max-width: 900px) {
		a {
			grid-template-columns: 1fr;
		}
	}
</style>
