<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { DevicesService } from '$lib/services/devices';
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

		const payload = {
			brand,
			model,
			firmware_version: firmwareVersion,
			notes,
			status,
			iccid: iccid || undefined,
			carrier,
			sim_profile:
				carrier === 'KORE'
					? {
							kore_sim_id: koreSimId,
							kore_account_id: koreAccountId
						}
					: undefined
		};

		try {
			await DevicesService.update(deviceId, payload);
			successMessage = 'Dispositivo actualizado correctamente.';
		} catch (error) {
			console.error('Error updating device:', error);
			errorMessage = /** @type {any} */ (error).message || 'Error al actualizar el dispositivo';
		} finally {
			isSaving = false;
		}
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
							<Input id="iccid" label="ICCID (SIM)" placeholder="89340..." bind:value={iccid} />
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
						<Button variant="primary" type="submit" disabled={isSaving}>
							{isSaving ? 'Guardando...' : 'Guardar Cambios'}
						</Button>
					</div>
				</form>
			{/if}
		</Card>
	</div>
</div>
