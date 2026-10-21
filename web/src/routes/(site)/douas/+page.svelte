<script lang="ts">
	import HandHeart from '@lucide/svelte/icons/hand-heart';
	import ComingSoon from '#lib/components/ComingSoon.svelte';
	import { m } from '#lib/paraglide/messages.js';
</script>

<ComingSoon title={m.nav_duas()} text={m.duas_intro()} icon={HandHeart} />
