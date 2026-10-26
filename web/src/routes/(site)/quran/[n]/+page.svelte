<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Pause from '@lucide/svelte/icons/pause';
	import Play from '@lucide/svelte/icons/play';
	import Seo from '#lib/components/Seo.svelte';
	import TextSettings from '#lib/components/TextSettings.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import { link } from '#lib/i18n.ts';
	import { name, title, type Line, type MediaItem } from '#lib/media.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { player } from '#lib/player/player.svelte.ts';
	import { settings } from '#lib/player/settings.svelte.ts';
	import { lineAt } from '#lib/player/sync.ts';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { arabicNumber, recitationSlug, verseMark } from '#lib/quran.ts';
	import { translations, TRANSLATED } from '#lib/translations.svelte.ts';
	import { isSynced, lineLanguages, TEXT_LANGUAGES } from '#lib/text-languages.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const surah = $derived(data.surah);
	// svelte-ignore state_referenced_locally
	let recitationId = $state(data.surah.recitations[0]?.id ?? '');
	let follow = $state(true);

	const recitation = $derived(surah.recitations.find((r) => r.id === recitationId) ?? null);
	// The translation the listener chose, for this surah
	$effect(() => {
		void translations.load(surah.number);
	});
	/** Languages of this surah with translations to choose from, listed under the recitation. */
	const translatable = $derived(lineLanguages(surah.lines).filter((c) => TRANSLATED.includes(c)));
	$effect(() => {
		for (const code of translatable) void translations.list(code);
	});

	/** Timings of the chosen recitation, loaded on demand (the list comes without them). */
	let timings = $state<Line[]>([]);
	const synced = $derived(isSynced(timings));

	/** The same reciter and style as last time, e.g. "-husary-mujawwad" in its slug. */
	const variant = (slug: string) => slug.replace(/^sourate-\d+/, '');
	const REMEMBER = 'sakina-quran-recitation';

	// On arrival and on each surah change (the page is reused from one surah to the next)
	$effect(() => {
		const list = surah.recitations;
		let saved: string | null = null;
		try {
			saved = localStorage.getItem(REMEMBER);
		} catch {
			// private browsing: the first recitation is selected
		}
		recitationId = (list.find((r) => variant(r.slug) === saved) ?? list[0])?.id ?? '';
	});

	function choose(id: string) {
		recitationId = id;
		const chosen = surah.recitations.find((r) => r.id === id);
		try {
			if (chosen) localStorage.setItem(REMEMBER, variant(chosen.slug));
		} catch {
			// not remembered
		}
	}

	$effect(() => {
		const id = recitationId;
		timings = [];
		if (!id) return;
		const controller = new AbortController();
		fetch(`/api/tracks/${id}/sync`, { signal: controller.signal })
			.then((res) => (res.ok ? res.json() : null))
			.then((sync: { lines: Line[] } | null) => {
				if (sync) timings = sync.lines;
			})
			.catch(() => {});
		return () => controller.abort();
	});

	/**
	 * "Mahmoud Khalil Al-Husary · mujawwad": the reciter, and the style the track's title adds
	 * after the surah's (whose own name may hold brackets: "Le pur culte (unicité de dieu)").
	 */
	function recitationLabel(r: MediaItem) {
		const base = title(surah);
		const full = title(r);
		const style = full.startsWith(base)
			? full
					.slice(base.length)
					.trim()
					.replace(/^\((.*)\)$/, '$1')
			: '';
		const who = r.reciter ? name(r.reciter) : title(r);
		return style && r.reciter ? `${who} · ${style}` : who;
	}
	const available = $derived(lineLanguages(surah.lines));
	const languages = $derived(settings.visible(available));
	const verses = $derived(surah.lines.filter((l) => l.n));
	const basmala = $derived(surah.lines.find((l) => !l.n) ?? null);
	const playing = $derived(!!recitation && player.isCurrent(recitation));

	/**
	 * The recitation this page was playing; when the player goes on to the next surah by the
	 * same reciter, the page follows it (if the listener follows the reading).
	 */
	let followed = '';
	$effect(() => {
		const slug = player.current?.slug ?? '';
		if (surah.recitations.some((r) => r.slug === slug)) {
			followed = slug;
			return;
		}
		// The full-screen player stays open: the page catches up once it is closed
		if (page.state.immersive) return;
		const now = recitationSlug(slug);
		const before = recitationSlug(followed);
		if (follow && now && before && now.variant === before.variant && now.number !== surah.number) {
			followed = slug;
			// link() resolves the path itself, in the interface language
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			void goto(link(`/quran/${now.number}`));
		}
	});
	const isArabic = getLocale() === 'ar';

	/** The verse being recited, when this surah's recitation is the one playing. */
	const currentVerse = $derived.by(() => {
		if (!playing) return 0;
		const i = lineAt(player.lines, player.currentTime + 0.15);
		return i >= 0 ? (player.lines[i].n ?? 0) : 0;
	});

	$effect(() => {
		if (!follow || !currentVerse) return;
		document
			.getElementById(`v${currentVerse}`)
			?.scrollIntoView({ block: 'center', behavior: 'smooth' });
	});

	/** Where verse n is in the selected recitation. */
	function timing(n: number) {
		if (!recitation || !synced) return null;
		const line = timings.find((l) => l.n === n);
		return line ? { start: line.start, end: line.end } : null;
	}

	function playSurah() {
		if (!recitation) return;
		if (playing) player.toggle();
		else player.playItems([recitation], recitation);
	}

	function playFrom(n: number) {
		const t = timing(n);
		if (t && recitation) player.playFrom([recitation], recitation, t.start);
	}

	const number = (n: number) => (isArabic ? arabicNumber(n) : String(n));
	const frenchName = (title: string) => title.replace(/^Sourate \d+ — /, '');
