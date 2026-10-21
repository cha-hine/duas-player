<script lang="ts">
	import type { RecordModel } from 'pocketbase';
	import Button from '#lib/components/ui/Button.svelte';
	import { LANGUAGES } from '#lib/languages.ts';
	import { UPLOAD_TARGETS, type UploadCollection } from '#lib/upload-protocol.ts';
	import { UploadFailed, uploadFile, type Progress } from '#lib/uploader.ts';
	import { pb, slugify } from './pb.ts';
	import './forms.css';

	let collection = $state<UploadCollection>('tracks');
	let titleFr = $state('');
	let titleAr = $state('');
	let slug = $state('');
	let slugEdited = $state(false);
	let category = $state('');
	let reciter = $state('');
	let published = $state(false);
	let language = $state('ar');
	let files = $state<FileList>();

	let categories = $state<RecordModel[]>([]);
	let reciters = $state<RecordModel[]>([]);
	let progress = $state<Progress | null>(null);
	let busy = $state(false);
	let error = $state('');
	let fieldErrors = $state<Record<string, string>>({});
	let done = $state('');

	const file = $derived(files?.[0]);
	const percent = $derived(progress ? Math.floor((progress.sent / progress.total) * 100) : 0);
	const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

	$effect(() => {
		if (!slugEdited) slug = slugify(titleFr);
	});

	$effect(() => {
		pb.collection('categories')
			.getFullList({ sort: 'order,name_fr' })
			.then((list) => (categories = list));
		pb.collection('reciters')
			.getFullList({ sort: 'name_fr' })
			.then((list) => (reciters = list));
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!file) return;
		busy = true;
		error = '';
		fieldErrors = {};
		done = '';
		try {
			const record = await uploadFile(
				file,
				pb.authStore.token,
				{
					collection,
					data: {
						title_fr: titleFr,
						title_ar: titleAr,
						slug,
						category,
						reciter,
						published,
						language,
						status: 'pending'
					}
				},
				(p) => (progress = p)
			);
			done = `« ${record.title_fr} » a été ajouté.`;
			titleFr = titleAr = slug = '';
			slugEdited = false;
			files = undefined;
			progress = null;
		} catch (e) {
			if (e instanceof UploadFailed && e.status === 401) {
				pb.authStore.clear();
				return;
			}
			const data =
				e instanceof UploadFailed
					? (e.body.data as Record<string, { message: string }>)
					: undefined;
			fieldErrors = Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [k, v.message]));
			error =
				Object.keys(fieldErrors).length > 0
					? 'Vérifiez les champs signalés, puis renvoyez : le fichier déjà envoyé sera réutilisé.'
					: `L'envoi a échoué (${e instanceof Error ? e.message : e}). Relancez pour reprendre là où il s'est arrêté.`;
		} finally {
			busy = false;
		}
	}
</script>

<form class="form" onsubmit={submit}>
	<h1>Ajouter un contenu</h1>

	<div class="field">
		<span>Type</span>
		<div class="segmented">
			<label><input type="radio" value="tracks" bind:group={collection} /> Audio</label>
			<label><input type="radio" value="videos" bind:group={collection} /> Vidéo</label>
		</div>
	</div>

	<label class="field">
		<span>Fichier</span>
		<input
			class="input"
			type="file"
			accept={collection === 'tracks' ? 'audio/*' : 'video/*'}
			required
			bind:files
		/>
		{#if file}<small>{file.name} · {mb(file.size)} Mo</small>{/if}
		{#if fieldErrors[UPLOAD_TARGETS[collection]]}
			<small class="error">{fieldErrors[UPLOAD_TARGETS[collection]]}</small>
		{/if}
	</label>

	<div class="row-2">
		<label class="field">
			<span>Titre (français)</span>
			<input class="input" required bind:value={titleFr} />
			{#if fieldErrors.title_fr}<small class="error">{fieldErrors.title_fr}</small>{/if}
		</label>
		<label class="field">
			<span>Titre (arabe)</span>
			<input class="input" dir="rtl" lang="ar" required bind:value={titleAr} />
			{#if fieldErrors.title_ar}<small class="error">{fieldErrors.title_ar}</small>{/if}
		</label>
	</div>

	<label class="field">
		<span>Adresse de la page</span>
		<input
			class="input"
			required
			pattern="[a-z0-9]+(-[a-z0-9]+)*"
			bind:value={slug}
			oninput={() => (slugEdited = true)}
		/>
		<small>Lettres minuscules, chiffres et tirets. Rempli automatiquement depuis le titre.</small>
		{#if fieldErrors.slug}<small class="error">{fieldErrors.slug}</small>{/if}
	</label>

	<div class="row-2">
		<label class="field">
			<span>Catégorie</span>
			<select class="input" required bind:value={category}>
				<option value="" disabled>Choisir…</option>
				{#each categories as c (c.id)}
					<option value={c.id}>{c.name_fr} · {c.name_ar}</option>
				{/each}
			</select>
			{#if fieldErrors.category}<small class="error">{fieldErrors.category}</small>{/if}
		</label>
		<label class="field">
			<span>Récitant (optionnel)</span>
			<select class="input" bind:value={reciter}>
				<option value="">Aucun</option>
				{#each reciters as r (r.id)}
					<option value={r.id}>{r.name_fr} · {r.name_ar}</option>
				{/each}
			</select>
		</label>
	</div>

	<label class="field">
		<span>Langue</span>
		<select class="input" bind:value={language}>
			{#each Object.entries(LANGUAGES) as [code, label] (code)}
				<option value={code}>{label.fr} · {label.native}</option>
			{/each}
		</select>
	</label>

	<label class="check">
		<input type="checkbox" bind:checked={published} />
		Publier tout de suite (sinon reste en brouillon)
	</label>

	{#if progress}
		<div
			class="progress"
			role="progressbar"
			aria-valuenow={percent}
			aria-valuemin={0}
			aria-valuemax={100}
		>
			<div class="bar" style:width="{percent}%"></div>
		</div>
		<small class="progress-label">{percent} % · {mb(progress.sent)} / {mb(progress.total)} Mo</small
		>
	{/if}

	{#if error}<p class="alert error" role="alert">{error}</p>{/if}
	{#if done}<p class="alert success" role="status">{done}</p>{/if}

	<Button type="submit" size="lg" disabled={busy || !file}>
		{busy ? 'Envoi en cours…' : 'Envoyer'}
	</Button>
</form>

<style>
	h1 {
		font-size: var(--text-2xl);
	}

	.segmented {
		display: flex;
		gap: var(--space-4);
	}

	.segmented label,
	.check {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		cursor: pointer;
	}

	input[type='radio'],
	input[type='checkbox'] {
		width: 18px;
		height: 18px;
		accent-color: var(--color-accent);
	}

	.progress {
		height: 10px;
		border-radius: var(--radius-pill);
		background: var(--color-surface-2);
		overflow: hidden;
	}

	.bar {
		height: 100%;
		background: var(--color-accent);
		transition: width var(--duration) var(--ease);
	}

	.progress-label {
		margin-top: calc(-1 * var(--space-3));
		color: var(--color-text-muted);
	}
</style>
