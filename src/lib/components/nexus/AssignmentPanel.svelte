<script>
	import { ClientsService } from '$lib/services/clients';
	import { DevicesService } from '$lib/services/devices';
	import Button from '$lib/components/ui/Button.svelte';

	/** @type {{ selectedDevices: string[], onClose: () => void, onSuccess: () => void }} */
	let { selectedDevices = [], onClose, onSuccess } = $props();

	/** @type {any[]} */
	let accounts = $state([]);
	/** @type {any[]} */
	let organizations = $state([]);
	let accountSearch = $state('');

	let loadingAccounts = $state(false);
	let loadingOrgs = $state(false);
	let assigning = $state(false);

	/** @type {string | null} */
	let selectedAccount = $state(null);
	/** @type {string | null} */
	let selectedOrg = $state(null);

	let progress = $state(0);
	let total = $derived(selectedDevices.length);
	let successCount = $state(0);
	let failCount = $state(0);

	// Derived filtered accounts
	let filteredAccounts = $derived(
		accounts.filter((account) => {
			const term = accountSearch.toLowerCase();
			const name = (account.account_name || '').toLowerCase();
			const email = (account.billing_email || '').toLowerCase();
			return name.includes(term) || email.includes(term);
		})
	);

	$effect(() => {
		loadAccounts();
	});

	$effect(() => {
		if (selectedAccount) {
			loadOrganizations(selectedAccount);
			selectedOrg = null;
		} else {
			organizations = [];
			selectedOrg = null;
		}
	});

	async function loadAccounts() {
		loadingAccounts = true;
		try {
			const response = await ClientsService.getAll({ limit: 100 });
			// API returns array directly based on user feedback
			// @ts-ignore
			accounts = Array.isArray(response) ? response : response.accounts || [];
		} catch (e) {
			console.error('Error loading accounts:', e);
		} finally {
			loadingAccounts = false;
		}
	}

	/** @param {string} accountId */
	async function loadOrganizations(accountId) {
		loadingOrgs = true;
		try {
			organizations = await ClientsService.getOrganizations(accountId);
		} catch (e) {
			console.error('Error loading organizations:', e);
		} finally {
			loadingOrgs = false;
		}
	}

	async function handleAssign() {
		if (!selectedOrg || selectedDevices.length === 0) return;

		assigning = true;
		progress = 0;
		successCount = 0;
		failCount = 0;

		for (const deviceId of selectedDevices) {
			try {
				// User requested 'asignado' or similar status update.
				// Based on standard flow: organization assignment -> 'preparado'
				await DevicesService.assignOrganization(deviceId, selectedOrg, 'preparado');
				successCount++;
			} catch (e) {
				console.error(`Failed to assign device ${deviceId}:`, e);
				failCount++;
			}
			progress++;
		}

		assigning = false;
		if (onSuccess) onSuccess();
	}
</script>

<div
	class="flex h-full flex-col"
	style="background: var(--color-bg-primary); border-top: 1px solid var(--color-border); font-family: var(--font-sans)"
