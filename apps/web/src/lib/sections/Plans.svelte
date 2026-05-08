<script lang="ts">
	import Icon from './Icon.svelte';
	import PlanCard from './PlanCard.svelte';

	const plans = [
		{
			icon: 'seeding',
			iconBg: 'var(--zinc-100)',
			iconColor: 'var(--zinc-700)',
			name: 'Try Free',
			price: '$0',
			tagline: 'One-tap sign-up. 50+ free models. No API key needed.',
			features: ['Chat immediately', 'Free models only', 'Rate-limited', 'Local history'],
			cta: 'Start chatting',
			ctaHref: '#waitlist'
		},
		{
			icon: 'plant',
			iconBg: 'var(--matcha-100)',
			iconColor: 'var(--matcha-700)',
			name: 'Beginner',
			price: '$10',
			tagline: '$15 in credits. Casual chat, trying different models.',
			features: ['$15 credits/mo (+50%)', 'Cloud sync', 'Web search', 'BYOK allowed'],
			estimate: '~140 Sonnet turns · ~3,500 Haiku turns',
			cta: '$5 first month',
			ctaHref: '#waitlist',
			highlight: false
		},
		{
			icon: 'star',
			iconBg: 'var(--matcha-100)',
			iconColor: 'var(--matcha-700)',
			name: 'Pro',
			price: '$25',
			tagline: '$37 in credits. Daily use, multiple models, tooling.',
			features: ['$37 credits/mo (+48%)', 'Cloud sync + search', 'Scheduled automations', 'BYOK allowed'],
			estimate: '~350 Sonnet turns · ~9,000 Haiku turns',
			cta: 'Get Pro',
			ctaHref: '#waitlist',
			highlight: true,
			flag: 'Most Popular'
		},
		{
			icon: 'rocket',
			iconBg: 'var(--zinc-100)',
			iconColor: 'var(--zinc-700)',
			name: 'Expert',
			price: '$50',
			tagline: '$75 in credits. Heavy all-day use, automations.',
			features: ['$75 credits/mo (+50%)', 'Everything in Pro', 'MCP tool support', 'Priority speed'],
			estimate: '~700 Sonnet turns · ~18,000 Haiku turns',
			cta: 'Get Expert',
			ctaHref: '#waitlist',
			highlight: false
		}
	];
</script>

<section class="how" id="how">
	<div class="wrap">
		<div class="how-head">
			<div>
				<span class="eyebrow matcha">How it works</span>
				<h2 style="margin-top:10px">Pick your path.</h2>
				<p class="lede" style="margin-top:14px">
					No account needed to start. Chat with free models, bring your own key, or top up credits. Subscriptions get bonus credits and cloud features.
				</p>
			</div>
		</div>

		<div class="plans">
			{#each plans as plan}
				<PlanCard {...plan} />
			{/each}
		</div>

		<div class="how-cta">
			<a href="#waitlist" class="btn btn-primary btn-lg">Join the waitlist</a>
			<p class="how-cta-note">PAYG also available — add credits anytime, no subscription</p>
		</div>
	</div>
</section>

<style>
	.how {
		background: var(--bg-cream);
	}
	.how-head {
		display: grid;
		grid-template-columns: 1.2fr 1fr;
		gap: 32px;
		align-items: end;
		margin-bottom: 56px;
	}
	@media (max-width: 800px) {
		.how-head {
			grid-template-columns: 1fr;
		}
	}
	.plans {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}
	@media (max-width: 1040px) {
		.plans {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (max-width: 600px) {
		.plans {
			grid-template-columns: 1fr;
		}
	}

	.how-cta {
		margin-top: 56px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}
	.how-cta-note {
		font-size: 13px;
		color: var(--fg-soft);
		margin: 0;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 12px 20px;
		border-radius: var(--radius-pill);
		border: 1px solid transparent;
		font-size: 14px;
		font-weight: 600;
		transition: transform 0.06s ease, background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
		white-space: nowrap;
	}
	.btn-primary {
		background: var(--matcha-600);
		color: white;
	}
	.btn-primary:hover {
		background: var(--matcha-700);
	}
	.btn-lg {
		padding: 16px 28px;
		font-size: 15px;
	}
</style>
