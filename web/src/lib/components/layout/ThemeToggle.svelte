<script lang="ts">
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { applyTheme, type Theme } from '#lib/theme.ts';

	let { theme: initial }: { theme: Theme } = $props();

	// svelte-ignore state_referenced_locally
	let theme = $state(initial);

	function toggle() {
		theme = theme === 'dark' ? 'light' : 'dark';
		applyTheme(theme);
	}
</script>

<IconButton label={theme === 'dark' ? m.theme_to_light() : m.theme_to_dark()} onclick={toggle}>
	{#if theme === 'dark'}
		<Sun />
	{:else}
		<Moon />
	{/if}
</IconButton>
