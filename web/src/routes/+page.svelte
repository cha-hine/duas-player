<script lang="ts">
	import logo from '#lib/assets/favicon.svg';
</script>

<svelte:head>
	<title>Sakina — سكينة</title>
	<meta name="description" content="Coran, invocations et web TV islamique." />
</svelte:head>

<main>
	<img src={logo} alt="" width="112" height="112" />
	<h1>Sakina <span lang="ar" dir="rtl">سكينة</span></h1>
	<p>Écouter · Comprendre · S'apaiser</p>
	<p class="soon">Bientôt disponible</p>
</main>

<style>
	:global(body) {
		margin: 0;
		background: #0b1a2e;
		color: #f4efe3;
		font-family: system-ui, sans-serif;
	}

	main {
		min-height: 100dvh;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 0.5rem;
		padding: 0 16px;
		text-align: center;
	}

	h1 {
		margin: 1rem 0 0;
		font-size: clamp(2rem, 6vw, 3rem);
		font-weight: 600;
	}

	h1 span {
		color: #c9a24b;
		margin-inline-start: 0.4em;
	}

	p {
		margin: 0;
		color: #8a9bb0;
	}

	.soon {
		margin-top: 1.5rem;
		color: #1f7a6b;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-size: 0.8rem;
	}
</style>
