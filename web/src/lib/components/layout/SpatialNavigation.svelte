<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { focusMain, handleKey } from '#lib/spatial-navigation.ts';

	// After each page change, put the focus on the page content so the remote works right away
	afterNavigate(() => requestAnimationFrame(focusMain));
</script>

<svelte:window onkeydown={handleKey} />
