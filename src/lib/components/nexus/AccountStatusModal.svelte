<script>
	import Button from '$lib/components/ui/Button.svelte';
	import { ClientsService } from '$lib/services/clients';

	/**
	 * @typedef {Object} SubaccountItem
	 * @property {string} id
	 * @property {string} [account_name]
	 * @property {string} [name]
	 * @property {string} status
	 * @property {string} [account_type]
	 * @property {string | null} [parent_account_id]
	 */

	/**
	 * @type {{
	 * 	isOpen?: boolean,
	 * 	targetStatus?: 'ACTIVE' | 'SUSPENDED',
	 * 	account?: { id: string, name?: string, account_name?: string, account_type?: string, status?: string } | null,
	 * 	organizationsCount?: number,
	 * 	onConfirm?: (payload: { status: 'ACTIVE' | 'SUSPENDED', includeSubaccounts: boolean, reason?: string }) => Promise<void> | void,
	 * 	onClose?: () => void
	 * }}
	 */
	let {
		isOpen = $bindable(false),
		targetStatus = 'SUSPENDED',
		account = null,
		organizationsCount = 0,
		onConfirm = () => {},
		onClose = () => {}
	} = $props();

	let reason = $state('');
	let includeSubaccounts = $state(false);
	/** @type {SubaccountItem[]} */
	let subaccounts = $state([]);
	let isLoadingSubaccounts = $state(false);
	let isSubmitting = $state(false);
	let prevOpen = $state(false);
	/** @type {HTMLDivElement | undefined} */
	let dialog = $state();

	const isReseller = $derived(account?.account_type === 'RESELLER');
	const isSuspending = $derived(targetStatus === 'SUSPENDED');

	$effect(() => {
		if (isOpen && !prevOpen) {
			prevOpen = true;
			reason = '';
			includeSubaccounts = false;
			subaccounts = [];
			isSubmitting = false;

			if (account?.account_type === 'RESELLER' && account?.id) {
				isLoadingSubaccounts = true;
				ClientsService.getSubaccounts(account.id)
					.then((data) => {
						subaccounts = Array.isArray(data) ? data : [];
					})
					.catch((err) => {
						console.error('Error cargando subcuentas:', err);
						subaccounts = [];
					})
					.finally(() => {
						isLoadingSubaccounts = false;
					});
			}

			queueMicrotask(() => {
				const focusable = dialog?.querySelector('button:not([disabled]), textarea, input');
				if (focusable instanceof HTMLElement) focusable.focus();
			});
		} else if (!isOpen && prevOpen) {
			prevOpen = false;
		}
	});

	function handleClose() {
		if (isSubmitting) return;
		isOpen = false;
		onClose?.();
	}

	async function handleSubmit() {
		if (isSubmitting) return;
		isSubmitting = true;
		try {
			await onConfirm({
				status: targetStatus,
				includeSubaccounts: Boolean(isReseller && includeSubaccounts),
				reason: reason.trim() || undefined
			});
			isOpen = false;
		} finally {
			isSubmitting = false;
		}
	}

	/** @param {KeyboardEvent} event */
	function handleKeydown(event) {
		if (event.key === 'Escape') {
			event.preventDefault();
			handleClose();
			return;
		}

		if (event.key !== 'Tab' || !dialog) return;
		const focusables = dialog.querySelectorAll(
			'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
		);
		if (focusables.length === 0) return;
		const first = /** @type {HTMLElement} */ (focusables[0]);
		const last = /** @type {HTMLElement} */ (focusables[focusables.length - 1]);
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}
</script>

<svelte:window onkeydown={isOpen ? handleKeydown : undefined} />

