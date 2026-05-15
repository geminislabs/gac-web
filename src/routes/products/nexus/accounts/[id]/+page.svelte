<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { ClientsService } from '$lib/services/clients';
	import { DevicesService } from '$lib/services/devices';
	import { goto } from '$app/navigation';

	let clientId = $derived($page.params.id);

	/** @type {any} */
	let client = $state({});
	/** @type {any[]} */
	let devices = $state([]);
	/** @type {any[]} */
	let units = $state([]);
	let isLoading = $state(true);

	// Fetch data on mount
	onMount(async () => {
		try {
			if (!clientId) return;

			const clientData = await ClientsService.getById(clientId);

			client = {
				...clientData,
				name: clientData.account_name,
				// Ensure formattedCreated is set if we have created_at
				formattedCreated: clientData.created_at
					? new Date(clientData.created_at).toLocaleDateString()
					: '-'
			};

			// DevicesService.getAll uses /api/v1/devices/ (admin).
			// We try to filter by client_id if supported or just gracefully fail if no devices found.
			try {
				const clientDevices = await DevicesService.getAll({ client_id: clientId });
				devices = clientDevices || [];
			} catch (err) {
				console.warn('Could not fetch devices for this account:', err);
				devices = [];
			}
		} catch (error) {
			console.error('Error fetching client details:', error);
		} finally {
			isLoading = false;
		}
	});

	// Placeholder function to add device
	function handleAddDevice() {
		console.log('Add device to client');
	}
</script>

<div class="flex min-h-screen flex-col bg-app text-app">
	<Topbar
		title={isLoading ? 'Cargando...' : `Nexus / Cuentas / ${client?.name || 'Desconocido'}`}
		backUrl="/products/nexus"
	/>

	<div class="space-y-6 p-8">
		<Card class="p-6">
			<h2 class="mb-4 text-lg font-semibold text-app">Información del Cliente</h2>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
				<div>
					<p class="text-sm text-app-muted">Nombre</p>
					<p class="font-medium text-app">{client?.name || '-'}</p>
				</div>
				<div>
					<p class="text-sm text-app-muted">Estatus</p>
					<p class="font-medium">
						<span
							class={`gac-badge ${
								client?.status === 'ACTIVE'
									? 'gac-badge-success'
									: client?.status === 'PENDING'
										? 'gac-badge-warning'
										: client?.status === 'SUSPENDED'
											? 'gac-badge-danger'
											: 'gac-badge-neutral'
							}`}
						>
							{client?.status || '-'}
						</span>
					</p>
				</div>
				<div>
					<p class="text-sm text-app-muted">Creado</p>
					<p class="font-medium text-app">{client?.formattedCreated || '-'}</p>
				</div>
				<div>
					<p class="text-sm text-app-muted">Subscription ID</p>
					<p class="font-mono text-xs font-medium text-app">
						{client?.active_subscription_id || 'Sin suscripción'}
					</p>
				</div>
			</div>
		</Card>

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<Card class="h-full overflow-hidden">
				<div
					class="flex items-center justify-between p-4"
					style="border-bottom: 1px solid var(--color-border)"
				>
					<h3 class="font-semibold text-app">Dispositivos Asignados</h3>
					<Button variant="outline" size="sm" onclick={handleAddDevice}>Asignar Dispositivo</Button>
				</div>
				<div class="overflow-x-auto">
					<table class="gac-table">
						<thead>
							<tr>
								<th>Device ID</th>
								<th>Marca</th>
								<th>Modelo</th>
							</tr>
						</thead>
						<tbody>
							{#if devices.length === 0}
								<tr>
									<td colspan="3" class="px-4 py-6 text-center text-app-muted">
										Sin dispositivos asignados.
									</td>
								</tr>
							{:else}
								{#each devices as device (device.device_id)}
									<tr
										class="cursor-pointer"
										onclick={async () =>
											await goto(`/products/nexus/devices?device_id=${device.device_id}`)}
									>
										<td class="font-medium" style="color: var(--color-accent)">
											{device.device_id}
										</td>
										<td>{device.brand}</td>
										<td>{device.model}</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</Card>

			<Card class="h-full overflow-hidden">
				<div class="p-4" style="border-bottom: 1px solid var(--color-border)">
					<h3 class="font-semibold text-app">Unidades</h3>
				</div>
				<div class="overflow-x-auto">
					<table class="gac-table">
						<thead>
							<tr>
								<th>Nombre</th>
								<th>Placas</th>
								<th>Vehículo</th>
								<th>Dispositivo</th>
							</tr>
						</thead>
						<tbody>
							{#if units.length === 0}
								<tr>
									<td colspan="4" class="px-4 py-6 text-center text-app-muted">
										Sin unidades registradas.
									</td>
								</tr>
							{:else}
								{#each units as unit (unit.name)}
									<tr>
										<td class="font-medium text-app">{unit.name}</td>
										<td>{unit.plate}</td>
										<td>{unit.brand} {unit.model}</td>
										<td class="text-app-muted">{unit.device}</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</Card>
		</div>
	</div>
</div>
