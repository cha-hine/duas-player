<script lang="ts">
	import BottomNav from '#lib/components/layout/BottomNav.svelte';
	import Footer from '#lib/components/layout/Footer.svelte';
	import Header from '#lib/components/layout/Header.svelte';
	import SpatialNavigation from '#lib/components/layout/SpatialNavigation.svelte';
	import LatestSidebar from '#lib/components/media/LatestSidebar.svelte';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import PlayerHost from '#lib/player/PlayerHost.svelte';
	import { player } from '#lib/player/player.svelte.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<!-- While the immersive player is open, the page behind it can't be reached or read -->
<div class="page" inert={page.state.immersive ?? false}>
	<a class="skip-link" href="#main">{m.skip_to_content()}</a>

	<Header theme={data.theme} />

	<div class="shell">
		<main id="main">
			{@render children()}
		</main>
		{#if data.latest.length}
			<div class="side">
				<LatestSidebar items={data.latest} />
			</div>
		{/if}
	</div>

	<Footer />
	{#if player.current}<div class="player-space"></div>{/if}
	{#if data.device !== 'tv'}<BottomNav />{/if}
</div>

<PlayerHost />
{#if data.device === 'tv'}<SpatialNavigation />{/if}

<style>
	.skip-link {
		position: absolute;
		top: var(--space-2);
		inset-inline-start: var(--space-2);
		z-index: 100;
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-sm);
		background: var(--color-accent);
		color: var(--color-on-accent);
		font-weight: 600;
		transform: translateY(-200%);
	}

	.skip-link:focus {
		transform: none;
	}

	/* Room for the mini player at the bottom, so it never hides the end of the page */
	.player-space {
		height: var(--mini-player-height);
	}

	/* Main content first (left in French, right in Arabic), new additions beside it */
	.shell {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
	}

	main {
		min-width: 0;
	}

	.side {
		padding: var(--space-6) var(--gutter);
		border-top: 1px solid var(--color-border);
	}

	@media (min-width: 1100px) {
		.shell {
			/* In rem, so the column grows with the larger text of TV mode */
			grid-template-columns: minmax(0, 1fr) clamp(20rem, 26vw, 28rem);
		}

		.side {
			position: sticky;
			top: var(--header-height);
			align-self: start;
			max-height: calc(100dvh - var(--header-height));
			overflow-y: auto;
			padding-inline: var(--space-4) var(--gutter);
			border-top: none;
			border-inline-start: 1px solid var(--color-border);
		}

		/* The column's own gutter replaces the page gutter on that side */
		main :global(.container) {
			padding-inline-end: var(--space-6);
		}
	}
</style>