>
	<div
		class="z-10 flex items-center justify-between px-6 py-4"
		style="background: var(--color-bg-secondary); border-bottom: 1px solid var(--color-border); box-shadow: var(--shadow-sm)"
	>
		<div>
			<h3 class="text-lg font-bold text-app">Asignar Dispositivos</h3>
			<p class="text-sm text-app-muted">
				{selectedDevices.length} dispositivos seleccionados para asignación
			</p>
		</div>
		<Button variant="ghost" size="sm" onclick={onClose}>Cancelar</Button>
	</div>

	<div class="p-6 flex-1 overflow-y-auto">
		{#if assigning || (progress > 0 && progress === total)}
			<div
				class="mx-auto max-w-md space-y-6 py-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500"
			>
				<div class="relative mx-auto h-16 w-16">
					{#if assigning}
						<div
							class="absolute inset-0 rounded-full border-4"
							style="border-color: var(--color-border)"
						></div>
						<div
							class="absolute inset-0 animate-spin rounded-full border-4 border-t-transparent"
							style="border-color: var(--color-accent); border-top-color: transparent"
						></div>
					{:else if failCount === 0}
						<div
							class="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
							style="background: var(--color-success-bg); color: var(--color-success)"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="32"
								height="32"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="3"
								stroke-linecap="round"
								stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg
							>
						</div>
					{:else}
						<div
							class="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
							style="background: var(--color-warning-bg); color: var(--color-warning)"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="32"
								height="32"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								><path
									d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
								/><line x1="12" y1="9" x2="12" y2="13" /><line
									x1="12"
									y1="17"
									x2="12.01"
									y2="17"
								/></svg
							>
						</div>
					{/if}
				</div>

				<h4 class="text-xl font-semibold text-app">
					{assigning ? 'Asignando dispositivos...' : 'Proceso finalizado'}
				</h4>

				<div class="space-y-2">
					<div
						class="h-2 w-full overflow-hidden rounded-full"
						style="background: var(--color-bg-tertiary)"
					>
						<div
							class="h-2 rounded-full transition-all duration-300 ease-out"
							style="background: var(--color-accent); width: {(progress / total) * 100}%"
						></div>
					</div>
					<div
						class="flex justify-between font-mono text-xs font-medium text-app-muted"
					>
						<span>0%</span>
						<span>{((progress / total) * 100).toFixed(0)}%</span>
						<span>100%</span>
					</div>
				</div>

				{#if !assigning}
					<div class="mt-4 flex justify-center gap-6">
						<div class="text-center">
							<div class="text-2xl font-bold" style="color: var(--color-success)">
								{successCount}
							</div>
							<div
								class="text-xs font-semibold uppercase tracking-wide text-app-muted"
							>
								Exitosos
							</div>
						</div>
						{#if failCount > 0}
							<div class="text-center">
								<div class="text-2xl font-bold" style="color: var(--color-danger)">
									{failCount}
								</div>
								<div
									class="text-xs font-semibold uppercase tracking-wide text-app-muted"
								>
									Fallidos
								</div>
							</div>
						{/if}
					</div>
					<div class="pt-8">
						<Button variant="primary" class="min-w-[120px]" onclick={onClose}>Hecho</Button>
					</div>
				{/if}
			</div>
		{:else}
			<div class="mx-auto grid h-[500px] max-w-4xl grid-cols-1 gap-8 lg:grid-cols-2">
				<div class="gac-panel-solid flex h-full flex-col overflow-hidden">
					<div
						class="p-4"
						style="background: var(--color-bg-tertiary); border-bottom: 1px solid var(--color-border)"
					>
						<label
							for="account-search"
							class="mb-2 block text-xs font-semibold uppercase tracking-wider text-app-muted"
						>
							1. Seleccionar Cliente
						</label>
						<div class="relative">
							<input
								id="account-search"
								type="text"
								bind:value={accountSearch}
								placeholder="Buscar por nombre, email..."
								class="gac-input w-full pl-9"
							/>
							<svg
								class="absolute left-3 top-2.5"
								style="color: var(--color-text-muted)"
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg
							>
						</div>
					</div>

					<div class="flex-1 overflow-y-auto p-2">
						{#if loadingAccounts}
							<div class="flex h-40 flex-col items-center justify-center space-y-3">
								<div
									class="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
									style="border-color: var(--color-accent); border-top-color: transparent"
								></div>
								<span class="text-xs font-medium text-app-muted">Cargando clientes...</span>
							</div>
						{:else if filteredAccounts.length === 0}
							<div class="px-4 py-10 text-center">
								<p class="text-sm text-app-muted">
									No se encontraron cuentas que coincidan con "{accountSearch}".
								</p>
							</div>
						{:else}
							<div class="space-y-1">
								{#each filteredAccounts as account (account.id)}
									<button
										class="group relative w-full rounded-lg p-3 text-left transition-all duration-200"
										style={selectedAccount === account.id
											? 'background: var(--color-accent-soft); border: 1px solid var(--color-accent); box-shadow: var(--shadow-sm)'
											: 'background: transparent; border: 1px solid transparent'}
										onclick={() => (selectedAccount = account.id)}
									>
										<div class="flex items-start justify-between">
											<div>
												<div class="text-sm font-medium text-app">{account.account_name}</div>
												<div class="mt-0.5 font-mono text-xs text-app-muted">
													{account.billing_email}
												</div>
											</div>
											{#if selectedAccount === account.id}
												<div
													style="color: var(--color-accent)"
													class="animate-in zoom-in duration-200"
												>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="16"
														height="16"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="3"
														stroke-linecap="round"
														stroke-linejoin="round"
														><polyline points="20 6 9 17 4 12" /></svg
													>
												</div>
											{/if}
										</div>
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<div class="flex h-full flex-col space-y-4">
					<div
						class="gac-panel-solid flex flex-1 flex-col overflow-hidden transition-opacity duration-300 {selectedAccount
							? 'opacity-100'
							: 'pointer-events-none opacity-50 grayscale'}"
					>
						<div
							class="p-4"
							style="background: var(--color-bg-tertiary); border-bottom: 1px solid var(--color-border)"
						>
							<p class="block text-xs font-semibold uppercase tracking-wider text-app-muted">
								2. Seleccionar Organización
							</p>
						</div>

						<div class="flex-1 overflow-y-auto p-2">
							{#if loadingOrgs}
								<div class="flex h-40 flex-col items-center justify-center space-y-3">
									<div
										class="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
										style="border-color: var(--color-accent); border-top-color: transparent"
									></div>
									<span class="text-xs font-medium text-app-muted">
										Buscando organizaciones...
									</span>
								</div>
							{:else if !selectedAccount}
								<div
									class="flex h-full flex-col items-center justify-center p-6 text-center text-app-muted"
								>
									<svg
										class="mb-3 opacity-20"
										xmlns="http://www.w3.org/2000/svg"
										width="48"
										height="48"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line
											x1="16"
											y1="2"
											x2="16"
											y2="6"
										/><line x1="8" y1="2" x2="8" y2="6" /><line
											x1="3"
											y1="10"
											x2="21"
											y2="10"
										/></svg
									>
									<p class="text-sm">Seleccione un cliente primero</p>
								</div>
							{:else if organizations.length === 0}
								<div
									class="m-2 flex h-full flex-col items-center justify-center rounded-lg p-6 text-center"
									style="background: var(--color-bg-tertiary); border: 1px dashed var(--color-border); color: var(--color-text-muted)"
								>
									<p class="text-sm font-medium">Sin organizaciones</p>
									<p class="mt-1 text-xs">Este cliente no tiene organizaciones activas.</p>
								</div>
							{:else}
								<div class="space-y-2">
									{#each organizations as org (org.id)}
										<button
											class="group relative w-full rounded-lg p-4 text-left transition-all duration-200"
											style={selectedOrg === org.id
												? 'background: var(--color-accent-soft); border: 1px solid var(--color-accent); box-shadow: var(--shadow-md)'
												: 'background: transparent; border: 1px solid var(--color-border)'}
											onclick={() => (selectedOrg = org.id)}
										>
											<div class="flex items-center gap-3">
												<div
													class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
													style={selectedOrg === org.id
														? 'background: var(--color-accent-soft); color: var(--color-accent)'
														: 'background: var(--color-bg-tertiary); color: var(--color-text-muted)'}
												>
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
														><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path
															d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"
														/></svg
													>
												</div>
												<div class="min-w-0 flex-1">
													<div class="truncate text-sm font-semibold text-app">
														{org.name}
													</div>
													{#if org.billing_email}
														<div class="truncate text-xs text-app-muted">
															{org.billing_email}
														</div>
													{/if}
												</div>
												{#if selectedOrg === org.id}
													<div class="absolute right-2 top-2 flex h-2 w-2">
														<span
															class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
															style="background: var(--color-accent)"
														></span>
														<span
															class="relative inline-flex h-2 w-2 rounded-full"
															style="background: var(--color-accent)"
														></span>
													</div>
												{/if}
											</div>
										</button>
									{/each}
								</div>
							{/if}
						</div>
					</div>

					<div class="pt-2">
						<Button
							variant="primary"
							class="h-12 w-full text-base font-medium transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
							disabled={!selectedOrg || selectedDevices.length === 0}
							onclick={handleAssign}
						>
							{#if !selectedOrg}
								<span>Complete la selección</span>
							{:else}
								<span class="flex items-center justify-center gap-2">
									Asignar {selectedDevices.length} Dispositivos a {organizations.find(
										(o) => o.id === selectedOrg
									)?.name}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg
									>
								</span>
							{/if}
						</Button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
