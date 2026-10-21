<script lang="ts">
	import CategoryView from '#lib/components/media/CategoryView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<CategoryView category={data.category} items={data.items} />
