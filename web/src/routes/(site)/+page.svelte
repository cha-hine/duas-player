<script lang="ts">
	import BookOpen from '@lucide/svelte/icons/book-open';
	import HandHeart from '@lucide/svelte/icons/hand-heart';
	import Tv from '@lucide/svelte/icons/tv';
	import logo from '#lib/assets/favicon.svg';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Tag from '#lib/components/ui/Tag.svelte';
	import { link } from '#lib/i18n.ts';
	import { m } from '#lib/paraglide/messages.js';

	const sections = [
		{ path: '/coran', title: m.nav_quran, text: m.quran_intro, icon: BookOpen },
		{ path: '/invocations', title: m.nav_duas, text: m.duas_intro, icon: HandHeart },
		{ path: '/tv', title: m.nav_tv, text: m.tv_intro, icon: Tv }
	];
</script>

<svelte:head>
	<title>{m.site_name()} · {m.site_tagline()}</title>
</svelte:head>

<section class="hero container">
	<img src={logo} alt="" width="96" height="96" />
	<h1>
		Sakina <span lang="ar" dir="rtl">سكينة</span>
	</h1>
	<p class="tagline">{m.site_tagline()}</p>
	<p class="description">{m.site_description()}</p>
	<div class="cta">
		<Button href={link('/coran')} size="lg">{m.nav_quran()}</Button>
		<Button href={link('/invocations')} size="lg" variant="secondary">{m.nav_duas()}</Button>
	</div>
</section>

<section class="container sections">
	{#each sections as section (section.path)}
		<Card href={link(section.path)}>
			<div class="card-icon"><section.icon aria-hidden="true" /></div>
			<h2>{section.title()}</h2>
			<p>{section.text()}</p>
			<Tag>{m.coming_soon()}</Tag>
		</Card>
	{/each}
</section>

<style>
	.hero {
		display: grid;
		justify-items: center;
		gap: var(--space-4);
		padding-block: var(--space-8) var(--space-7);
		text-align: center;
	}

	.hero img {
		border-radius: 22px;
		box-shadow: var(--shadow-md);
	}

	h1 {
		font-family: var(--font-display-latin);
		font-size: var(--text-3xl);
	}

	h1 span {
		font-family: var(--font-arabic);
		color: var(--color-accent-text);
		margin-inline-start: 0.3em;
	}

	.tagline {
		font-size: var(--text-lg);
		color: var(--color-accent-text);
	}

	.description {
		max-width: 34rem;
		color: var(--color-text-muted);
	}

	.cta {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-3);
		margin-top: var(--space-4);
	}

	.sections {
		display: grid;
		gap: var(--space-4);
	}

	@media (min-width: 768px) {
		.sections {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.card-icon {
		color: var(--color-accent-text);
	}

	.card-icon :global(svg) {
		width: 28px;
		height: 28px;
	}

	h2 {
		font-size: var(--text-xl);
	}

	.sections p {
		color: var(--color-text-muted);
		flex: 1;
	}

	.sections :global(.tag) {
		align-self: flex-start;
	}
</style>
