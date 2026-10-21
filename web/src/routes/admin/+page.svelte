<script lang="ts">
	import Login from '#lib/admin/Login.svelte';
	import UploadForm from '#lib/admin/UploadForm.svelte';
	import { pb } from '#lib/admin/pb.ts';
	import Button from '#lib/components/ui/Button.svelte';

	const isAdmin = () => pb.authStore.isValid && pb.authStore.isSuperuser;

	let loggedIn = $state(isAdmin());
	let email = $state(pb.authStore.record?.email ?? '');

	$effect(() =>
		pb.authStore.onChange(() => {
			loggedIn = isAdmin();
			email = pb.authStore.record?.email ?? '';
		})
	);
</script>

{#if loggedIn}
	<div class="session">
		<small>Connecté : {email}</small>
		<Button variant="ghost" onclick={() => pb.authStore.clear()}>Se déconnecter</Button>
	</div>
	<UploadForm />
{:else}
	<Login />
{/if}

<style>
	.session {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-5);
		color: var(--color-text-muted);
	}
</style>
