<script lang="ts">
	import type { RecordModel } from 'pocketbase';
	import Button from '#lib/components/ui/Button.svelte';
	import { pb } from '../pb.ts';
	import type { Draft } from './draft.svelte.ts';

	// Asks the home agent (agent/) for suggested timings, then applies them to the draft.
	type Result = { starts: number[]; confidence: number[]; lines: number };
	type Props = {
		record: RecordModel;
		draft: Draft;
		textId: string;
		onapplied: () => void;
	};
	let { record = $bindable(), draft, textId, onapplied }: Props = $props();

	const POLL_MS = 5000;
	let message = $state('');

	const status = $derived((record.align_status as string) || '');
	const result = $derived((record.align_result as Result | null) ?? null);
	const average = $derived(
		result?.confidence.length
			? Math.round((result.confidence.reduce((s, c) => s + c, 0) / result.confidence.length) * 100)
			: 0
	);
	const stale = $derived(!!result && result.lines !== draft.count);

	// Follow the request while the agent works on it
	$effect(() => {
		if (status !== 'pending' && status !== 'processing') return;
		const timer = setInterval(async () => {
			const fresh = await pb
				.collection('tracks')
				.getOne(record.id, { fields: 'align_status,align_result,align_error' });
			record = { ...record, ...fresh };
		}, POLL_MS);
		return () => clearInterval(timer);
	});

	async function request() {
		if (!draft.languages.includes('ar') || draft.count === 0) {
			message = "Saisissez d'abord le texte arabe (étape Texte).";
			return;
		}
		message = '';
		// The agent works from the saved text
		record = await pb.collection('tracks').update(
			record.id,
			{
				lines: draft.toSave(),
				text: textId,
				align_status: 'pending',
				align_error: '',
				align_result: null
			},
			{ expand: 'category,reciter,text' }
		);
	}

	function apply() {
		if (!result || stale) return;
		draft.starts = result.starts.slice(0, draft.count);
		onapplied();
	}
</script>

<section class="auto">
	<div>
		<strong>Synchronisation automatique</strong>
		<p>
			La reconnaissance vocale de l'agent (sur le PC de la maison) place chaque ligne arabe sur la
			récitation. Vous vérifiez ensuite à l'étape « Ajuster ».
		</p>
		{#if status === 'pending'}
			<p class="state">En attente de l'agent… (il doit être lancé sur le PC)</p>
		{:else if status === 'processing'}
			<p class="state">Reconnaissance en cours… cela peut prendre la durée de l'audio.</p>
		{:else if status === 'error'}
			<p class="state error">Échec : {record.align_error}</p>
		{:else if status === 'ready' && result}
			<p class="state ok">
				Suggestion prête : {result.lines} lignes, {average} % des mots retrouvés.
				{#if stale}Le texte a changé depuis la demande : relancez-la.{/if}
			</p>
		{/if}
		{#if message}<p class="state error">{message}</p>{/if}
	</div>
	<div class="actions">
		{#if status === 'ready' && result && !stale}
			<Button onclick={apply}>Appliquer et vérifier</Button>
		{/if}
		<Button
			variant="secondary"
			onclick={request}
			disabled={status === 'pending' || status === 'processing'}
		>
			{status === 'ready' || status === 'error' ? 'Relancer' : 'Demander une suggestion'}
		</Button>
	</div>
</section>

<style>
	.auto {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		padding: var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}

	p {
		max-width: 46rem;
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.state {
		margin-top: var(--space-2);
		color: var(--color-text);
		font-weight: 600;
	}

	.state.ok {
		color: var(--color-secondary-text);
	}

	.state.error {
		color: #e5806b;
	}

	.actions {
		display: flex;
		gap: var(--space-2);
	}
</style>