</script>

<Seo
	title={`${m.surah_label({ n: surah.number })} · ${frenchName(surah.title_fr)}`}
	description={`${surah.title_ar} — ${m.verses_count({ count: verses.length })}`}
/>

<div class="container page">
	<header>
		<p class="label">
			{m.surah_label({ n: number(surah.number) })} · {m.verses_count({ count: verses.length })}
		</p>
		<h1 lang="ar" dir="rtl">{surah.title_ar}</h1>
		<p class="fr">{frenchName(surah.title_fr)}</p>
		<nav class="neighbours">
			{#if data.previous}
				<a href={link(`/quran/${data.previous.number}`)}>
					{#if isArabic}<ArrowRight aria-hidden="true" />{:else}<ArrowLeft
							aria-hidden="true"
						/>{/if}
					{m.previous_surah()}
				</a>
			{/if}
			{#if data.next}
				<a href={link(`/quran/${data.next.number}`)}>
					{m.next_surah()}
					{#if isArabic}<ArrowLeft aria-hidden="true" />{:else}<ArrowRight
							aria-hidden="true"
						/>{/if}
				</a>
			{/if}
		</nav>
	</header>

	{#snippet translationChoice()}
		{#each translatable as code (code)}
			{#if !translations.lists[code]}
				<!-- Same size as the menu it stands for, so nothing moves when it arrives -->
				<div class="pending">
					<span>{m.translation_label()}</span>
					<span class="placeholder"><Spinner label={m.loading()} /></span>
				</div>
			{:else if translations.lists[code].length}
				<label>
					<span class="with-spinner">
						{m.translation_label()}
						{#if !translations.loaded(surah.number)}<Spinner label={m.loading()} size={14} />{/if}
					</span>
					<select
						value={settings.translators[code] ?? ''}
						aria-label={m.text_translation({ language: TEXT_LANGUAGES[code].native })}
						onchange={(e) => settings.setTranslator(code, e.currentTarget.value)}
					>
						<option value="">{m.text_translation_default()}</option>
						{#each translations.lists[code] ?? [] as translator (translator.id)}
							<option value={translator.id}>{translator.name}</option>
						{/each}
					</select>
				</label>
			{/if}
		{/each}
	{/snippet}

	<section class="toolbar">
		{#if surah.recitations.length}
			<div class="choices">
				<label>
					<span>{m.recitation_label()}</span>
					<select value={recitationId} onchange={(e) => choose(e.currentTarget.value)}>
						{#each surah.recitations as r (r.id)}
							<option value={r.id}>{recitationLabel(r)}</option>
						{/each}
					</select>
				</label>
				{@render translationChoice()}
			</div>
			<Button onclick={playSurah}>
				{#snippet icon()}{#if playing && !player.paused}<Pause />{:else}<Play />{/if}{/snippet}
				{playing && !player.paused ? m.player_pause() : m.play_surah()}
			</Button>
		{:else}
			<p class="note">{m.no_recitation()}</p>
			<div class="choices">{@render translationChoice()}</div>
		{/if}
		{#if synced}
			<label class="follow">
				<input type="checkbox" bind:checked={follow} />
				{m.follow_reading()}
			</label>
		{/if}
		<div class="display">
			{#each available as code (code)}
				<button
					type="button"
					class="pill"
					lang={TEXT_LANGUAGES[code].lang}
					aria-pressed={!settings.hidden.includes(code)}
					title={TEXT_LANGUAGES[code].native}
					onclick={() => settings.toggleLanguage(code, available)}
					>{TEXT_LANGUAGES[code].short}</button
				>
			{/each}
			<TextSettings languages={available} />
		</div>
	</section>

	<div class="text">
		{#if basmala && languages.includes('ar')}
			<p
				class="basmala"
				lang="ar"
				dir="rtl"
				style:font-family={settings.font('ar').family}
				style:--scale={settings.scale('ar')}
			>
				{basmala.ar}
			</p>
		{/if}
		{#each verses as verse (verse.n)}
			{@const n = verse.n!}
			<article id="v{n}" class="verse" class:current={n === currentVerse}>
				{#each languages as code (code)}
					{#if verse[code]}
						{#if code === 'ar'}
							<p
								class="ar"
								lang="ar"
								dir="rtl"
								style:font-family={settings.font('ar').family}
								style:--scale={settings.scale('ar')}
							>
								{verse.ar}
								<span class="mark">{verseMark(n)}</span>
							</p>
						{:else}
							<p
								class="translation"
								lang={TEXT_LANGUAGES[code].lang}
								dir={TEXT_LANGUAGES[code].dir}
								style:font-family={settings.font(code).family}
								style:--scale={settings.scale(code)}
							>
								<span class="n">{n}.</span>
								{translations.text(verse, code, surah.number)}
							</p>
						{/if}
					{/if}
				{/each}
				{#if synced}
					<div class="actions">
						<IconButton label={m.play_from_verse({ n })} onclick={() => playFrom(n)}
							><Play /></IconButton
						>
					</div>
				{/if}
			</article>
		{/each}
	</div>

	{#if surah.source.label}
		<p class="credit">
			{m.text_source()}
			{#if surah.source.url}
				<a href={surah.source.url} target="_blank" rel="noopener">{surah.source.label}</a>
			{:else}
				{surah.source.label}
			{/if}
		</p>
	{/if}
</div>

<style>
	.page {
		display: grid;
		/* As wide as the screen: a long recitation name must not widen the page */
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
		padding-block: var(--space-6);
	}

	header {
		display: grid;
		justify-items: center;
		gap: var(--space-2);
		text-align: center;
	}

	.label {
		color: var(--color-accent-text);
		font-weight: 600;
		font-size: var(--text-sm);
	}

	h1 {
		font-family: var(--font-quran);
		font-size: clamp(2.2rem, 6vw, 3.4rem);
		font-weight: 400;
		line-height: 1.6;
	}

	.fr {
		color: var(--color-text-muted);
		font-size: var(--text-lg);
	}

	.neighbours {
		display: flex;
		gap: var(--space-5);
		margin-top: var(--space-2);
	}

	.neighbours a {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		text-decoration: none;
	}

	.neighbours a:hover {
		color: var(--color-accent-text);
	}

	.neighbours :global(svg) {
		width: 16px;
		height: 16px;
	}

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}

	.toolbar :global(svg) {
		width: 18px;
		height: 18px;
	}

	label {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-sm);
	}

	select {
		min-height: 38px;
		padding: 0 var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-bg);
	}

	/* Recitation, and the translation right under it; the menus shrink to the screen, some
	   names are long */
	.choices {
		display: grid;
		flex: 1 1 18rem;
		gap: var(--space-2);
		min-width: 0;
	}

	.choices label,
	.pending {
		display: grid;
		grid-template-columns: 6.5rem minmax(0, 1fr);
		align-items: center;
		font-size: var(--text-sm);
	}

	.placeholder {
		display: grid;
		place-items: center;
		min-height: 38px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
	}

	.with-spinner {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
	}

	.choices select {
		min-width: 0;
		max-width: 100%;
		text-overflow: ellipsis;
	}

	.note {
		color: var(--color-text-muted);
	}

	.display {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1);
		margin-inline-start: auto;
	}

	.pill {
		min-width: 40px;
		height: 34px;
		padding: 0 var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		background: none;
		font-weight: 600;
		cursor: pointer;
	}

	.pill[aria-pressed='false'] {
		opacity: 0.45;
	}

	.follow {
		margin-inline-start: auto;
	}

	.text {
		--scale: 1;
		display: grid;
		gap: var(--space-2);
		max-width: 64rem;
		width: 100%;
		margin-inline: auto;
	}

	.basmala {
		font-size: calc(2rem * var(--scale));
		text-align: center;
		color: var(--color-accent-text);
		padding-block: var(--space-4);
	}

	.verse {
		display: grid;
		gap: var(--space-2);
		padding: var(--space-4);
		border-radius: var(--radius-md);
		border-bottom: 1px solid var(--color-border);
		transition: background-color 400ms var(--ease);
		scroll-margin-top: calc(var(--header-height) + var(--space-6));
	}

	.verse.current {
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
	}

	.ar {
		font-size: calc(clamp(1.6rem, 3.2vw, 2.1rem) * var(--scale));
		line-height: 2.2;
		text-align: right;
	}

	.mark {
		color: var(--color-accent-text);
		white-space: nowrap;
	}

	.translation {
		color: var(--color-text-muted);
		font-size: calc(1.05rem * var(--scale));
		text-align: start;
	}

	.n {
		color: var(--color-accent-text);
		font-weight: 600;
		font-family: var(--font-latin);
	}

	.actions {
		display: flex;
		gap: var(--space-1);
	}

	.actions :global(svg) {
		width: 18px;
		height: 18px;
	}

	.credit {
		color: var(--color-text-muted);
		font-size: var(--text-xs);
		text-align: center;
	}

	.credit a {
		color: inherit;
	}
</style>
