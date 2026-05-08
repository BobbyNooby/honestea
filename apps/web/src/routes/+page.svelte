<script lang="ts">
	import Nav from '$lib/sections/Nav.svelte';
	import Hero from '$lib/sections/Hero.svelte';
	import Comparison from '$lib/sections/Comparison.svelte';
	import Plans from '$lib/sections/Plans.svelte';
	import Features from '$lib/sections/Features.svelte';
	import Models from '$lib/sections/Models.svelte';
	import FAQ from '$lib/sections/FAQ.svelte';
	import Waitlist from '$lib/sections/Waitlist.svelte';
	import Footer from '$lib/sections/Footer.svelte';
</script>

<svelte:head>
	<title>HonesTea AI — The honest AI app</title>
	<meta name="description" content="Every message shows its real cost. Switch between Claude, GPT, Gemini and 300+ models. BYOK for free, or pay as you go." />
</svelte:head>

<Nav />
<main>
	<Hero />
	<Comparison />
	<Plans />
	<Features />
	<Models />
	<FAQ />
	<Waitlist />
</main>
<Footer />
