<section class="models" id="models">
	<div class="wrap">
		<div class="models-head">
			<span class="eyebrow matcha">Models</span>
			<h2 style="margin-top:10px">300+ models, one app.</h2>
			<p class="lede" style="margin-top:14px">
				From free workhorses to flagship reasoning models. Pick by cost, capability, or let smart routing decide for you.
			</p>
		</div>

		<div class="model-filters">
			<button class="filter on">All <span class="ct">300+</span></button>
			<button class="filter">Free <span class="ct">50</span></button>
			<button class="filter">Vision <span class="ct">40</span></button>
			<button class="filter">Coding <span class="ct">60</span></button>
			<button class="filter">Cheap <span class="ct">80</span></button>
		</div>

		<div class="model-grid">
			{#each curatedModels as model}
				<div class="model-card">
					<div class="mc-head">
						<div class="mc-mark" style="background:{model.color}">{model.initials}</div>
						<div class="mc-meta">
							<div class="mc-name">{model.name}</div>
							<div class="mc-prov">{model.provider}</div>
						</div>
					</div>
					<div class="mc-prices">
						<div class="mc-price-cell">
							<div class="lab">Input</div>
							<div class="v">${model.inputPrice}<span class="unit">/M</span></div>
						</div>
						<div class="mc-price-cell">
							<div class="lab">Output</div>
							<div class="v">${model.outputPrice}<span class="unit">/M</span></div>
						</div>
					</div>
					<div class="mc-tags">
						{#each model.tags as tag}
							<span class="mc-tag {tag.type}">{tag.label}</span>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<p class="model-note">Prices from OpenRouter, updated hourly. Actual cost varies by message length.</p>
	</div>
</section>

<script lang="ts">
	const curatedModels = [
		{ name: 'Claude Opus 4.7', provider: 'Anthropic', initials: 'Op', color: '#c96442', inputPrice: '15.00', outputPrice: '75.00', tags: [{label: 'Flagship', type: 'matcha'}, {label: 'Vision', type: 'cool'}] },
		{ name: 'GPT-5.5 Pro', provider: 'OpenAI', initials: 'G5', color: '#10a37f', inputPrice: '5.00', outputPrice: '15.00', tags: [{label: 'Flagship', type: 'matcha'}, {label: 'Vision', type: 'cool'}] },
		{ name: 'Gemini 3.1 Pro', provider: 'Google', initials: 'G3', color: '#4285f4', inputPrice: '3.50', outputPrice: '10.50', tags: [{label: 'Vision', type: 'cool'}, {label: '1M ctx', type: 'warm'}] },
		{ name: 'Kimi K2.6', provider: 'Moonshot', initials: 'K2', color: '#6e4cd9', inputPrice: '0.75', outputPrice: '3.50', tags: [{label: 'Reasoning', type: 'matcha'}, {label: 'Vision', type: 'cool'}] },
		{ name: 'DeepSeek V4 Flash', provider: 'DeepSeek', initials: 'D4', color: '#155eef', inputPrice: '0.14', outputPrice: '0.28', tags: [{label: 'Free', type: 'matcha'}, {label: 'Cheap', type: 'warm'}] },
		{ name: 'Claude Haiku 4.5', provider: 'Anthropic', initials: 'Hk', color: '#c96442', inputPrice: '0.25', outputPrice: '1.25', tags: [{label: 'Fast', type: 'warm'}, {label: 'Reliable', type: 'cool'}] },
		{ name: 'GPT-5.4 Nano', provider: 'OpenAI', initials: 'N4', color: '#10a37f', inputPrice: '0.15', outputPrice: '0.60', tags: [{label: 'Cheap', type: 'warm'}, {label: 'Fast', type: 'cool'}] },
		{ name: 'MiMo-V2.5', provider: 'Xiaomi', initials: 'Mi', color: '#ff6a00', inputPrice: '0.40', outputPrice: '2.00', tags: [{label: '1M ctx', type: 'warm'}, {label: 'Vision', type: 'cool'}] },
		{ name: 'MiniMax M2.5', provider: 'MiniMax', initials: 'Mm', color: '#8a4a2c', inputPrice: '0.15', outputPrice: '1.15', tags: [{label: 'Cheap', type: 'warm'}] },
	];
</script>

<style>
	.models {
		background: var(--chamomile-50);
	}
	.models-head {
		max-width: 720px;
	}
	.model-filters {
		margin-top: 36px;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding: 6px;
		background: white;
		border: 1px solid var(--rule);
		border-radius: 999px;
		width: fit-content;
		max-width: 100%;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
	}
	.model-filters .filter {
		border: 0;
		background: transparent;
		padding: 8px 14px;
		border-radius: 999px;
		font-size: 13px;
		font-weight: 500;
		color: var(--fg-muted);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		white-space: nowrap;
		transition: background 0.15s ease, color 0.15s ease;
	}
	.model-filters .filter .ct {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--fg-soft);
		font-weight: 600;
	}
	.model-filters .filter:hover {
		color: var(--fg);
	}
	.model-filters .filter.on {
		background: var(--matcha-700);
		color: white;
	}
	.model-filters .filter.on .ct {
		color: var(--matcha-100);
	}

	.model-grid {
		margin-top: 28px;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}
	@media (max-width: 1040px) {
		.model-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (max-width: 640px) {
		.model-grid {
			grid-template-columns: 1fr;
		}
	}

	.model-card {
		background: white;
		border: 1px solid var(--rule);
		border-radius: var(--radius-lg);
		padding: 20px 22px 18px;
		display: flex;
		flex-direction: column;
		cursor: pointer;
		transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
		position: relative;
		text-align: left;
		font: inherit;
	}
	.model-card:hover {
		transform: translateY(-1px);
		border-color: var(--zinc-300);
		box-shadow: var(--shadow-md);
	}

	.mc-head {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.mc-mark {
		width: 30px;
		height: 30px;
		border-radius: 9px;
		display: grid;
		place-items: center;
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: 13px;
		color: white;
		flex-shrink: 0;
	}
	.mc-meta {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.mc-name {
		font-size: 14.5px;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--fg);
		line-height: 1.2;
	}
	.mc-prov {
		font-size: 11.5px;
		color: var(--fg-soft);
		margin-top: 2px;
	}

	.mc-prices {
		margin-top: 16px;
		padding-top: 14px;
		border-top: 1px dashed var(--rule);
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		font-family: var(--font-mono);
	}
	.mc-price-cell .lab {
		font-size: 10.5px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--fg-soft);
	}
	.mc-price-cell .v {
		font-size: 17px;
		font-weight: 700;
		color: var(--fg);
		letter-spacing: -0.02em;
		margin-top: 2px;
		line-height: 1;
	}
	.mc-price-cell .v .unit {
		font-size: 11px;
		font-weight: 500;
		color: var(--fg-soft);
		margin-left: 3px;
		letter-spacing: 0;
	}

	.mc-tags {
		margin-top: 14px;
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}
	.mc-tag {
		font-size: 10.5px;
		font-weight: 600;
		padding: 3px 8px;
		border-radius: 999px;
		background: var(--zinc-100);
		color: var(--zinc-700);
		letter-spacing: 0.02em;
	}
	.mc-tag.matcha {
		background: var(--matcha-50);
		color: var(--matcha-800);
	}
	.mc-tag.warm {
		background: var(--chamomile-100);
		color: var(--oolong-700);
	}
	.mc-tag.cool {
		background: #e8f0fb;
		color: #1f4ea8;
	}

	.model-note {
		margin-top: 28px;
		text-align: center;
		font-size: 12.5px;
		color: var(--fg-soft);
	}
</style>
