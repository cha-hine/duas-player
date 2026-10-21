<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { RecordModel } from 'pocketbase';
	import { createText, syncedCategories, texts, type LibraryText } from '#lib/admin/library.ts';
	import { pb } from '#lib/admin/pb.ts';
	import '#lib/admin/forms.css';
	import Button from '#lib/components/ui/Button.svelte';
	import { lineLanguages, TEXT_LANGUAGES, type TextLine } from '#lib/text-languages.ts';

	type Imported = {
		id: string;
		title: string;
		sourceUrl: string;
		sections: { title: string; lines: TextLine[] }[];
	};

	let list = $state<LibraryText[]>([]);
	let categories = $state<RecordModel[]>([]);
	let loading = $state(true);
	let query = $state('');
	let categoryFilter = $state('');

	// Import from duas.org
	let address = $state('');
	let reading = $state(false);
	let imported = $state<Imported | null>(null);
	let chosen = $state<boolean[]>([]);
	let importTitle = $state('');
	let importTitleAr = $state('');
	let importCategory = $state('');
	let importError = $state('');

	const shown = $derived(
		list.filter(
			(t) =>
				(!categoryFilter || t.category === categoryFilter) &&
				`${t.title_fr} ${t.title_ar}`.toLowerCase().includes(query.toLowerCase())
		)
	);
	const categoryName = (id: string) => categories.find((c) => c.id === id)?.name_fr ?? '';

	async function load() {
		[list, categories] = await Promise.all([
			texts().getFullList({
				sort: 'title_fr',
				fields: 'id,title_fr,title_ar,category,lines,source'
			}),
			syncedCategories()
		]);
		loading = false;
	}

	$effect(() => {
		load();
	});

	async function newText() {
		const text = await createText({ title_fr: 'Nouveau texte', lines: [] });
		goto(resolve('/admin/bibliotheque/[id]', { id: text.id }));
	}

	async function read(event: SubmitEvent) {
		event.preventDefault();
		reading = true;
		importError = '';
		imported = null;
		try {
			const res = await fetch(`/api/library/duas-org?url=${encodeURIComponent(address)}`, {
				headers: { Authorization: pb.authStore.token }
			});
			const body = await res.json();
			if (!res.ok) throw new Error(body.message ?? res.statusText);
			imported = body as Imported;
			chosen = imported.sections.map(() => true);
			importTitle = imported.title;
			importTitleAr = '';
			importCategory =
				categories.find((c) => c.slug === (/ziy?a?rat/i.test(imported!.id) ? 'ziyarat' : 'douas'))
					?.id ?? '';
		} catch (e) {
			importError = e instanceof Error ? e.message : String(e);
		} finally {
			reading = false;
		}
	}

	async function addImported() {
		if (!imported) return;
		const lines = imported.sections.filter((_, i) => chosen[i]).flatMap((s) => s.lines);
		const languages = lineLanguages(lines)
			.map((c) => TEXT_LANGUAGES[c].fr.toLowerCase())
			.join(', ');
		const text = await createText({
			title_fr: importTitle,
			title_ar: importTitleAr,
			category: importCategory,
			lines,
			source: `duas.org — ${imported.title} (${languages})`,
			source_url: imported.sourceUrl
		});
		goto(resolve('/admin/bibliotheque/[id]', { id: text.id }));
	}
</script>

