<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { DevicesService } from '$lib/services/devices';
	import { SimsService } from '$lib/services/sims';
	import { onMount } from 'svelte';

	let deviceId = $state('');
	let brand = $state('');
	let model = $state('');
	let firmwareVersion = $state('');
	let notes = $state('');
	let iccid = $state('');
	let carrier = $state('KORE');
	let koreSimId = $state('');
	let koreAccountId = $state('');
	let status = $state('');
	let clientId = $state('');

	let isLoading = $state(true);
	let isSaving = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	/** @type {import('$lib/services/sims').Sim[]} */
	let availableSims = $state([]);
	let showSimSelector = $state(false);
	let isLoadingSims = $state(false);
	let isSyncingKore = $state(false);

	// Estado para asignación/desasignación pendiente (se ejecuta al guardar)
	/** @type {import('$lib/services/sims').Sim | null} */
	let pendingSimToAssign = $state(null);
	let pendingUnassign = $state(false);
	let originalIccid = $state('');
	let showUnassignConfirm = $state(false);

	// Indicador de si hay cambios de SIM pendientes
	let hasSimChanges = $derived(
		pendingSimToAssign !== null || pendingUnassign
	);

	onMount(async () => {
		/** @type {{id: string}} */
		const params = /** @type {any} */ ($page.params);
		const id = params.id;
		if (id) {
			await loadDevice(id);
		}
	});

	/** @param {string} id */
	async function loadDevice(id) {
		isLoading = true;
		errorMessage = '';
		try {
			/** @type {any} */
			const device = await DevicesService.getById(id);
			deviceId = device.device_id;
			brand = device.brand || '';
			model = device.model || '';
			firmwareVersion = device.firmware_version || '';
			notes = device.notes || '';
			iccid = device.iccid || '';
			originalIccid = device.iccid || ''; // Guardar ICCID original
			carrier = device.carrier || 'KORE';
			if (carrier === 'KORE' && device.sim_profile) {
				koreSimId = device.sim_profile.kore_sim_id || '';
				koreAccountId = device.sim_profile.kore_account_id || '';
			} else {
				koreSimId = '';
				koreAccountId = '';
			}
			status = device.status || '';
			clientId = device.client_id || '';
			// Resetear estados pendientes
			pendingSimToAssign = null;
			pendingUnassign = false;
		} catch (error) {
			console.error('Error loading device:', error);
			errorMessage = 'Error al cargar la información del dispositivo.';
		} finally {
			isLoading = false;
		}
	}

	/** @param {SubmitEvent} e */
	async function handleSubmit(e) {
		e.preventDefault();
		isSaving = true;
		errorMessage = '';
		successMessage = '';

		try {
			// 1. Si hay desasignación pendiente, primero desasignar la SIM actual
			if (pendingUnassign && originalIccid) {
				const allSims = await SimsService.getAll();
				const currentSim = allSims.find((s) => s.iccid === originalIccid);
				if (currentSim) {
					await SimsService.unassignFromDevice(currentSim.sim_id);
				}
			}

			// 2. Si hay asignación pendiente, asignar la nueva SIM
			if (pendingSimToAssign) {
				await SimsService.assignToDevice(pendingSimToAssign.sim_id, deviceId);
			}

			// 3. Actualizar el dispositivo (sin datos de SIM, ya que se manejan por separado)
			const payload = {
				brand,
				model,
				firmware_version: firmwareVersion,
				notes,
				status
			};

			await DevicesService.update(deviceId, payload);

			// Actualizar estado original
			originalIccid = iccid;
			pendingSimToAssign = null;
			pendingUnassign = false;

			successMessage = 'Dispositivo actualizado correctamente.';
		} catch (error) {
			console.error('Error updating device:', error);
			errorMessage = /** @type {any} */ (error).message || 'Error al actualizar el dispositivo';
		} finally {
			isSaving = false;
		}
	}

	async function openSimSelector() {
		showSimSelector = true;
		isLoadingSims = true;
		errorMessage = '';
		try {
			availableSims = await SimsService.getUnassigned();
		} catch (error) {
			console.error('Error loading available SIMs:', error);
			errorMessage = 'Error al cargar las SIMs disponibles.';
			availableSims = [];
		} finally {
			isLoadingSims = false;
		}
	}

	function closeSimSelector() {
		showSimSelector = false;
		availableSims = [];
	}

	/** @param {import('$lib/services/sims').Sim} sim */
	function selectSim(sim) {
		// Solo actualizar campos locales, no llamar al API
		// La asignación real se hace al guardar
		pendingSimToAssign = sim;
		iccid = sim.iccid;
		carrier = sim.carrier;
		if (sim.kore_profile) {
			koreSimId = sim.kore_profile.kore_sim_id;
			koreAccountId = sim.kore_profile.kore_account_id || '';
		}
		successMessage = `SIM ${sim.iccid} seleccionada. Haz clic en "Guardar" para confirmar la asignación.`;
		closeSimSelector();
	}

	async function syncFromKore() {
		isSyncingKore = true;
		errorMessage = '';
		try {
			const result = await SimsService.syncFromKore();
			successMessage = `Sincronización completada: ${result.sim_cards_created || 0} SIMs nuevas, ${result.sim_cards_updated || 0} actualizadas.`;
			// Recargar las SIMs disponibles
			availableSims = await SimsService.getUnassigned();
		} catch (error) {
			console.error('Error syncing from KORE:', error);
			errorMessage = /** @type {any} */ (error).message || 'Error al sincronizar con KORE';
		} finally {
			isSyncingKore = false;
		}
	}

	function requestUnassign() {
		// Mostrar modal de confirmación
		showUnassignConfirm = true;
	}

	function cancelUnassign() {
		showUnassignConfirm = false;
	}

	function confirmUnassign() {
		// Marcar como pendiente de desasignar
		pendingUnassign = true;
		pendingSimToAssign = null;
		
		// Limpiar campos de SIM localmente
		iccid = '';
		carrier = 'KORE';
		koreSimId = '';
		koreAccountId = '';
		
		showUnassignConfirm = false;
		successMessage = 'SIM marcada para desasignar. Haz clic en "Guardar" para confirmar.';
	}
