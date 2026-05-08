<section class="faq" id="faq">
	<div class="wrap">
		<div class="center">
			<span class="eyebrow matcha">FAQ</span>
			<h2 style="margin-top:10px">Questions, answered.</h2>
		</div>

		<div class="faq-list">
			<details class="faq-item">
				<summary>
					How does the pricing actually work?
					<span class="chev">+</span>
				</summary>
				<div class="answer">
					<p>We show you the exact cost of every message — to the cent. PAYG users pay a 28-30% markup on token costs (which covers our infrastructure). Subscribers get credits at a discount with bonus credits for commitment. BYOK users pay $0 to us — just use your own API keys.</p>
				</div>
			</details>

			<details class="faq-item">
				<summary>
					Do I need an account to use the app?
					<span class="chev">+</span>
				</summary>
				<div class="answer">
					<p>Nope. Free Local tier works without any account — just paste your API keys and start chatting. Try Free requires a one-tap sign-up (Apple/Google) so we can rate-limit our shared API key. Paid tiers (PAYG, Subscription, Cloud BYOK) all require an account for billing and sync.</p>
				</div>
			</details>

			<details class="faq-item">
				<summary>
					What models are available?
					<span class="chev">+</span>
				</summary>
				<div class="answer">
					<p>300+ models via OpenRouter: Claude (Opus, Sonnet, Haiku), GPT-5/4.1, Gemini, DeepSeek, Kimi, MiniMax, MiMo, and many more. Free models (~50) cost $0. Premium models range from $0.14/M to $15/M tokens. You can switch models mid-conversation.</p>
				</div>
			</details>

			<details class="faq-item">
				<summary>
					Is my data private?
					<span class="chev">+</span>
				</summary>
				<div class="answer">
					<p>Yes. Chats stay on your device by default. Cloud sync is opt-in per conversation and encrypted client-side (AES-256) before upload. We can't read your conversations. We never log message content — only metadata (model, tokens, cost, timestamp) for billing and analytics.</p>
				</div>
			</details>

			<details class="faq-item">
				<summary>
					Can I use my own API keys?
					<span class="chev">+</span>
				</summary>
				<div class="answer">
					<p>Absolutely. BYOK is free on all tiers except PAYG (where we need to control the keys for billing). Bring your OpenRouter, Anthropic, OpenAI, or Google keys. We never store them server-side — they live encrypted in your device's keychain.</p>
				</div>
			</details>

			<details class="faq-item">
				<summary>
					What happens if I cancel my subscription?
					<span class="chev">+</span>
				</summary>
				<div class="answer">
					<p>Your subscription stops, monthly credit grants stop, and any rolled-over subscription credits expire. But your top-up credits (purchased separately) never expire and remain spendable. Your chat history stays on your device. Cloud-synced chats are preserved for 30 days then purged.</p>
				</div>
			</details>
		</div>
	</div>
</section>

<style>
	.faq {
		background: var(--bg-cream);
	}
	.faq-list {
		margin-top: 40px;
		max-width: 760px;
		margin-left: auto;
		margin-right: auto;
	}
	.faq-item {
		border-bottom: 1px solid var(--rule);
	}
	.faq-item:first-child {
		border-top: 1px solid var(--rule);
	}
	.faq-item summary {
		padding: 22px 0;
		cursor: pointer;
		list-style: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		font-weight: 600;
		font-size: 15.5px;
		color: var(--fg);
	}
	.faq-item summary::-webkit-details-marker {
		display: none;
	}
	.faq-item summary .chev {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
		transition: transform 0.2s ease;
		color: var(--fg-soft);
		font-size: 18px;
		line-height: 1;
	}
	.faq-item[open] summary .chev {
		transform: rotate(45deg);
		color: var(--matcha-700);
	}
	.faq-item .answer {
		padding-bottom: 22px;
		font-size: 14.5px;
		color: var(--fg-muted);
		line-height: 1.6;
		max-width: 640px;
	}
	.faq-item .answer p + p {
		margin-top: 10px;
	}
</style>