<section class="library">
	<header>
		<div>
			<h1>Bibliothèque de textes</h1>
			<p class="help">
				Le texte d'une sourate, d'une doua ou d'une ziyarat, enregistré une fois et réutilisé pour
				chaque récitation : dans l'éditeur d'un audio, « Choisir dans la bibliothèque » le reprend,
				il ne reste qu'à le caler sur la voix.
			</p>
		</div>
		<Button onclick={newText}>Nouveau texte</Button>
	</header>

	<details class="import">
		<summary>Importer depuis duas.org</summary>
		<form class="form" onsubmit={read}>
			<label class="field">
				<span>Adresse de la page</span>
				<input
					class="input"
					type="url"
					required
					placeholder="https://www.duas.org/dua-kumayl.html"
					bind:value={address}
				/>
				<small
					>Arabe, translittération et traduction anglaise ; vous pourrez ensuite ajouter le
					français, le gujarati…</small
				>
			</label>
			<Button type="submit" disabled={reading}>{reading ? 'Lecture…' : 'Lire la page'}</Button>
		</form>
		{#if importError}<p class="alert error">{importError}</p>{/if}
		{#if imported}
			<div class="found">
				<h2>{imported.title}</h2>
				{#each imported.sections as section, i (i)}
					<label class="section">
						<input type="checkbox" bind:checked={chosen[i]} />
						<span>
							<strong>{section.title}</strong> · {section.lines.length} lignes
							<small dir="rtl" lang="ar">{section.lines[0]?.ar ?? ''}</small>
						</span>
					</label>
				{/each}
				<div class="row-2">
					<label class="field">
						<span>Titre (français)</span>
						<input class="input" required bind:value={importTitle} />
					</label>
					<label class="field">
						<span>Titre (arabe)</span>
						<input class="input" dir="rtl" lang="ar" bind:value={importTitleAr} />
					</label>
				</div>
				<label class="field">
					<span>Catégorie</span>
					<select class="input" bind:value={importCategory}>
						{#each categories as c (c.id)}<option value={c.id}>{c.name_fr}</option>{/each}
					</select>
				</label>
				<Button onclick={addImported} disabled={!chosen.some(Boolean) || !importTitle}>
					Ajouter à la bibliothèque
				</Button>
			</div>
		{/if}
	</details>

	<div class="bar">
		<select class="input" bind:value={categoryFilter} aria-label="Catégorie">
			<option value="">Toutes les catégories</option>
			{#each categories as c (c.id)}<option value={c.id}>{c.name_fr}</option>{/each}
		</select>
		<input class="input" type="search" placeholder="Rechercher…" bind:value={query} />
	</div>

	{#if loading}
		<p>Chargement…</p>
	{:else if shown.length === 0}
		<p class="help">Aucun texte pour l'instant.</p>
	{:else}
		<ul>
			{#each shown as t (t.id)}
				<li>
					<a href="/admin/bibliotheque/{t.id}">
						<span class="title">
							<strong>{t.title_fr}</strong>
							{#if t.title_ar}<span lang="ar" dir="rtl">{t.title_ar}</span>{/if}
						</span>
						<span class="meta">{categoryName(t.category)} · {t.lines?.length ?? 0} lignes</span>
						<span class="langs">
							{#each lineLanguages(t.lines ?? []) as code (code)}
								<span class="lang">{TEXT_LANGUAGES[code].short}</span>
							{/each}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.library {
		display: grid;
		gap: var(--space-5);
	}

	header {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-4);
	}

	h1 {
		font-family: var(--font-ui);
		font-size: var(--text-2xl);
	}

	.help {
		max-width: 52rem;
		color: var(--color-text-muted);
	}

	.import {
		padding: var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}

	.import summary {
		font-weight: 600;
		cursor: pointer;
	}

	.import .form {
		margin-top: var(--space-4);
		max-width: 44rem;
	}

	.alert {
		margin-top: var(--space-3);
	}

	.found {
		display: grid;
		gap: var(--space-4);
		margin-top: var(--space-5);
		max-width: 44rem;
	}

	.found h2 {
		font-family: var(--font-ui);
		font-size: var(--text-lg);
	}

	.section {
		display: flex;
		gap: var(--space-3);
		align-items: flex-start;
	}

	.section small {
		display: block;
		color: var(--color-text-muted);
		font-family: var(--font-arabic);
	}

	.bar {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
	}

	.bar .input {
		width: auto;
		min-width: 16rem;
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
		grid-template-columns: 2fr 1fr auto;
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
</style>
