<script>
	import Button from './Button.svelte';

	/** @type {{
	 * 	isOpen?: boolean,
	 * 	title?: string,
	 * 	message?: string,
	 * 	confirmLabel?: string,
	 * 	cancelLabel?: string,
	 * 	variant?: 'danger' | 'info',
	 * 	onConfirm?: () => void | Promise<void>,
	 * 	onCancel?: () => void
	 * }} */
	let {
		isOpen = $bindable(false),
		title = 'Confirmar acción',
		message = '',
		confirmLabel = 'Confirmar',
		cancelLabel = 'Cancelar',
		variant = 'danger',
		onConfirm = () => {},
		onCancel
	} = $props();

	async function handleConfirm() {
		try {
			await onConfirm();
		} finally {
			isOpen = false;
		}
	}

	function handleCancel() {
		onCancel?.();
		isOpen = false;
	}

	/** @param {KeyboardEvent} event */
	function handleKeydown(event) {
		if (event.key === 'Escape') {
			event.preventDefault();
			handleCancel();
		}
	}
</script>

<svelte:window onkeydown={isOpen ? handleKeydown : undefined} />

{#if isOpen}
	<div
		class="gac-modal-backdrop"
		role="dialog"
		aria-modal="true"
		aria-labelledby="confirm-dialog-title"
		onclick={handleCancel}
		onkeydown={(e) => e.key === 'Enter' && handleCancel()}
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="gac-modal p-6 space-y-4"
			role="document"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			tabindex="-1"
		>
			<div class="flex items-start gap-3">
				<div
					class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center {variant ===
					'danger'
						? 'bg-app-tertiary text-danger'
						: 'bg-app-tertiary text-info'}"
					aria-hidden="true"
				>
					{#if variant === 'danger'}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path
								d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
							/>
							<line x1="12" y1="9" x2="12" y2="13" />
							<line x1="12" y1="17" x2="12.01" y2="17" />
						</svg>
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="16" x2="12" y2="12" />
							<line x1="12" y1="8" x2="12.01" y2="8" />
						</svg>
					{/if}
				</div>
				<div class="flex-1">
					<h3 id="confirm-dialog-title" class="text-lg font-semibold text-app">{title}</h3>
					{#if message}
						<p class="mt-2 text-sm text-app-secondary">{message}</p>
					{/if}
				</div>
			</div>

			<div class="flex justify-end gap-3 pt-2">
				<Button variant="outline" size="sm" onclick={handleCancel}>{cancelLabel}</Button>
				<Button
					variant={variant === 'danger' ? 'danger' : 'primary'}
					size="sm"
					onclick={handleConfirm}
				>
					{confirmLabel}
				</Button>
			</div>
		</div>
	</div>
{/if}
