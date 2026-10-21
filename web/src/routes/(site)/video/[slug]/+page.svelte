<script lang="ts">
	import ItemView from '#lib/components/media/ItemView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<ItemView item={data.item} related={data.related} />
