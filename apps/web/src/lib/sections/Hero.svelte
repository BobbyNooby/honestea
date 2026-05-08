<script lang="ts">
	import Icon from './Icon.svelte';
</script>

<section class="hero">
	<div class="wrap hero-grid">
		<div>
			<span class="hero-eyebrow"><span class="pulse"></span> See what AI actually costs</span>
			<h1>
				The honest<br />
				AI app. <span class="accent">Brewed</span>,<br />
				<span class="strike">not steeped.</span>
			</h1>
			<p class="lede" style="margin-top:24px">
				Every message shows its real cost — to the cent. Switch between Claude, GPT, Gemini and 300+ models in one app. Bring your own key for free, or top up only what you'll use.
			</p>
			<div class="hero-cta">
				<a href="#waitlist" class="btn btn-primary btn-lg">Join the waitlist</a>
				<a href="#how" class="btn btn-ghost btn-lg">See pricing</a>
			</div>
			<div class="hero-meta">
				<span><b>$0</b> to start · bring your own key</span>
				<span class="dot">&#8226;</span>
				<span><b>300+</b> models</span>
				<span class="dot">&#8226;</span>
				<span><b>0%</b> markup on BYOK</span>
			</div>
		</div>

		<div class="phone-stage">
			<div class="floating-saving">
				You saved this month
				<span class="big">$17.42</span>
				vs. ChatGPT Plus
			</div>
			<div class="phone">
				<div class="phone-screen">
					<div class="pscreen-pad-top"></div>
					<div class="chat-header">
						<div class="hbtn" aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" width="20" height="20">
								<line x1="4" y1="6" x2="20" y2="6"/>
								<line x1="4" y1="12" x2="20" y2="12"/>
								<line x1="4" y1="18" x2="20" y2="18"/>
							</svg>
						</div>
						<button class="model-pill" type="button">Claude Sonnet 4.6
							<svg viewBox="0 0 24 24" width="12" height="12"><polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
						</button>
						<div class="hbtn" aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
								<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>
							</svg>
						</div>
					</div>
					<div class="chat-msgs">
						<div class="bubble user">summarize this PDF in 3 bullets</div>
						<div class="asst-text">Here's the gist:<br/>• Q3 revenue up 12%<br/>• Costs flat YoY<br/>• EU expansion delayed to Q1</div>
						<div class="asst-meta"><span class="cost">~$0.0084</span><span>&#183;</span><span>sonnet-4.6</span></div>
						<div class="asst-actions">
							<span class="act">Copy</span>
							<span class="act">Share</span>
							<span class="act">Speak</span>
						</div>
						<div class="bubble user">draft a follow-up to investors</div>
						<div class="asst-text" style="color:var(--zinc-400)">Writing&#8230;</div>
					</div>
					<div class="status-row">
						<span class="ctx">2.3k / 200k</span>
						<div class="track"><div class="fill" style="width:1.2%"></div></div>
						<span class="total">~$0.0084</span>
					</div>
					<div class="composer">
						<div class="composer-box">
							<div class="composer-text">Reply to HonesTea&#8230;</div>
							<div class="composer-row">
								<div class="cbtn" aria-hidden="true">+</div>
								<div class="composer-right">
									<div class="cbtn" aria-hidden="true"><Icon name="microphone" size={16} stroke={2} /></div>
									<div class="cbtn voice" aria-hidden="true"><Icon name="volume" size={16} stroke={2} /></div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div class="floating-receipt">
				<div class="r-title">This conversation</div>
				<div class="r-total">$0.0468</div>
				<div class="r-row"><span>Claude Sonnet</span><b>$0.0184</b></div>
				<div class="r-row"><span>Web search &#215; 1</span><b>$0.0200</b></div>
				<div class="r-row"><span>Markup (PAYG)</span><b>+$0.0084</b></div>
				<div class="r-row r-rule"><span>Total</span><b>$0.0468</b></div>
			</div>
		</div>
	</div>
</section>

