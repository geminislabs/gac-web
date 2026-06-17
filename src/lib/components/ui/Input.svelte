<script>
	/**
	 * Input corporativo GAC. Reutiliza `gac-input` y `gac-label` del
	 * design system, conserva la API (label, id, type, error, etc.)
	 * para no romper consumidores existentes.
	 */

	/** @type {{
	 * 	label?: string,
	 * 	id?: string,
	 * 	type?: string,
	 * 	placeholder?: string,
	 * 	value?: string | number,
	 * 	error?: string,
	 * 	required?: boolean,
	 * 	disabled?: boolean,
	 * 	autocomplete?: any,
	 * 	class?: string,
	 * 	inputClass?: string,
	 * 	min?: string | number,
	 * 	max?: string | number,
	 * 	step?: string | number,
	 * 	oninput?: (event: Event) => void,
	 * 	onchange?: (event: Event) => void,
	 * 	onblur?: (event: FocusEvent) => void,
	 * 	onkeydown?: (event: KeyboardEvent) => void
	 * }} */
	let {
		label,
		id,
		type = 'text',
		placeholder = '',
		value = $bindable(''),
		error,
		required = false,
		disabled = false,
		autocomplete = undefined,
		class: className = '',
		inputClass = '',
		min = undefined,
		max = undefined,
		step = undefined,
		oninput,
		onchange,
		onblur,
		onkeydown
	} = $props();
</script>

<div class="w-full {className}">
	{#if label}
		<label for={id} class="gac-label">
			{label}
			{#if required}<span class="text-danger ml-0.5">*</span>{/if}
		</label>
	{/if}
	<input
		{id}
		{type}
		{placeholder}
		{required}
		{disabled}
		{min}
		{max}
		{step}
		autocomplete={autocomplete ?? null}
		bind:value
		{oninput}
		{onchange}
		{onblur}
		{onkeydown}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error && id ? `${id}-error` : undefined}
		class="gac-input {error ? 'gac-input--error' : ''} {inputClass}"
	/>
	{#if error}
		<p id={id ? `${id}-error` : undefined} class="mt-1 text-xs text-danger">{error}</p>
	{/if}
</div>
