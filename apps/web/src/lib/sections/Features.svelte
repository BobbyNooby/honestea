<script lang="ts">
	import Icon from './Icon.svelte';

	const features = [
		{ icon: 'message-circle' as const, title: 'Multi-model chat', desc: 'Switch between Claude, GPT, Gemini, DeepSeek, and 300+ models in one conversation. Pick the best tool for each task.' },
		{ icon: 'coins' as const, title: 'Real-time cost', desc: 'Every message shows exactly what it cost — to the cent. No surprises, no hidden fees. See your savings add up.' },
		{ icon: 'key' as const, title: 'Bring your own key', desc: 'Use your own API keys for free. We never mark up BYOK messages. Your keys, your rates, our app.' },
		{ icon: 'camera' as const, title: 'Snap & ask', desc: 'Point your camera at anything and ask. Works with every vision model on OpenRouter. No special mode needed.' },
		{ icon: 'microphone' as const, title: 'Voice I/O', desc: 'Talk to AI naturally. Device-native speech recognition and text-to-speech. Audio never leaves your phone.' },
		{ icon: 'route' as const, title: 'Smart routing', desc: 'Automatically pick the cheapest capable model for each task. Vision goes to Gemini Flash, reasoning to Claude.' },
		{ icon: 'search' as const, title: 'Web search', desc: 'Built-in web search with citations. The model decides when to search and how many sources to pull. Zero config.' },
		{ icon: 'lock' as const, title: 'Private by default', desc: 'Chats stay on your device unless you opt-in to cloud sync. End-to-end encrypted. We never train on your data.' },
		{ icon: 'automation' as const, title: 'Scheduled automations', desc: 'Set up recurring prompts: "Summarize HN top 10 every morning." Your AI works while you sleep.', soon: true }
	];
</script>

<section class="features" id="features">
	<div class="wrap">
		<div class="center">
			<span class="eyebrow matcha">Features</span>
			<h2 style="margin-top:10px">Everything in one app.</h2>
			<p class="lede max-prose" style="margin-top:14px">
				No more switching between ChatGPT, Claude, and Gemini. One app, every model, honest pricing.
			</p>
		</div>

		<div class="features-grid">
			{#each features as feat}
				<div class="feat">
					<div class="ico">
						<Icon name={feat.icon} size={20} stroke={1.75} />
					</div>
					<h3>{feat.title}</h3>
					<p>{feat.desc}{#if feat.soon} <span class="soon">Soon</span>{/if}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.features {
		background: white;
	}
	.features-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1px;
		background: var(--rule);
		border: 1px solid var(--rule);
		border-radius: var(--radius-xl);
		overflow: hidden;
		margin-top: 56px;
	}
	@media (max-width: 880px) {
		.features-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (max-width: 560px) {
		.features-grid {
			grid-template-columns: 1fr;
		}
	}
	.feat {
		background: white;
		padding: 32px 28px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-height: 220px;
	}
	.feat .ico {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: var(--matcha-50);
		color: var(--matcha-700);
		display: grid;
		place-items: center;
		border: 1px solid var(--matcha-100);
	}
	.feat h3 {
		margin-top: 8px;
		font-size: 17px;
	}
	.feat p {
		font-size: 14px;
		color: var(--fg-muted);
		line-height: 1.55;
	}
</style>
