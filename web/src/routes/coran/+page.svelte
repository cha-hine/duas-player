<script lang="ts">
	import BookOpen from '@lucide/svelte/icons/book-open';
	import ComingSoon from '#lib/components/ComingSoon.svelte';
	import { m } from '#lib/paraglide/messages.js';
</script>

<ComingSoon title={m.nav_quran()} text={m.quran_intro()} icon={BookOpen} />
