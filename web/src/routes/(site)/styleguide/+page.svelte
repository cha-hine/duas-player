<script lang="ts">
	import Heart from '@lucide/svelte/icons/heart';
	import Pause from '@lucide/svelte/icons/pause';
	import Play from '@lucide/svelte/icons/play';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import Slider from '#lib/components/ui/Slider.svelte';
	import Tag from '#lib/components/ui/Tag.svelte';

	// Internal reference page for the design system; not linked from the site.
	const colors = [
		['--color-bg', 'Background'],
		['--color-surface', 'Surface'],
		['--color-surface-2', 'Surface 2'],
		['--color-text', 'Text'],
		['--color-text-muted', 'Muted text'],
		['--color-accent', 'Accent (gold)'],
		['--color-accent-text', 'Accent text'],
		['--color-secondary', 'Secondary (emerald)'],
		['--color-secondary-text', 'Secondary text']
	];

	let playing = $state(false);
	let progress = $state(35);
</script>

<svelte:head>
	<title>Styleguide · Sakina</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="container styleguide">
	<h1>Styleguide</h1>

	<section>
		<h2>Colours</h2>
		<div class="swatches">
			{#each colors as [token, name] (token)}
				<div class="swatch">
					<div class="chip" style:background="var({token})"></div>
					<strong>{name}</strong>
					<code>{token}</code>
				</div>
			{/each}
		</div>
	</section>

	<section>
		<h2>Typography</h2>
		<p class="display">Cormorant Garamond — Écouter, comprendre</p>
		<p>Inter — Doua Kumayl et Ziyarat Achoura, avec la traduction française.</p>
		<p class="arabic" lang="ar" dir="rtl">Noto Naskh Arabic — أذكار الصباح والمساء</p>
		<p class="quran" lang="ar">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>
	</section>

	<section>
		<h2>Buttons</h2>
		<div class="row">
			<Button>Primary</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="ghost">Ghost</Button>
			<Button size="lg">Large</Button>
			<Button disabled>Disabled</Button>
			<Button href="/styleguide" variant="secondary">Link</Button>
		</div>
		<div class="row">
			<IconButton label="Favourite"><Heart /></IconButton>
			<IconButton
				label={playing ? 'Pause' : 'Play'}
				variant="filled"
				size="lg"
				onclick={() => (playing = !playing)}
			>
				{#if playing}<Pause />{:else}<Play />{/if}
			</IconButton>
		</div>
	</section>

	<section>
		<h2>Tags</h2>
		<div class="row">
			<Tag>Default</Tag>
			<Tag variant="accent">Accent</Tag>
			<Tag variant="live">Live</Tag>
		</div>
	</section>

	<section>
		<h2>Slider</h2>
		<Slider label="Progress" bind:value={progress} />
		<p class="muted">{progress}%</p>
	</section>

	<section>
		<h2>Cards</h2>
		<div class="cards">
			<Card>
				<h3>Static card</h3>
				<p class="muted">Content inside a surface.</p>
			</Card>
			<Card href="/styleguide">
				<h3>Link card</h3>
				<p class="muted">Hover to see the accent border.</p>
			</Card>
		</div>
	</section>
</div>

<style>
	.styleguide {
		display: grid;
		gap: var(--space-7);
		padding-block: var(--space-7);
	}

	section {
		display: grid;
		gap: var(--space-4);
	}

	h2 {
		font-size: var(--text-xl);
		color: var(--color-accent-text);
	}

	.swatches {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: var(--space-4);
	}

	.swatch {
		display: grid;
		gap: var(--space-1);
		font-size: var(--text-sm);
	}

	.chip {
		height: 64px;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
	}

	code {
		color: var(--color-text-muted);
		font-size: var(--text-xs);
	}

	.display {
		font-family: var(--font-display-latin);
		font-size: var(--text-2xl);
	}

	.arabic {
		font-family: var(--font-arabic);
		font-size: var(--text-lg);
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
	}

	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: var(--space-4);
	}

	.muted {
		color: var(--color-text-muted);
	}
</style>
