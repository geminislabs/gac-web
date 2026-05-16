<script>
	/**
	 * Tarjeta corporativa GAC. Usa la clase `gac-card` del design system
	 * para mantener consistencia visual y soporte multi-tema.
	 *
	 * @typedef {'solid' | 'glass'} Variant
	 */

	/** @type {{
	 * 	variant?: Variant,
	 * 	hover?: boolean,
	 * 	padding?: boolean,
	 * 	class?: string,
	 * 	style?: string,
	 * 	children?: import('svelte').Snippet
	 * }} */
	let {
		variant = 'solid',
		hover = false,
		padding = false,
		class: className = '',
		style = '',
		children
	} = $props();

	let surfaceClass = $derived(variant === 'glass' ? 'gac-panel' : 'gac-card');
</script>

<div
	class="{surfaceClass} {hover ? 'gac-card-hover' : ''} {padding ? 'p-6' : ''} {className}"
	{style}
>
	{@render children?.()}
</div>
