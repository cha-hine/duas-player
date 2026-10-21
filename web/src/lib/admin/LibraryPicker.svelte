<script lang="ts">
	import { texts, type LibraryText } from './library.ts';
	import { lineLanguages, TEXT_LANGUAGES } from '#lib/text-languages.ts';
	import Button from '#lib/components/ui/Button.svelte';
	import './forms.css';

	// Chooses a library text for a track; the track's category is listed first.
	let {
		category,
		onpick,
		onclose
	}: { category: string; onpick: (text: LibraryText) => void; onclose: () => void } = $props();

	let list = $state<LibraryText[]>([]);
	let query = $state('');
	let dialog = $state<HTMLDialogElement>();

	const shown = $derived(
		list
			.filter((t) => `${t.title_fr} ${t.title_ar}`.toLowerCase().includes(query.toLowerCase()))
			.sort((a, b) => Number(b.category === category) - Number(a.category === category))
	);

	$effect(() => {
		dialog?.showModal();
		texts()
			.getFullList({ sort: 'title_fr' })
			.then((all) => (list = all));
	});
</script>

<dialog bind:this={dialog} {onclose} aria-label="Choisir un texte">
	<div class="head">
		<h2>Choisir dans la bibliothèque</h2>
		<Button variant="ghost" onclick={() => dialog?.close()}>Fermer</Button>
	</div>
	<input class="input" type="search" placeholder="Rechercher…" bind:value={query} autofocus />
	<ul>
		{#each shown as t (t.id)}
			<li>
				<button type="button" onclick={() => onpick(t)}>
					<strong>{t.title_fr}</strong>
					{#if t.title_ar}<span lang="ar" dir="rtl">{t.title_ar}</span>{/if}
					<small>
						{t.lines?.length ?? 0} lignes ·
						{lineLanguages(t.lines ?? [])
							.map((c) => TEXT_LANGUAGES[c].short)
							.join(' ')}
					</small>
				</button>
			</li>
		{:else}
			<li class="empty">Aucun texte. Ajoutez-en dans « Bibliothèque de textes ».</li>
		{/each}
	</ul>
</dialog>

<style>
	dialog {
		width: min(40rem, 92vw);
		max-height: 80vh;
		padding: var(--space-5);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-bg);
		color: var(--color-text);
	}

	dialog::backdrop {
		background: rgb(0 0 0 / 0.6);
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-3);
	}

	h2 {
		font-family: var(--font-ui);
		font-size: var(--text-lg);
	}

	ul {
		display: grid;
		gap: var(--space-2);
		margin: var(--space-4) 0 0;
		padding: 0;
		list-style: none;
	}

	button {
		display: grid;
		gap: 2px;
		width: 100%;
		padding: var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-text);
		text-align: start;
		cursor: pointer;
	}

	button:hover {
		border-color: var(--color-accent);
	}

	span {
		color: var(--color-text-muted);
		text-align: start;
	}

	small {
		color: var(--color-text-muted);
	}

	.empty {
		color: var(--color-text-muted);
	}
</style>
