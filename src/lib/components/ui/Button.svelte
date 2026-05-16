<script>
	/**
	 * Botón corporativo GAC. Reutiliza los tokens del design system
	 * (variables CSS por tema) y soporta variantes / tamaños comunes.
	 *
	 * @typedef {'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'} Variant
	 * @typedef {'sm' | 'md' | 'lg'} Size
	 */

	/** @type {{
	 * 	variant?: Variant,
	 * 	size?: Size,
	 * 	type?: 'button' | 'submit' | 'reset',
	 * 	disabled?: boolean,
	 * 	fullWidth?: boolean,
	 * 	class?: string,
	 * 	title?: string,
	 * 	ariaLabel?: string,
	 * 	children?: import('svelte').Snippet,
	 * 	onclick?: (event: MouseEvent) => void
	 * }} */
	let {
		variant = 'primary',
		size = 'md',
		type = 'button',
		disabled = false,
		fullWidth = false,
		class: className = '',
		title,
		ariaLabel,
		children,
		onclick
	} = $props();

	const variantClass = {
		primary: 'gac-btn-primary',
		secondary: 'gac-btn-secondary',
		danger: 'gac-btn-danger',
		ghost: 'gac-btn-ghost',
		outline: 'gac-btn-outline'
	};

	const sizeClass = {
		sm: 'gac-btn-sm',
		md: '',
		lg: 'gac-btn-lg'
	};
</script>

<button
	{type}
	{disabled}
	{title}
	aria-label={ariaLabel}
	class="gac-btn {variantClass[variant]} {sizeClass[size]} {fullWidth ? 'w-full' : ''} {className}"
	{onclick}
>
	{@render children?.()}
</button>
