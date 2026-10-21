<script lang="ts">
	import Tv from '@lucide/svelte/icons/tv';
	import ComingSoon from '#lib/components/ComingSoon.svelte';
	import { m } from '#lib/paraglide/messages.js';
</script>

<ComingSoon title={m.nav_tv()} text={m.tv_intro()} icon={Tv} />
