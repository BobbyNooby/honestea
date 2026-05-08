<section class="comparison" id="comparison">
	<div class="wrap">
		<span class="eyebrow matcha">The transparency pitch</span>
		<h2 style="margin-top:10px;max-width:20ch">Other apps charge $20/mo and hope you don't notice.</h2>
		<p class="lede" style="margin-top:18px">
			Apples-to-apples for an average user (~80 messages/month, mostly cheap-model traffic). Your actual usage is your number.
		</p>

		<div class="comparison-grid">
			<div class="comp-card them">
				<div class="label">Them</div>
				<div class="price-row">
					<span class="price">$20</span>
					<span class="per">/mo</span>
				</div>
				<p class="desc">ChatGPT Plus. One model. No cost transparency.</p>
				<div class="breakdown">
					<div class="br-row"><span class="k">Subscription</span><span class="v">$20.00</span></div>
					<div class="br-row"><span class="k">Messages used</span><span class="v">~80</span></div>
					<div class="br-row"><span class="k">Actual AI cost</span><span class="v">~$2.40</span></div>
					<div class="br-row total"><span class="k">You overpaid</span><span class="v">$17.60</span></div>
				</div>
			</div>

			<div class="comp-card us">
				<div class="save-tag">You save 87%</div>
				<div class="label">Us</div>
				<div class="price-row">
					<span class="price">$2.58</span>
					<span class="per">/mo</span>
				</div>
				<p class="desc">HonesTea AI. 300+ models. Every cost shown.</p>
				<div class="breakdown">
					<div class="br-row"><span class="k">Claude Haiku × 60</span><span class="v">$0.90</span></div>
					<div class="br-row"><span class="k">Claude Sonnet × 20</span><span class="v">$1.68</span></div>
					<div class="br-row"><span class="k">Our fee (28%)</span><span class="v">$0.00</span></div>
					<div class="br-row total"><span class="k">Total</span><span class="v">$2.58</span></div>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.comparison {
		background: white;
	}
	.comparison-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px;
		margin-top: 48px;
		max-width: 1040px;
		margin-left: auto;
		margin-right: auto;
		align-items: stretch;
	}
	@media (max-width: 760px) {
		.comparison-grid {
			grid-template-columns: 1fr;
		}
	}
	.comp-card {
		border: 1px solid var(--rule);
		border-radius: var(--radius-xl);
		padding: 32px;
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
	.comp-card.them {
		background: var(--zinc-50);
	}
	.comp-card.us {
		background: linear-gradient(180deg, var(--matcha-50) 0%, white 100%);
		border-color: var(--matcha-200);
	}
	.comp-card .label {
		font-size: 11.5px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--fg-soft);
	}
	.comp-card.us .label {
		color: var(--matcha-700);
	}
	.comp-card .price-row {
		display: flex;
		align-items: baseline;
		gap: 10px;
		margin-top: 8px;
		margin-bottom: 6px;
	}
	.comp-card .price {
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: 56px;
		letter-spacing: -0.04em;
		color: var(--fg);
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}
	.comp-card.them .price {
		color: var(--zinc-500);
		text-decoration: line-through;
		text-decoration-color: var(--oolong-500);
		text-decoration-thickness: 3px;
	}
	.comp-card .per {
		font-size: 14px;
		color: var(--fg-soft);
	}
	.comp-card .desc {
		font-size: 14px;
		color: var(--fg-muted);
		margin-top: 6px;
	}
	.comp-card .breakdown {
		margin-top: 24px;
		padding-top: 20px;
		border-top: 1px dashed var(--rule);
		display: grid;
		gap: 10px;
		font-size: 13.5px;
		font-family: var(--font-mono);
	}
	.comp-card .breakdown .br-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	.comp-card .breakdown .br-row .k {
		color: var(--fg-muted);
	}
	.comp-card .breakdown .br-row .v {
		font-weight: 600;
	}
	.comp-card.us .breakdown .br-row.total {
		padding-top: 8px;
		border-top: 1px solid var(--matcha-200);
		margin-top: 4px;
		color: var(--matcha-800);
		font-weight: 700;
	}
	.comp-card.them .breakdown .br-row.total {
		padding-top: 8px;
		border-top: 1px solid var(--rule);
		margin-top: 4px;
	}
	.save-tag {
		position: absolute;
		top: 28px;
		right: 28px;
		background: var(--matcha-600);
		color: white;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.04em;
		padding: 6px 12px;
		border-radius: 999px;
	}
</style>
