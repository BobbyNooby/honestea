<script lang="ts">
	import { authClient } from '$lib/auth-client';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let errorMsg = $state('');

	const session = authClient.useSession();

	async function signInEmail(e: Event) {
		e.preventDefault();
		loading = true;
		errorMsg = '';
		const { error } = await authClient.signIn.email({ email, password });
		if (error) errorMsg = error.message ?? 'Sign in failed';
		loading = false;
	}

	async function signInSocial(provider: string) {
		await authClient.signIn.social({ provider });
	}

	async function signOut() {
		await authClient.signOut();
	}
</script>

<svelte:head>
	<title>Admin — HonesTea AI</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if $session.data}
	<div class="panel">
		<h1>Admin Dashboard</h1>
		<p class="sub">Signed in as <strong>{$session.data.user.email}</strong></p>
		<button class="btn btn-primary" onclick={signOut}>Sign out</button>
	</div>
{:else}
	<div class="panel">
		<h1>Admin Sign In</h1>
		<p class="sub">This page is not linked anywhere. If you know it, you know it.</p>

		<form onsubmit={signInEmail} class="form">
			<label>
				<span>Email</span>
				<input type="email" bind:value={email} required placeholder="you@example.com" />
			</label>
			<label>
				<span>Password</span>
				<input type="password" bind:value={password} required placeholder="••••••••" />
			</label>
			{#if errorMsg}
				<p class="error">{errorMsg}</p>
			{/if}
			<button type="submit" class="btn btn-primary" disabled={loading}>
				{loading ? 'Signing in…' : 'Sign in'}
			</button>
		</form>

		<div class="divider"><span>or</span></div>

		<div class="socials">
			<button class="btn btn-ghost" onclick={() => signInSocial('github')}>Sign in with GitHub</button>
			<button class="btn btn-ghost" onclick={() => signInSocial('google')}>Sign in with Google</button>
			<button class="btn btn-ghost" onclick={() => signInSocial('facebook')}>Sign in with Facebook</button>
			<button class="btn btn-ghost" onclick={() => signInSocial('twitter')}>Sign in with Twitter</button>
			<button class="btn btn-ghost" onclick={() => signInSocial('instagram')}>Sign in with Instagram</button>
		</div>
	</div>
{/if}

<style>
	.panel {
		width: 100%;
		max-width: 400px;
		background: var(--zinc-900);
		border: 1px solid var(--zinc-800);
		border-radius: 16px;
		padding: 32px;
		box-shadow: 0 20px 60px rgba(0,0,0,0.35);
	}
	h1 {
		font-size: 22px;
		font-weight: 700;
		margin-bottom: 6px;
		color: white;
	}
	.sub {
		font-size: 13.5px;
		color: var(--zinc-400);
		margin-bottom: 24px;
	}
	.form {
		display: grid;
		gap: 14px;
	}
	label {
		display: grid;
		gap: 6px;
		font-size: 13px;
		font-weight: 600;
		color: var(--zinc-300);
	}
	input {
		appearance: none;
		background: var(--zinc-950);
		border: 1px solid var(--zinc-800);
		border-radius: 10px;
		padding: 10px 12px;
		color: white;
		font-size: 14px;
		outline: none;
	}
	input:focus {
		border-color: var(--matcha-600);
		box-shadow: 0 0 0 3px rgba(87, 146, 80, 0.15);
	}
	.error {
		color: #ef4444;
		font-size: 13px;
	}
	.divider {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 20px 0;
		color: var(--zinc-500);
		font-size: 12px;
	}
	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--zinc-800);
	}
	.socials {
		display: grid;
		gap: 10px;
	}
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 10px 16px;
		border-radius: 10px;
		border: 1px solid transparent;
		font-size: 14px;
		font-weight: 600;
		transition: transform 0.06s ease, background 0.15s ease, border-color 0.15s ease;
		cursor: pointer;
	}
	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.btn-primary {
		background: var(--matcha-600);
		color: white;
	}
	.btn-primary:hover {
		background: var(--matcha-700);
	}
	.btn-ghost {
		background: transparent;
		color: var(--zinc-200);
		border-color: var(--zinc-800);
	}
	.btn-ghost:hover {
		background: var(--zinc-800);
	}
</style>
