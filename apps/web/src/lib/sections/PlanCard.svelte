<script lang="ts">
	import Icon from './Icon.svelte';

	interface Props {
		icon: string;
		iconBg: string;
		iconColor: string;
		name: string;
		price: string;
		tagline: string;
		features: string[];
		cta: string;
		ctaHref: string;
		estimate?: string;
		highlight?: boolean;
		flag?: string;
	}

	let {
		icon,
		iconBg,
		iconColor,
		name,
		price,
		tagline,
		features,
		cta,
		ctaHref,
		estimate,
		highlight = false,
		flag
	}: Props = $props();
</script>

<div class="plan" class:rec={highlight}>
	{#if flag}
		<div class="plan-flag">{flag}</div>
	{/if}
	<div class="plan-icon" style="background:{iconBg};color:{iconColor}">
		<Icon name={icon} size={20} stroke={1.75} />
	</div>
	<h3>{name}</h3>
	<div class="price-line">
		<span class="p">{price}</span>
		<span class="u">/mo</span>
	</div>
	<p class="tagline">{tagline}</p>
	<ul>
		{#each features as feat}
			<li>{feat}</li>
		{/each}
	</ul>
	{#if estimate}
		<div class="estimate">{estimate}</div>
	{/if}
	<div class="plan-foot">
		<a href={ctaHref} class="plan-cta">{cta} &rarr;</a>
	</div>
</div>

<style>
	.plan {
		background: white;
		border-radius: var(--radius-lg);
		border: 1px solid var(--rule);
		padding: 26px 22px 22px;
		display: flex;
		flex-direction: column;
		transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
		position: relative;
	}
	.plan:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
		border-color: var(--zinc-300);
	}
	.plan-icon {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		display: grid;
		place-items: center;
		margin-bottom: 16px;
	}
	.plan h3 {
		font-size: 18px;
	}
	.price-line {
		display: flex;
		align-items: baseline;
		gap: 6px;
		margin-top: 14px;
	}
	.price-line .p {
		font-family: var(--font-mono);
		font-size: 30px;
		font-weight: 700;
		letter-spacing: -0.03em;
		color: var(--fg);
	}
	.price-line .u {
		font-size: 13px;
		color: var(--fg-soft);
	}
	.tagline {
		font-size: 13.5px;
		color: var(--fg-muted);
		margin-top: 6px;
		min-height: 38px;
	}
	ul {
		list-style: none;
		padding: 0;
		margin: 18px 0 0;
		display: grid;
		gap: 8px;
		font-size: 13.5px;
		color: var(--fg-muted);
	}
	li {
		display: flex;
		gap: 8px;
		align-items: flex-start;
	}
	li::before {
		content: "\2713";
		color: var(--matcha-600);
		font-weight: 700;
		flex-shrink: 0;
		width: 14px;
	}
	.plan-foot {
		margin-top: 22px;
	}
	.plan-cta {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--matcha-700);
		font-size: 13.5px;
		font-weight: 600;
	}
	.plan-cta:hover {
		color: var(--matcha-800);
	}
	.plan.rec {
		border-color: var(--matcha-300);
		box-shadow: 0 0 0 4px rgba(91, 138, 58, 0.06);
	}
	.plan-flag {
		position: absolute;
		top: -10px;
		left: 22px;
		background: var(--matcha-600);
		color: white;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.04em;
		padding: 4px 10px;
		border-radius: 999px;
	}
	.estimate {
		margin-top: 14px;
		padding: 10px 12px;
		background: var(--zinc-50);
		border-radius: 10px;
		font-family: var(--font-mono);
		font-size: 11.5px;
		line-height: 1.5;
		color: var(--zinc-700);
		border: 1px solid var(--rule-soft);
	}
	.plan.rec .estimate {
		background: var(--matcha-50);
		border-color: var(--matcha-100);
		color: var(--matcha-800);
	}
</style>
