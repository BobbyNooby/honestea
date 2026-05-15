<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<title>Admin — HonesTea AI</title>
</svelte:head>

<div class="admin-shell">
	{@render children()}
</div>

<style>
	.admin-shell {
		min-height: 100vh;
		display: grid;
		place-items: center;
		background: var(--zinc-950);
		color: var(--zinc-100);
		padding: 24px;
	}
</style>
