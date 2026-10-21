<script lang="ts">
	import { ClientResponseError } from 'pocketbase';
	import Button from '#lib/components/ui/Button.svelte';
	import { pb } from './pb.ts';
	import './forms.css';

	let email = $state('');
	let password = $state('');
	let code = $state('');
	let otpId = $state('');
	let mfaId = $state('');
	let busy = $state(false);
	let message = $state('');

	const superusers = () => pb.collection('_superusers');

	async function login(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		message = '';
		try {
			if (mfaId) {
				await superusers().authWithOTP(otpId, code, { mfaId });
			} else {
				await superusers().authWithPassword(email, password);
			}
		} catch (e) {
			const mfa = e instanceof ClientResponseError ? e.response?.mfaId : undefined;
			if (mfa && !mfaId) {
				// Two-step login: PocketBase emailed a code
				mfaId = mfa;
				otpId = (await superusers().requestOTP(email)).otpId;
				message = 'Un code vous a été envoyé par email.';
			} else {
				message = mfaId ? 'Code incorrect ou expiré.' : 'Email ou mot de passe incorrect.';
			}
		} finally {
			busy = false;
		}
	}
</script>

<form class="form" onsubmit={login}>
	<h1>Connexion</h1>

	{#if !mfaId}
		<label class="field">
			<span>Email</span>
			<input class="input" type="email" autocomplete="username" required bind:value={email} />
		</label>
		<label class="field">
			<span>Mot de passe</span>
			<input
				class="input"
				type="password"
				autocomplete="current-password"
				required
				bind:value={password}
			/>
		</label>
	{:else}
		<label class="field">
			<span>Code reçu par email</span>
			<input
				class="input"
				inputmode="numeric"
				autocomplete="one-time-code"
				required
				bind:value={code}
			/>
		</label>
	{/if}

	{#if message}
		<p class="alert" class:error={!message.startsWith('Un code')} role="status">{message}</p>
	{/if}

	<Button type="submit" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</Button>
</form>