<style>
	.hero {
		position: relative;
		padding-block: clamp(72px, 12vw, 140px) clamp(64px, 8vw, 96px);
		overflow: hidden;
		background:
			radial-gradient(1100px 480px at 78% -10%, rgba(91, 138, 58, 0.08), transparent 60%),
			radial-gradient(900px 600px at -10% 110%, rgba(194, 136, 74, 0.07), transparent 60%),
			linear-gradient(180deg, var(--chamomile-50) 0%, #ffffff 70%);
	}
	.hero::after {
		content: "";
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 1px;
		background: var(--rule);
	}
	.hero-grid {
		display: grid;
		grid-template-columns: 1.05fr 0.95fr;
		gap: clamp(40px, 6vw, 80px);
		align-items: center;
	}
	.hero-grid > * {
		min-width: 0;
	}
	@media (max-width: 980px) {
		.hero-grid {
			grid-template-columns: 1fr;
		}
	}

	.hero h1 .accent {
		color: var(--matcha-700);
		font-style: italic;
		font-weight: 700;
	}
	.hero h1 .strike {
		position: relative;
		color: var(--zinc-400);
		font-weight: 600;
	}
	.hero h1 .strike::after {
		content: "";
		position: absolute;
		left: -2%;
		right: -2%;
		top: 53%;
		height: 4px;
		background: var(--oolong-400);
		transform: rotate(-2deg);
		border-radius: 2px;
	}
	.hero-cta {
		margin-top: 32px;
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
		align-items: center;
	}
	.hero-meta {
		margin-top: 22px;
		display: flex;
		gap: 18px;
		flex-wrap: wrap;
		font-size: 13px;
		color: var(--fg-soft);
	}
	.hero-meta b {
		color: var(--fg);
		font-weight: 600;
	}
	.hero-meta .dot {
		color: var(--zinc-300);
	}
	.hero-eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 14px;
		border-radius: var(--radius-pill);
		background: rgba(91, 138, 58, 0.08);
		color: var(--matcha-700);
		font-size: 12.5px;
		font-weight: 600;
		letter-spacing: 0.01em;
		margin-bottom: 24px;
	}
	.hero-eyebrow .pulse {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--matcha-600);
		box-shadow: 0 0 0 0 rgba(91, 138, 58, 0.5);
		animation: pulse 2.2s infinite;
	}

	/* Phone mock */
	.phone-stage {
		position: relative;
		aspect-ratio: 0.62;
		width: 100%;
		max-width: 380px;
		margin: 0 auto;
		display: grid;
		place-items: center;
	}
	.phone {
		width: 100%;
		height: 100%;
		background: var(--zinc-950);
		border-radius: 44px;
		padding: 10px;
		box-shadow:
			0 40px 80px -20px rgba(36, 55, 26, 0.30),
			0 12px 28px -10px rgba(36, 55, 26, 0.18),
			0 0 0 1px rgba(0, 0, 0, 0.06);
		position: relative;
	}
	.phone-screen {
		width: 100%;
		height: 100%;
		background: white;
		border-radius: 36px;
		overflow: hidden;
		position: relative;
		display: flex;
		flex-direction: column;
	}
	.phone-screen::before {
		content: "";
		position: absolute;
		top: 14px;
		left: 50%;
		transform: translateX(-50%);
		width: 92px;
		height: 26px;
		background: black;
		border-radius: 999px;
		z-index: 5;
	}
	.pscreen-pad-top {
		height: 50px;
		flex-shrink: 0;
	}
	.chat-header {
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 6px;
		border-bottom: 1px solid var(--rule);
		background: white;
		flex-shrink: 0;
	}
	.chat-header .hbtn {
		width: 36px;
		height: 36px;
		display: grid;
		place-items: center;
		color: var(--zinc-700);
	}
	.chat-header .model-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 28px;
		padding: 0 11px;
		border-radius: 999px;
		border: 1px solid var(--rule);
		background: white;
		font-size: 12px;
		font-weight: 500;
		color: var(--zinc-900);
	}
	.chat-msgs {
		flex: 1;
		overflow: hidden;
		padding: 12px 14px 8px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.bubble.user {
		max-width: 78%;
		padding: 8px 13px;
		border-radius: 22px;
		font-size: 14px;
		line-height: 1.35;
		align-self: flex-end;
		background: var(--matcha-50);
		color: var(--matcha-900);
		border: 1px solid var(--matcha-100);
	}
	.asst-text {
		font-size: 14px;
		line-height: 1.5;
		color: var(--zinc-900);
		padding: 4px 2px 0;
	}
	.asst-meta {
		display: flex;
		gap: 6px;
		align-items: center;
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--zinc-500);
		padding-left: 2px;
		margin-top: 2px;
	}
	.asst-meta .cost {
		color: var(--zinc-700);
		font-weight: 600;
	}
	.asst-actions {
		display: flex;
		gap: 2px;
		padding-left: 0;
		margin-top: 2px;
	}
	.asst-actions .act {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 6px;
		font-size: 10.5px;
		color: var(--zinc-500);
	}
	.status-row {
		border-top: 1px solid var(--rule);
		padding: 5px 12px;
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
		background: white;
	}
	.status-row .ctx {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--zinc-500);
		white-space: nowrap;
	}
	.status-row .track {
		flex: 1;
		height: 3px;
		background: var(--zinc-200);
		border-radius: 999px;
		overflow: hidden;
	}
	.status-row .fill {
		height: 100%;
		background: var(--zinc-400);
		border-radius: 999px;
	}
	.status-row .total {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--zinc-500);
	}
	.composer {
		border-top: 1px solid var(--rule);
		padding: 8px 10px 14px;
		background: white;
		flex-shrink: 0;
	}
	.composer-box {
		border: 1px solid var(--rule);
		border-radius: 24px;
		padding: 8px 8px 4px;
		background: white;
	}
	.composer-text {
		padding: 4px 8px 6px;
		font-size: 14px;
		color: var(--zinc-400);
		line-height: 1.3;
	}
	.composer-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.composer-row .cbtn {
		width: 32px;
		height: 32px;
		display: grid;
		place-items: center;
		border-radius: 999px;
		color: var(--zinc-700);
	}
	.composer-right {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	/* Floating receipts */
	.floating-receipt {
		position: absolute;
		right: -56px;
		bottom: 64px;
		background: white;
		border: 1px solid var(--rule);
		box-shadow: var(--shadow-lg);
		border-radius: 14px;
		padding: 14px 16px;
		width: 230px;
		font-size: 12.5px;
		line-height: 1.45;
		z-index: 3;
	}
	.floating-receipt .r-title {
		font-size: 11px;
		color: var(--fg-soft);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		font-weight: 600;
	}
	.floating-receipt .r-total {
		font-family: var(--font-mono);
		font-size: 22px;
		font-weight: 700;
		color: var(--matcha-800);
		letter-spacing: -0.02em;
		margin-top: 4px;
	}
	.floating-receipt .r-row {
		display: flex;
		justify-content: space-between;
		padding: 4px 0;
		color: var(--fg-muted);
	}
	.floating-receipt .r-row b {
		color: var(--fg);
		font-weight: 600;
	}
	.floating-receipt .r-row.r-rule {
		border-top: 1px dashed var(--rule);
		margin-top: 6px;
		padding-top: 8px;
	}
	.floating-saving {
		position: absolute;
		left: -56px;
		top: 88px;
		background: var(--matcha-600);
		color: white;
		border-radius: 14px;
		padding: 12px 14px;
		font-size: 12.5px;
		font-weight: 500;
		box-shadow: 0 14px 30px -10px rgba(36, 55, 26, 0.35);
		width: 184px;
		z-index: 3;
	}
	.floating-saving .big {
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: 22px;
		letter-spacing: -0.02em;
		display: block;
	}
	@media (max-width: 980px) {
		.floating-receipt {
			right: 0;
		}
		.floating-saving {
			left: 0;
		}
	}
	@media (max-width: 540px) {
		.floating-receipt,
		.floating-saving {
			display: none;
		}
	}
</style>