</script>

<div class="flex min-h-screen flex-col bg-app text-app">
	<Topbar title={`Nexus / Dispositivo ${deviceId || '...'}`} backUrl="/products/nexus/devices" />

	<div class="mx-auto w-full max-w-2xl p-8">
		<Card class="p-8">
			<h2 class="mb-6 text-xl font-bold text-app">Editar Dispositivo</h2>

			{#if isLoading}
				<div class="p-8 text-center text-app-muted">Cargando información...</div>
			{:else}
				{#if errorMessage}
					<div
						class="mb-6 rounded-md p-4 text-sm"
						style="background: var(--color-danger-bg); color: var(--color-danger); border: 1px solid var(--color-danger)"
					>
						{errorMessage}
					</div>
				{/if}

				{#if successMessage}
					<div
						class="mb-6 rounded-md p-4 text-sm"
						style="background: var(--color-success-bg); color: var(--color-success); border: 1px solid var(--color-success)"
					>
						{successMessage}
					</div>
				{/if}

				<form onsubmit={handleSubmit} class="space-y-6">
					<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
						<div class="col-span-2">
							<p class="gac-label">Device ID</p>
							<div
								class="rounded-md p-2 font-mono"
								style="background: var(--color-bg-tertiary); color: var(--color-text-primary); border: 1px solid var(--color-border)"
							>
								{deviceId}
							</div>
						</div>

						<div class="col-span-2 md:col-span-1">
							<label for="status" class="gac-label">Estatus</label>
							<select id="status" bind:value={status} class="gac-input">
								<option value="nuevo">Nuevo</option>
								<option value="preparado">Preparado</option>
								<option value="enviado">Enviado</option>
								<option value="entregado">Entregado</option>
								<option value="asignado">Asignado</option>
								<option value="devuelto">Devuelto</option>
								<option value="inactivo">Inactivo</option>
							</select>
						</div>

						<div class="col-span-2 md:col-span-1">
							<p class="gac-label">Cliente Asignado</p>
							<div
								class="flex h-10 items-center rounded-md p-2"
								style="background: var(--color-bg-tertiary); color: var(--color-text-primary); border: 1px solid var(--color-border)"
							>
								{clientId || 'Sin asignar'}
							</div>
						</div>

						<Input id="brand" label="Marca" placeholder="Suntech" bind:value={brand} required />
						<Input id="model" label="Modelo" placeholder="ST4330" bind:value={model} required />

						<div class="col-span-2">
							<Input
								id="firmware"
								label="Versión de Firmware"
								placeholder="1.0.0"
								bind:value={firmwareVersion}
							/>
						</div>

						<div class="col-span-2">
							<div class="flex items-end gap-3">
								<div class="flex-1">
									<Input id="iccid" label="ICCID (SIM)" placeholder="89340..." bind:value={iccid} disabled={!!iccid} />
								</div>
								{#if !iccid}
									<Button
										variant="secondary"
										type="button"
										onclick={openSimSelector}
										disabled={isLoadingSims}
									>
										{isLoadingSims ? 'Cargando...' : 'Buscar SIM de KORE'}
									</Button>
								{:else}
									<Button
										variant="danger"
										type="button"
										onclick={requestUnassign}
									>
										Cambiar SIM
									</Button>
								{/if}
							</div>
						</div>

						<div class="col-span-2 pt-4" style="border-top: 1px solid var(--color-border)">
							<h3 class="mb-4 text-lg font-medium text-app">Carrier Profile</h3>
							<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
								<div class="col-span-2 md:col-span-1">
									<label for="carrier" class="gac-label">Carrier</label>
									<select id="carrier" bind:value={carrier} class="gac-input">
										<option value="KORE">Kore</option>
										<option value="other">Other</option>
									</select>
								</div>

								{#if carrier === 'KORE'}
									<div class="col-span-2 md:col-span-1">
										<Input
											id="kore_sim_id"
											label="Kore SIM ID"
											placeholder="HS0ad..."
											bind:value={koreSimId}
										/>
									</div>
									<div class="col-span-2 md:col-span-1">
										<Input
											id="kore_account_id"
											label="Kore Account ID"
											placeholder="CO17..."
											bind:value={koreAccountId}
										/>
									</div>
								{/if}
							</div>
						</div>

						<div class="col-span-2 space-y-2">
							<label for="notes" class="gac-label">Notas</label>
							<textarea id="notes" bind:value={notes} rows="3" class="gac-input w-full"></textarea>
						</div>
					</div>

					<div class="flex justify-end space-x-4 pt-4">
						<Button
							variant="ghost"
							type="button"
							onclick={async () => await goto('/products/nexus/devices')}
						>
							Volver
						</Button>
						<div class="flex items-center gap-3">
							{#if hasSimChanges}
								<span class="text-sm text-yellow-600 dark:text-yellow-400">
									⚠ Cambios de SIM pendientes
								</span>
							{/if}
							<Button variant="primary" type="submit" disabled={isSaving}>
								{isSaving ? 'Guardando...' : 'Guardar Cambios'}
							</Button>
						</div>
					</div>
				</form>
			{/if}
		</Card>
	</div>
</div>

{#if showSimSelector}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-lg shadow-xl"
			style="background: var(--color-bg-secondary)"
		>
			<div
				class="flex items-center justify-between p-4"
				style="border-bottom: 1px solid var(--color-border)"
			>
				<h3 class="text-lg font-semibold text-app">Seleccionar SIM de KORE</h3>
				<button
					type="button"
					onclick={closeSimSelector}
					class="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
					aria-label="Cerrar"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<div class="max-h-96 overflow-y-auto p-4">
				{#if isLoadingSims || isSyncingKore}
					<div class="py-8 text-center text-app-muted">
						{isSyncingKore ? 'Sincronizando con KORE...' : 'Cargando SIMs disponibles...'}
					</div>
				{:else if availableSims.length === 0}
					<div class="py-8 text-center">
						<p class="text-app-muted">No hay SIMs disponibles sin asignar.</p>
						<p class="mt-2 text-sm text-app-muted">Usa el botón "Actualizar desde KORE" para sincronizar.</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each availableSims as sim (sim.sim_id)}
							<button
								type="button"
								onclick={() => selectSim(sim)}
								class="w-full rounded-md p-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
								style="border: 1px solid var(--color-border)"
							>
								<div class="flex items-center justify-between">
									<div>
										<p class="font-mono text-sm font-medium text-app">{sim.iccid}</p>
										{#if sim.kore_profile}
											<p class="text-xs text-app-muted">
												KORE ID: {sim.kore_profile.kore_sim_id}
											</p>
										{/if}
									</div>
									<div class="text-right">
										<span
											class="inline-block rounded px-2 py-0.5 text-xs"
											style="background: var(--color-success-bg); color: var(--color-success)"
										>
											{sim.status}
										</span>
									</div>
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="flex justify-between p-4" style="border-top: 1px solid var(--color-border)">
				<Button
					variant="secondary"
					type="button"
					onclick={syncFromKore}
					disabled={isSyncingKore || isLoadingSims}
				>
					{isSyncingKore ? 'Sincronizando...' : 'Actualizar desde KORE'}
				</Button>
				<Button variant="ghost" type="button" onclick={closeSimSelector}>Cancelar</Button>
			</div>
		</div>
	</div>
{/if}

{#if showUnassignConfirm}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="w-full max-w-md rounded-lg p-6 shadow-xl"
			style="background: var(--color-bg-secondary)"
		>
			<h3 class="mb-4 text-lg font-semibold text-app">Confirmar cambio de SIM</h3>
			<p class="mb-6 text-app-muted">
				¿Estás seguro de que deseas desasignar la SIM actual ({originalIccid})?
				<br /><br />
				Podrás seleccionar una nueva SIM después. Los cambios se aplicarán al hacer clic en "Guardar".
			</p>
			<div class="flex justify-end gap-3">
				<Button variant="ghost" type="button" onclick={cancelUnassign}>Cancelar</Button>
				<Button variant="danger" type="button" onclick={confirmUnassign}>
					Sí, desasignar
				</Button>
			</div>
		</div>
	</div>
{/if}