{#if isOpen}
	<div class="gac-modal-backdrop" role="presentation" onclick={handleClose}>
		<div
			class="gac-modal max-w-lg overflow-hidden"
			bind:this={dialog}
			role="dialog"
			aria-modal="true"
			aria-labelledby="status-modal-title"
			aria-describedby="status-modal-description"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			tabindex="-1"
		>
			<!-- Header -->
			<div
				class="flex items-start gap-3 p-4"
				style={isSuspending
					? 'background: var(--color-danger-bg); border-bottom: 1px solid color-mix(in srgb, var(--color-danger) 35%, transparent)'
					: 'background: var(--color-info-bg); border-bottom: 1px solid color-mix(in srgb, var(--color-info) 35%, transparent)'}
			>
				<span class="shrink-0 {isSuspending ? 'text-danger' : 'text-info'}" aria-hidden="true">
					{#if isSuspending}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="22"
							height="22"
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
							width="22"
							height="22"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
							<path d="M3 3v5h5" />
							<path d="m9 12 2 2 4-4" />
						</svg>
					{/if}
				</span>
				<div>
					<h2 id="status-modal-title" class="text-base font-semibold text-app">
						{isSuspending ? 'Suspender cuenta' : 'Reactivar cuenta'}
					</h2>
					<p class="text-xs text-app-muted">
						{account?.account_name || account?.name || 'Cuenta'}
					</p>
				</div>
			</div>

			<!-- Content -->
			<div class="space-y-4 p-6">
				<!-- Context message -->
				<p id="status-modal-description" class="text-sm leading-relaxed text-app-secondary">
					{#if isSuspending}
						Todas las organizaciones de esta cuenta ({organizationsCount}) dejarán de tener
						servicio. Sus usuarios solo podrán entrar a facturación. Se cerrará el acceso de las
						apps y se apagarán los enlaces de ubicación compartidos.
					{:else}
						Las organizaciones volverán a tener servicio. Los enlaces compartidos que se apagaron no
						vuelven.
					{/if}
				</p>

				<!-- Reseller subaccounts option -->
				{#if isReseller}
					<div
						class="space-y-3 rounded-lg p-3.5"
						style="background: var(--color-bg-tertiary); border: 1px solid var(--color-border)"
					>
						<label
							class="flex items-center gap-2.5 cursor-pointer select-none text-sm font-medium text-app"
						>
							<input
								type="checkbox"
								bind:checked={includeSubaccounts}
								disabled={isLoadingSubaccounts}
								class="h-4 w-4 rounded border-border text-accent-primary focus:ring-accent-primary"
							/>
							<span>
								{#if isLoadingSubaccounts}
									Cargando subcuentas...
								{:else}
									Aplicar también a sus {subaccounts.length} subcuentas
								{/if}
							</span>
						</label>

						{#if includeSubaccounts}
							<!-- Warning if reactivating -->
							{#if !isSuspending}
								<div
									class="flex items-start gap-2.5 rounded-md p-3 text-xs"
									style="background: var(--color-warning-bg); border: 1px solid color-mix(in srgb, var(--color-warning) 30%, transparent); color: var(--color-warning)"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="shrink-0 mt-0.5"
										aria-hidden="true"
									>
										<path
											d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
										/>
										<line x1="12" y1="9" x2="12" y2="13" />
										<line x1="12" y1="17" x2="12.01" y2="17" />
									</svg>
									<p class="font-medium leading-relaxed">
										También se reactivarán las subcuentas que estén suspendidas por su propia cuenta
									</p>
								</div>
							{/if}

							<!-- Subaccounts list -->
							<div class="space-y-1.5">
								<p class="text-xs font-medium text-app-muted">Subcuentas incluidas:</p>
								<div
									class="max-h-40 overflow-y-auto space-y-1.5 rounded-md border p-2"
									style="border-color: var(--color-border); background: var(--color-bg-secondary)"
								>
									{#if subaccounts.length === 0}
										<p class="py-2 text-center text-xs text-app-muted">
											Esta cuenta no tiene subcuentas asociadas.
										</p>
									{:else}
										{#each subaccounts as sub (sub.id)}
											{@const isSubSuspended = sub.status === 'SUSPENDED'}
											<div
												class="flex items-center justify-between rounded px-2.5 py-1.5 text-xs transition-colors {isSubSuspended
													? 'border border-danger/40 bg-danger/10 text-danger'
													: 'bg-app-tertiary text-app'}"
											>
												<span class="truncate font-medium">
													{sub.account_name || sub.name || sub.id}
												</span>
												<span
													class="shrink-0 gac-badge {sub.status === 'ACTIVE'
														? 'gac-badge-success'
														: sub.status === 'SUSPENDED'
															? 'gac-badge-danger font-semibold'
															: 'gac-badge-neutral'}"
												>
													{sub.status || '—'}
												</span>
											</div>
										{/each}
									{/if}
								</div>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Motivo field -->
				<div class="space-y-1.5">
					<div class="flex items-center justify-between">
						<label for="status-reason" class="gac-label mb-0">Motivo (opcional)</label>
						<span class="text-xs text-app-muted">{reason.length}/500</span>
					</div>
					<textarea
						id="status-reason"
						bind:value={reason}
						maxlength="500"
						rows="3"
						placeholder="Escribe la razón de este cambio para auditoría..."
						class="gac-input resize-none"
					></textarea>
				</div>
			</div>

			<!-- Footer -->
			<div
				class="flex items-center justify-end gap-3 p-4"
				style="border-top: 1px solid var(--color-border); background: var(--color-bg-secondary)"
			>
				<Button variant="ghost" size="sm" onclick={handleClose} disabled={isSubmitting}>
					Cancelar
				</Button>
				{#if isSuspending}
					<Button variant="danger" size="sm" onclick={handleSubmit} disabled={isSubmitting}>
						{isSubmitting ? 'Suspendiendo...' : 'Suspender cuenta'}
					</Button>
				{:else}
					<Button variant="primary" size="sm" onclick={handleSubmit} disabled={isSubmitting}>
						{isSubmitting ? 'Reactivando...' : 'Reactivar cuenta'}
					</Button>
				{/if}
			</div>
		</div>
	</div>
{/if}
