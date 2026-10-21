<script lang="ts">
	import type { RecordModel } from 'pocketbase';
	import { page } from '$app/state';
	import { PUBLIC_PB_URL } from '$app/env/public';
	import { pb } from '#lib/admin/pb.ts';
	import AdjustStep from '#lib/admin/sync/AdjustStep.svelte';
	import { Draft, type DraftData } from '#lib/admin/sync/draft.svelte.ts';
	import TapStep from '#lib/admin/sync/TapStep.svelte';
	import TextStep from '#lib/admin/sync/TextStep.svelte';
	import { decodeForWaveform } from '#lib/admin/sync/time.ts';
	import Button from '#lib/components/ui/Button.svelte';
	import type { MediaItem } from '#lib/media.ts';
	import { openImmersive } from '#lib/player/immersive.ts';
	import { player } from '#lib/player/player.svelte.ts';
	import type { Line } from '#lib/text-languages.ts';

	const SAMPLE_RATE = 8000;
	const STEPS = [
		{ id: 'text', label: '1. Texte' },
		{ id: 'sync', label: '2. Synchroniser' },
		{ id: 'adjust', label: '3. Ajuster' }
	] as const;

	let record = $state<RecordModel | null>(null);
	let draft = $state<Draft | null>(null);
	let step = $state<(typeof STEPS)[number]['id']>('text');
	let loadError = $state('');
	let message = $state('');
	let saving = $state(false);
	let restored = $state(false);

	let audio = $state<HTMLAudioElement>();
	let paused = $state(true);
	let time = $state(0);
	let samples = $state<Float32Array | null>(null);

	const id = $derived(page.params.id ?? '');
	const draftKey = $derived(`sakina-sync-draft:${id}`);
	const audioUrl = $derived(
		record ? `${PUBLIC_PB_URL}/api/files/tracks/${record.id}/${record.stream || record.audio}` : ''
	);

	$effect(() => {
		if (!id) return;
		pb.collection('tracks')
			.getOne(id, { expand: 'category,reciter' })
			.then((r) => {
				record = r;
				const d = new Draft((r.lines as Line[]) ?? [], r.duration ?? 0);
				// Work in progress kept on this device since the last save
				try {
					const saved = localStorage.getItem(draftKey);
					if (saved) {
						d.restore(JSON.parse(saved) as DraftData);
						restored = true;
					}
				} catch {
					// storage unavailable
				}
				draft = d;
			})
			.catch(() => (loadError = 'Piste introuvable.'));
	});

	// Keep the draft on this device while editing
	$effect(() => {
		if (!draft) return;
		const json = JSON.stringify(draft.toJSON());
		try {
			localStorage.setItem(draftKey, json);
		} catch {
			// not kept, still in the page
		}
	});

	// Waveform for the adjust step, decoded once
	$effect(() => {
		if (step !== 'adjust' || samples || !audioUrl) return;
		decodeForWaveform(audioUrl, SAMPLE_RATE)
			.then((data) => (samples = data))
			.catch(() => (message = "La forme d'onde n'a pas pu être chargée."));
	});

	// Smooth playhead while playing (timeupdate alone is only ~4 times per second)
	$effect(() => {
		if (paused || !audio) return;
		let frame = 0;
		const tick = () => {
			time = audio!.currentTime;
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});

	async function save() {
		if (!draft || !record) return;
		saving = true;
		message = '';
		try {
			record = await pb.collection('tracks').update(record.id, { lines: draft.toSave() });
			try {
				localStorage.removeItem(draftKey);
			} catch {
				// nothing to clean
			}
			restored = false;
			message = draft.complete
				? 'Texte synchronisé enregistré.'
				: 'Texte enregistré. Il apparaîtra dans le lecteur une fois toutes les lignes synchronisées.';
		} catch (e) {
			message = `Échec de l'enregistrement : ${e instanceof Error ? e.message : e}`;
		} finally {
			saving = false;
		}
	}

	async function togglePublished() {
		if (!record) return;
		record = await pb.collection('tracks').update(record.id, { published: !record.published });
	}

	function discardLocal() {
		if (!record) return;
		try {
			localStorage.removeItem(draftKey);
		} catch {
			// nothing to clean
		}
		draft = new Draft((record.lines as Line[]) ?? [], record.duration ?? 0);
		restored = false;
	}

	/** Plays the draft in the real immersive player. */
	function preview() {
		if (!record || !draft) return;
		audio?.pause();
		const category = record.expand?.category;
		const reciter = record.expand?.reciter;
		const item: MediaItem = {
			kind: 'audio',
			id: record.id,
			slug: record.slug,
			title_fr: record.title_fr,
			title_ar: record.title_ar,
			description_fr: '',
			description_ar: '',
			language: null,
			duration: record.duration ?? 0,
			created: record.created,
			category: category
				? { ...category, description_fr: '', description_ar: '', icon: category.icon ?? '' }
				: null,
			reciter: reciter ? { ...reciter, bio_fr: '', bio_ar: '', photoUrl: null } : null,
			posterUrl: null,
			audioUrl,
			hlsUrl: null,
			lines: draft.complete ? draft.lines : []
		};
		player.playItems([item], item);
		player.energy = (record.energy as number[]) ?? [];
		openImmersive();
	}
</script>

{#if loadError}
	<p>{loadError}</p>
{:else if !record || !draft}
	<p>Chargement…</p>
{:else}
	<div class="editor">
		<header>
			<div>
				<a href="/admin/textes">← Textes synchronisés</a>
				<h1>{record.title_fr} <span lang="ar" dir="rtl">{record.title_ar}</span></h1>
				<small>
					{record.expand?.category?.name_fr ?? ''}
					{record.expand?.reciter ? `· ${record.expand.reciter.name_fr}` : ''}
					· {draft.count} lignes · {draft.syncedCount} synchronisées
				</small>
			</div>
			<div class="actions">
				<Button variant="secondary" onclick={preview} disabled={!draft.complete}
					>Aperçu dans le lecteur</Button
				>
				<Button variant="secondary" onclick={togglePublished}>
					{record.published ? 'Dépublier' : 'Publier'}
				</Button>
				<Button onclick={save} disabled={saving}
					>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button
				>
			</div>
		</header>

		{#if restored}
			<p class="note">
				Brouillon non enregistré retrouvé sur cet appareil.
				<button type="button" class="link" onclick={discardLocal}
					>Revenir à la version enregistrée</button
				>
			</p>
		{/if}
		{#if message}<p class="note" role="status">{message}</p>{/if}

		<nav class="steps">
			{#each STEPS as s (s.id)}
				<button type="button" aria-pressed={step === s.id} onclick={() => (step = s.id)}
					>{s.label}</button
				>
			{/each}
		</nav>

		<audio bind:this={audio} src={audioUrl} bind:paused bind:currentTime={time} preload="auto"
		></audio>

		{#if step === 'text'}
			<TextStep {draft} />
		{:else if step === 'sync' && audio}
			<TapStep {draft} {audio} {time} {paused} />
		{:else if step === 'adjust' && audio}
			<AdjustStep {draft} {audio} {time} {samples} sampleRate={SAMPLE_RATE} />
		{/if}
	</div>
{/if}

<style>
	.editor {
		display: grid;
		gap: var(--space-5);
	}

	header {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--space-4);
	}

	header a {
		color: var(--color-accent-text);
		font-size: var(--text-sm);
		text-decoration: none;
	}

	h1 {
		font-family: var(--font-ui);
		font-size: var(--text-xl);
		margin-block: var(--space-2);
	}

	h1 span {
		font-family: var(--font-arabic);
		color: var(--color-text-muted);
		margin-inline-start: var(--space-2);
	}

	small {
		color: var(--color-text-muted);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.note {
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		font-size: var(--text-sm);
	}

	.link {
		border: none;
		background: none;
		color: var(--color-accent-text);
		font-weight: 600;
		cursor: pointer;
	}

	.steps {
		display: flex;
		gap: var(--space-2);
		border-bottom: 1px solid var(--color-border);
	}

	.steps button {
		padding: var(--space-3) var(--space-4);
		border: none;
		border-bottom: 2px solid transparent;
		background: none;
		color: var(--color-text-muted);
		font-weight: 600;
		cursor: pointer;
	}

	.steps button[aria-pressed='true'] {
		color: var(--color-text);
		border-bottom-color: var(--color-accent);
	}
</style>
