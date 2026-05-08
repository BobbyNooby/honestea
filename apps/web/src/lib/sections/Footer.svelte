<footer>
	<div class="wrap">
		<div class="foot-grid">
			<div>
				<div class="foot-brand">
					<span class="mark">
						<svg viewBox="16 10 72 80" width="28" height="28">
							<path d="M20 42 H72 L68 78 Q66 86 58 86 H34 Q26 86 24 78 Z" fill="none" stroke="#fbf6e9" stroke-width="5" stroke-linejoin="round"/>
							<line x1="24" y1="50" x2="68" y2="50" stroke="#fbf6e9" stroke-width="2.5" stroke-linecap="round"/>
							<path d="M72 50 Q84 52 84 60 Q84 68 72 70" fill="none" stroke="#fbf6e9" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
							<path d="M44 30 Q40 22 46 14 Q56 18 52 30 Z" fill="#fbf6e9"/>
							<path d="M58 34 Q60 28 56 22" fill="none" stroke="#fbf6e9" stroke-width="3" stroke-linecap="round"/>
						</svg>
					</span>
					<span>HonesTea AI</span>
				</div>
				<p class="foot-tag">The honest AI app. See what every message costs. Switch between 300+ models. Your keys, your choice.</p>
			</div>
			<div>
				<h4>Product</h4>
				<ul>
					<li><a href="#features">Features</a></li>
					<li><a href="#models">Models</a></li>
					<li><a href="#how">Pricing</a></li>
					<li><a href="#faq">FAQ</a></li>
				</ul>
			</div>
			<div>
				<h4>Company</h4>
				<ul>
					<li><a href="#">About</a></li>
					<li><a href="#">Blog</a></li>
					<li><a href="#">Privacy</a></li>
					<li><a href="#">Terms</a></li>
				</ul>
			</div>
			<div>
				<h4>Connect</h4>
				<ul>
					<li><a href="#">Discord</a></li>
					<li><a href="#">GitHub</a></li>
					<li><a href="#">X / Twitter</a></li>
					<li><a href="#">Contact</a></li>
				</ul>
			</div>
		</div>
		<div class="foot-bottom">
			<span>&copy; 2026 HonesTea AI</span>
			<span>Built with care and honesty</span>
		</div>
	</div>
</footer>

<style>
	footer {
		background: var(--zinc-950);
		color: var(--zinc-400);
		padding-block: 56px 40px;
	}
	.foot-grid {
		display: grid;
		grid-template-columns: 1.4fr repeat(3, 1fr);
		gap: 40px;
	}
	@media (max-width: 800px) {
		.foot-grid {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (max-width: 480px) {
		.foot-grid {
			grid-template-columns: 1fr;
		}
	}
	footer h4 {
		color: white;
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.02em;
		margin-bottom: 14px;
	}
	footer ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 8px;
		font-size: 13.5px;
	}
	footer a:hover {
		color: white;
	}
	.foot-brand {
		display: flex;
		align-items: center;
		gap: 10px;
		color: white;
		font-weight: 600;
		font-size: 16px;
	}
	.foot-brand .mark {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: var(--matcha-600);
		display: grid;
		place-items: center;
	}
	.foot-tag {
		font-size: 13.5px;
		margin-top: 12px;
		max-width: 280px;
		line-height: 1.55;
	}
	.foot-bottom {
		display: flex;
		justify-content: space-between;
		gap: 24px;
		margin-top: 48px;
		padding-top: 24px;
		border-top: 1px solid var(--zinc-800);
		font-size: 12.5px;
		color: var(--zinc-500);
		flex-wrap: wrap;
	}
</style>
