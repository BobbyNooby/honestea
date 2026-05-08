<script lang="ts">
	let scrolled = $state(false);

	if (typeof window !== 'undefined') {
		window.addEventListener('scroll', () => {
			scrolled = window.scrollY > 10;
		});
	}
</script>

<header class="nav" class:scrolled>
	<div class="wrap nav-inner">
		<a href="#" class="brand" aria-label="HonesTea AI home">
			<span class="mark" aria-hidden="true">
				<svg viewBox="16 10 72 80" width="28" height="28">
					<path d="M20 42 H72 L68 78 Q66 86 58 86 H34 Q26 86 24 78 Z" fill="none" stroke="#fbf6e9" stroke-width="5" stroke-linejoin="round"/>
					<line x1="24" y1="50" x2="68" y2="50" stroke="#fbf6e9" stroke-width="2.5" stroke-linecap="round"/>
					<path d="M72 50 Q84 52 84 60 Q84 68 72 70" fill="none" stroke="#fbf6e9" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
					<path d="M44 30 Q40 22 46 14 Q56 18 52 30 Z" fill="#fbf6e9"/>
					<path d="M58 34 Q60 28 56 22" fill="none" stroke="#fbf6e9" stroke-width="3" stroke-linecap="round"/>
				</svg>
			</span>
			<span>Hones<span class="brand-tea">Tea</span> <span style="color:var(--fg-soft);font-weight:500">AI</span></span>
		</a>
		<nav class="nav-links">
			<a href="#how">Pricing</a>
			<a href="#features">Features</a>
			<a href="#models">Models</a>
			<a href="#compare">Compare</a>
			<a href="#faq">FAQ</a>
		</nav>
		<div class="nav-cta">
			<a href="#models" class="btn btn-ghost" style="padding:8px 14px">Browse models</a>
			<a href="#waitlist" class="btn btn-primary" style="padding:8px 16px">Join waitlist</a>
		</div>
	</div>
</header>

<style>
	.nav {
		position: sticky;
		top: 0;
		z-index: 50;
		background: rgba(255, 255, 255, 0.78);
		backdrop-filter: saturate(160%) blur(14px);
		-webkit-backdrop-filter: saturate(160%) blur(14px);
		border-bottom: 1px solid transparent;
		transition: border-color 0.2s ease, background 0.2s ease;
	}
	.nav.scrolled {
		border-color: var(--rule);
	}
	.nav-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 64px;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		font-weight: 700;
		letter-spacing: -0.01em;
		font-size: 17px;
	}
	.brand .mark {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: var(--matcha-600);
		display: grid;
		place-items: center;
	}
	.brand-tea {
		color: var(--matcha-700);
	}
	.nav-links {
		display: flex;
		align-items: center;
		gap: 28px;
	}
	.nav-links a {
		font-size: 14px;
		color: var(--fg-muted);
		font-weight: 500;
	}
	.nav-links a:hover {
		color: var(--fg);
	}
	.nav-cta {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	@media (max-width: 720px) {
		.nav-links {
			display: none;
		}
	}

	/* Buttons */
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
	.btn:active {
		transform: translateY(0.5px);
	}
	.btn-primary {
		background: var(--matcha-600);
		color: white;
	}
	.btn-primary:hover {
		background: var(--matcha-700);
	}
	.btn-ghost {
		background: transparent;
		color: var(--fg);
		border-color: var(--rule);
	}
	.btn-ghost:hover {
		background: var(--zinc-50);
		border-color: var(--zinc-300);
	}
	.btn-lg {
		padding: 16px 28px;
		font-size: 15px;
	}
</style>
