<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { RecordModel } from 'pocketbase';
	import { syncedCategories, texts, type LibraryText } from '#lib/admin/library.ts';
	import '#lib/admin/forms.css';
	import { Draft } from '#lib/admin/sync/draft.svelte.ts';
	import TextStep from '#lib/admin/sync/TextStep.svelte';
	import Button from '#lib/components/ui/Button.svelte';

	let record = $state<LibraryText | null>(null);
	let draft = $state<Draft | null>(null);
	let categories = $state<RecordModel[]>([]);
	let titleFr = $state('');
	let titleAr = $state('');
	let category = $state('');
	let source = $state('');
	let message = $state('');
	let saving = $state(false);

	const id = $derived(page.params.id ?? '');

	$effect(() => {
		if (!id) return;
		Promise.all([texts().getOne(id), syncedCategories()]).then(([t, cats]) => {
			record = t;
			categories = cats;
			titleFr = t.title_fr;
			titleAr = t.title_ar;
			category = t.category;
			source = t.source;
			draft = new Draft(t.lines ?? []);
		});
	});

	async function save() {
		if (!record || !draft) return;
		saving = true;
		message = '';
		try {
			record = await texts().update(record.id, {
				title_fr: titleFr,
				title_ar: titleAr,
				category,
				source,
				lines: draft.toTextLines()
			});
			message = 'Texte enregistré.';
		} catch (e) {
			message = `Échec : ${e instanceof Error ? e.message : e}`;
		} finally {
			saving = false;
		}
	}

	async function remove() {
		if (!record || !confirm(`Supprimer « ${record.title_fr} » de la bibliothèque ?`)) return;
		await texts().delete(record.id);
		goto(resolve('/admin/bibliotheque'));
	}
</script>

{#if !record || !draft}
	<p>Chargement…</p>
{:else}
	<div class="text">
		<header>
			<a href="/admin/bibliotheque">← Bibliothèque de textes</a>
			<div class="actions">
				<Button variant="ghost" onclick={remove}>Supprimer</Button>
				<Button onclick={save} disabled={saving}
					>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button
				>
			</div>
		</header>
		{#if message}<p class="alert" role="status">{message}</p>{/if}

		<div class="form meta">
			<div class="row-2">
				<label class="field">
					<span>Titre (français)</span>
					<input class="input" required bind:value={titleFr} />
				</label>
				<label class="field">
					<span>Titre (arabe)</span>
					<input class="input" dir="rtl" lang="ar" bind:value={titleAr} />
				</label>
			</div>
			<div class="row-2">
				<label class="field">
					<span>Catégorie</span>
					<select class="input" bind:value={category}>
						<option value="">—</option>
						{#each categories as c (c.id)}<option value={c.id}>{c.name_fr}</option>{/each}
					</select>
				</label>
				<label class="field">
					<span>Source</span>
					<input
						class="input"
						bind:value={source}
						placeholder="D'où viennent le texte et les traductions"
					/>
					{#if record.source_url}<small
							><a href={record.source_url} target="_blank" rel="noopener">{record.source_url}</a
							></small
						>{/if}
				</label>
			</div>
		</div>

		<TextStep {draft} />
	</div>
{/if}

<style>
	.text {
		display: grid;
		gap: var(--space-5);
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
	}

	header > a {
		color: var(--color-accent-text);
		font-size: var(--text-sm);
		text-decoration: none;
	}

	.actions {
		display: flex;
		gap: var(--space-2);
	}

	.meta {
		max-width: 60rem;
	}
</style>
