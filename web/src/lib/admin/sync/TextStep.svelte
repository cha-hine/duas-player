<script lang="ts">
	import { TEXT_LANGUAGE_CODES, TEXT_LANGUAGES, type TextLanguage } from '#lib/text-languages.ts';
	import type { Draft } from './draft.svelte.ts';

	let { draft }: { draft: Draft } = $props();

	function toggle(code: TextLanguage) {
		const on = draft.languages.includes(code);
		if (on && draft.languages.length === 1) return;
		const next = on ? draft.languages.filter((c) => c !== code) : [...draft.languages, code];
		draft.setLanguages(TEXT_LANGUAGE_CODES.filter((c) => next.includes(c)));
	}
</script>

<section class="step">
	<p class="help">
		Collez le texte de chaque langue, <strong>une ligne par phrase ou par verset</strong> : la ligne 1
		de chaque langue s'affichera ensemble, puis la ligne 2, etc. Les lignes vides sont ignorées.
	</p>

	<fieldset class="languages">
		<legend>Langues</legend>
		{#each TEXT_LANGUAGE_CODES as code (code)}
			<label class="chip">
				<input
					type="checkbox"
					checked={draft.languages.includes(code)}
					onchange={() => toggle(code)}
				/>
				{TEXT_LANGUAGES[code].fr} ·
				<span lang={TEXT_LANGUAGES[code].lang}>{TEXT_LANGUAGES[code].native}</span>
			</label>
		{/each}
	</fieldset>

	<div class="columns">
		{#each draft.languages as code (code)}
			{@const lang = TEXT_LANGUAGES[code]}
			<label class="column">
				<span class="head">
					{lang.fr}
					<small class:warn={draft.mismatched.includes(code)}
						>{draft.rows[code]?.length ?? 0} lignes</small
					>
				</span>
				<textarea
					lang={TEXT_LANGUAGES[code].lang}
					dir={lang.dir}
					style:font-family={code === 'ar' ? 'var(--font-arabic)' : lang.font}
					rows="16"
					wrap="off"
					value={draft.texts[code] ?? ''}
					oninput={(e) => draft.setText(code, e.currentTarget.value)}></textarea>
			</label>
		{/each}
	</div>

	{#if draft.mismatched.length && draft.count}
		<p class="alert">
			Les langues n'ont pas le même nombre de lignes ({draft.languages
				.map((c) => `${TEXT_LANGUAGES[c].fr} : ${draft.rows[c]?.length ?? 0}`)
				.join(', ')}). Vérifiez l'alignement ci-dessous : les lignes manquantes resteront vides.
		</p>
	{/if}

	{#if draft.count}
		<div class="preview">
			<h3>Aperçu ({draft.count} lignes)</h3>
			<ol>
				{#each draft.lines as line, i (i)}
					<li>
						{#each draft.languages as code (code)}
							<span
								lang={TEXT_LANGUAGES[code].lang}
								dir={TEXT_LANGUAGES[code].dir}
								class:missing={!line[code]}>{line[code] ?? '—'}</span
							>
						{/each}
					</li>
				{/each}
			</ol>
		</div>
	{/if}
</section>

<style>
	.step {
		display: grid;
		gap: var(--space-5);
	}

	.help {
		color: var(--color-text-muted);
		max-width: 60rem;
	}

	.languages {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		border: none;
	}

	legend {
		margin-bottom: var(--space-2);
		font-weight: 600;
		font-size: var(--text-sm);
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		font-size: var(--text-sm);
		cursor: pointer;
	}

	.chip input {
		accent-color: var(--color-accent);
	}

	.columns {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
		gap: var(--space-4);
	}

	.column {
		display: grid;
		gap: var(--space-2);
	}

	.head {
		display: flex;
		justify-content: space-between;
		font-weight: 600;
	}

	small {
		color: var(--color-text-muted);
		font-weight: 400;
	}

	small.warn {
		color: #e5806b;
	}

	textarea {
		width: 100%;
		padding: var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: var(--text-lg);
		line-height: 1.8;
		resize: vertical;
	}

	.alert {
		padding: var(--space-3) var(--space-4);
		border: 1px solid #e5806b;
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
	}

	.preview h3 {
		font-family: var(--font-ui);
		font-size: var(--text-base);
		margin-bottom: var(--space-2);
	}

	ol {
		display: grid;
		gap: var(--space-2);
		max-height: 24rem;
		overflow-y: auto;
		margin: 0;
		padding-inline-start: var(--space-6);
	}

	li {
		display: grid;
		gap: 2px;
		padding: var(--space-2);
		border-bottom: 1px solid var(--color-border);
	}

	li span {
		text-align: start;
	}

	.missing {
		color: #e5806b;
	}
</style>
