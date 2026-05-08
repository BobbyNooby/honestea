<script lang="ts">
	import Icon from './Icon.svelte';
</script>

<section class="waitlist" id="waitlist">
	<div class="wrap">
		<div class="center">
			<h2>Ready to brew something?</h2>
			<p class="lede max-prose" style="margin-top:16px">
				Join the waitlist to get early access. No credit card required — just your email.
			</p>
		</div>

		<div class="wait-card">
			<form class="wait-form" onsubmit={(e) => e.preventDefault()}>
				<input type="email" placeholder="you@example.com" required />
				<button type="submit">Join waitlist</button>
			</form>
			<p class="wait-meta"><b>3,847</b> people already on the list</p>
			<div class="wait-stores">
				<span>Available on:</span>
				<span class="store-pill">
					<Icon name="apple" size={14} stroke={2} /> iOS
				</span>
				<span class="store-pill">
					<Icon name="mobile" size={14} stroke={2} /> Android
				</span>
				<span class="store-pill soon">
					<Icon name="world" size={14} stroke={2} /> Web (soon)
				</span>
			</div>
		</div>
	</div>
</section>

<style>
	.waitlist {
		background: linear-gradient(180deg, var(--chamomile-50) 0%, white 100%);
	}
	.waitlist h2 {
		max-width: 18ch;
		margin-left: auto;
		margin-right: auto;
	}
	.waitlist .sub {
		font-size: 14.5px;
		color: var(--fg-muted);
		margin-top: 16px;
		line-height: 1.6;
	}
	.wait-card {
		max-width: 640px;
		margin: 36px auto 0;
		background: white;
		border: 1px solid var(--rule);
		border-radius: var(--radius-xl);
		padding: 36px 32px;
		text-align: center;
		box-shadow: var(--shadow-md);
	}
	.wait-form {
		margin-top: 24px;
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		justify-content: center;
	}
	.wait-form input {
		flex: 1 1 220px;
		min-width: 220px;
		height: 46px;
		padding: 0 18px;
		border: 1px solid var(--rule);
		border-radius: 999px;
		font-size: 14px;
		color: var(--fg);
		background: white;
	}
	.wait-form input:focus {
		outline: none;
		border-color: var(--matcha-400);
		box-shadow: 0 0 0 3px rgba(91, 138, 58, 0.12);
	}
	.wait-form button {
		height: 46px;
		padding: 0 24px;
		border-radius: 999px;
		background: var(--matcha-600);
		color: white;
		font-weight: 600;
		font-size: 14px;
		border: none;
		cursor: pointer;
	}
	.wait-form button:hover {
		background: var(--matcha-700);
	}
	.wait-meta {
		margin-top: 14px;
		font-size: 12.5px;
		color: var(--fg-soft);
	}
	.wait-meta b {
		color: var(--fg);
	}
	.wait-stores {
		margin-top: 26px;
		padding-top: 22px;
		border-top: 1px dashed var(--rule);
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		justify-content: center;
		font-size: 13px;
		color: var(--fg-soft);
	}
	.wait-stores .store-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border-radius: 999px;
		background: var(--zinc-100);
		color: var(--zinc-600);
		font-size: 12px;
		font-weight: 500;
	}
	.wait-stores .store-pill.soon {
		background: var(--oolong-100);
		color: var(--oolong-700);
	}
</style>
