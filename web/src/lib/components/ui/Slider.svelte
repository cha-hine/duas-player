<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Props = {
		label: string;
		value?: number;
		min?: number;
		max?: number;
		step?: number;
	} & Omit<HTMLInputAttributes, 'type' | 'value'>;

	let { label, value = $bindable(0), min = 0, max = 100, step = 1, ...rest }: Props = $props();
</script>

<!-- Native range input: keyboard and screen-reader support, and follows right-to-left in Arabic. -->
<input class="slider" type="range" aria-label={label} bind:value {min} {max} {step} {...rest} />

<style>
	.slider {
		width: 100%;
		height: 24px;
		margin: 0;
		accent-color: var(--color-accent);
		cursor: pointer;
	}
</style>
