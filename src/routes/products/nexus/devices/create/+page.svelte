<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { goto } from '$app/navigation';
	import { DevicesService } from '$lib/services/devices';

	let deviceId = $state('');
	let brand = $state('');
	let model = $state('');
	let firmwareVersion = $state('');
	let notes = $state('');
	let iccid = $state('');
	let carrier = $state('KORE');
	let koreSimId = $state('');
	let koreAccountId = $state('');
	let isLoading = $state(false);
	let errorMessage = $state('');

	/** @param {SubmitEvent} e */
	async function handleSubmit(e) {
		e.preventDefault();
		isLoading = true;
		errorMessage = '';

		const payload = {
			device_id: deviceId,
			brand,
			model,
			firmware_version: firmwareVersion,
			notes,
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
			await DevicesService.create(payload);
			await goto('/products/nexus/devices');
		} catch (error) {
			console.error('Error creating device:', error);
			const msg = /** @type {any} */ (error).message;
			errorMessage =
				msg === 'Failed to fetch' || msg === 'Load failed'
					? 'Error de conexión: No se pudo contactar al servidor. Verifique su conexión o intente más tarde.'
					: msg || 'Error al crear el dispositivo';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="flex min-h-screen flex-col bg-app text-app">
	<Topbar title="Nexus / Nuevo Dispositivo" />

	<div class="mx-auto w-full max-w-2xl p-8">
		<Card class="p-8">
			<h2 class="mb-6 text-xl font-bold text-app">Registrar Dispositivo</h2>

			{#if errorMessage}
				<div
					class="mb-6 rounded-md p-4 text-sm"
					style="background: var(--color-danger-bg); color: var(--color-danger); border: 1px solid var(--color-danger)"
				>
					{errorMessage}
				</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-6">
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div class="col-span-2">
						<Input
							id="device_id"
							label="Device ID"
							placeholder="0980700009"
							bind:value={deviceId}
							required
						/>
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
						Cancelar
					</Button>
					<Button variant="primary" type="submit" disabled={isLoading}>
						{isLoading ? 'Guardando...' : 'Guardar Dispositivo'}
					</Button>
				</div>
			</form>
		</Card>
	</div>
</div>
