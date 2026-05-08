<script lang="ts">
	const icons: Record<string, string> = {
		'menu': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 6l16 0" /><path d="M4 12l16 0" /><path d="M4 18l16 0" />',
		'chevron-down': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 9l6 6l6 -6" />',
		'chevron-up': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 15l6 -6l6 6" />',
		'dots': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M19 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />',
		'microphone': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 2a3 3 0 0 1 3 3v7a3 3 0 0 1 -6 0v-7a3 3 0 0 1 3 -3z" /><path d="M15 8a3 3 0 0 1 3 3v3a3 3 0 0 1 -6 0v-3a3 3 0 0 1 3 -3z" /><path d="M19 11v3a7 7 0 0 1 -14 0v-3" /><path d="M12 19v3" />',
		'message-circle': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.106 3.986 -10.452 1.8l-3.822 2.493z" />',
		'coins': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 14c0 1.657 2.686 3 6 3s6 -1.343 6 -3s-2.686 -3 -6 -3s-6 1.343 -6 3z" /><path d="M9 8c0 1.657 2.686 3 6 3s6 -1.343 6 -3s-2.686 -3 -6 -3s-6 1.343 -6 3z" /><path d="M3 6v12c0 1.657 2.686 3 6 3s6 -1.343 6 -3v-12c0 -1.657 -2.686 -3 -6 -3s-6 1.343 -6 3z" />',
		'key': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M16.555 3.843l3.602 3.602a2.877 2.877 0 0 1 0 4.069l-2.643 2.643a2.877 2.877 0 0 1 -4.069 0l-.301 -.301l-6.558 6.558a2 2 0 0 1 -1.239 .578l-.175 .008h-1.172a1 1 0 0 1 -.993 -.883l-.007 -.117v-1.172a2 2 0 0 1 .467 -1.284l.119 -.13l.414 -.414h2v-2h2v-2l2.144 -2.144l-.301 -.301a2.877 2.877 0 0 1 0 -4.069l2.643 -2.643a2.877 2.877 0 0 1 4.069 0z" /><path d="M15 9h.01" />',
		'camera': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2" /><path d="M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />',
		'volume': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M15 8a5 5 0 0 1 0 8" /><path d="M19 5a10 10 0 0 1 0 14" /><path d="M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5z" />',
		'route': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 19a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M19 7a2 2 0 1 0 0 -4a2 2 0 0 0 0 4z" /><path d="M11 19h5.5a3.5 3.5 0 0 0 0 -7h-8a3.5 3.5 0 0 1 0 -7h4.5" />',
		'search': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" />',
		'lock': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6z" /><path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" /><path d="M8 11v-4a4 4 0 1 1 8 0v4" />',
		'automation': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 15h-3a3 3 0 0 1 -3 -3v-6a3 3 0 0 1 3 -3h6a3 3 0 0 1 3 3v3" /><path d="M16 15l4 4" /><path d="M20 15l-4 4" /><path d="M3 15h6" /><path d="M18 15h3a3 3 0 0 0 3 -3v-3" />',
		'seeding': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 10a6 6 0 0 0 -6 -6h-3v11a6 6 0 0 0 6 6h3v-11z" /><path d="M12 14a6 6 0 0 1 6 -6h3v11a6 6 0 0 1 -6 6h-3v-11z" />',
		'plant': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 15h10v4a2 2 0 0 1 -2 2h-6a2 2 0 0 1 -2 -2v-4z" /><path d="M12 15v-9" /><path d="M12 3a5 5 0 0 1 5 5c0 2.5 -1 4 -3 5" /><path d="M12 3a5 5 0 0 0 -5 5c0 2.5 1 4 3 5" />',
		'star': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z" />',
		'rocket': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 13a8 8 0 1 1 16 0v5a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-5z" /><path d="M8 13v.01" /><path d="M12 13v.01" /><path d="M16 13v.01" /><path d="M12 8v-3" /><path d="M12 2l3 3" /><path d="M12 2l-3 3" />',
		'check': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10" />',
		'plus': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 5l0 14" /><path d="M5 12l14 0" />',
		'apple': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 10.5c0 -2.5 2 -4.5 4.5 -4.5c1.5 0 3 .5 3.5 1.5c.5 -1 2 -1.5 3.5 -1.5c2.5 0 4.5 2 4.5 4.5c0 4.5 -5 8 -6 9c-1 -1 -6 -4.5 -6 -9z" /><path d="M12 2a3 3 0 0 1 3 3" />',
		'mobile': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 5a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-14z" /><path d="M11 4h2" /><path d="M12 17v.01" />',
		'world': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M3.6 9h16.8" /><path d="M3.6 15h16.8" /><path d="M11.5 3a17 17 0 0 0 0 18" /><path d="M12.5 3a17 17 0 0 1 0 18" />',
		'close': '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M18 6l-12 12" /><path d="M6 6l12 12" />'
	};

	interface Props {
		name: string;
		size?: number;
		stroke?: number;
		class?: string;
	}

	let { name, size = 20, stroke = 1.75, class: className = '' }: Props = $props();

	const svgContent = icons[name] || '';
</script>

{#if svgContent}
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width={stroke}
		stroke-linecap="round"
		stroke-linejoin="round"
		class={className}
	>
		{@html svgContent}
	</svg>
{:else}
	<span class="text-red-500" title="Missing icon: {name}">?</span>
{/if}
