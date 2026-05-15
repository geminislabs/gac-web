<script>
	import { page } from '$app/stores';
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	import { onMount } from 'svelte';

	let deviceId = $derived($page.params.id);
	/** @type {any} */
	let device = $state(null);
	/** @type {any[]} */
	let history = $state([]);
	let isLoading = $state(true);
	let showAssignModal = $state(false);
	let selectedClient = $state('');
	let assignLoading = $state(false);

	// Mock data
	const MOCK_DEVICE = {
		device_id: 'NEX-001',
		model: 'Nexus X1',
		provider: 'Telcel',
		batch: 'B-2023-01',
		status: 'active',
		notes: 'Dispositivo de prueba inicial.',
		client: null
	};

	const MOCK_HISTORY = [
		{
			date: '2023-11-20 10:00',
			status: 'created',
			user: 'admin@geminislabs.com',
			notes: 'Dispositivo registrado'
		},
		{
			date: '2023-11-21 14:30',
			status: 'inventory',
			user: 'admin@geminislabs.com',
			notes: 'Ingreso a almacén'
		},
		{
			date: '2023-11-25 09:15',
			status: 'active',
			user: 'admin@geminislabs.com',
			notes: 'Activación remota'
		}
	];

	const MOCK_CLIENTS = [
		{ id: 'CLI-001', name: 'Transportes del Norte' },
		{ id: 'CLI-002', name: 'Logística Express' },
		{ id: 'CLI-003', name: 'Seguridad Privada SA' }
	];

	async function loadDeviceDetails() {
		isLoading = true;
		try {
			// Simulate API fetch
			await new Promise((resolve) => setTimeout(resolve, 600));
			device = { ...MOCK_DEVICE, device_id: deviceId };
			history = MOCK_HISTORY;
		} catch (error) {
			console.error('Error loading device:', error);
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		loadDeviceDetails();
	});

	async function handleAssignClient() {
		assignLoading = true;
		try {
			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 800));

			const clientName = MOCK_CLIENTS.find((c) => c.id === selectedClient)?.name;
			device.client = { id: selectedClient, name: clientName };

			// Add to history
			history = [
				{
					date: new Date().toISOString().replace('T', ' ').substring(0, 16),
					status: device.status,
					user: 'admin@geminislabs.com',
					notes: `Asignado a cliente: ${clientName}`
				},
				...history
			];

			showAssignModal = false;
		} catch (error) {
			console.error('Error assigning client:', error);
		} finally {
			assignLoading = false;
		}
	}

	/** @param {string} status */
	function getStatusBadge(status) {
		switch (status) {
			case 'active':
				return 'gac-badge gac-badge-success';
			case 'inventory':
				return 'gac-badge gac-badge-info';
			case 'maintenance':
				return 'gac-badge gac-badge-warning';
			default:
				return 'gac-badge gac-badge-neutral';
		}
	}
</script>

<div class="relative flex min-h-screen flex-col bg-app text-app">
	<Topbar title={`Nexus / ${deviceId}`}>
		<a href="/products/nexus">
			<Button variant="secondary" size="sm">Volver</Button>
		</a>
	</Topbar>

	<div class="mx-auto w-full max-w-5xl p-8">
		{#if isLoading}
			<div class="flex justify-center py-12">
				<div
					class="h-8 w-8 animate-spin rounded-full border-b-2"
					style="border-color: var(--color-accent)"
				></div>
			</div>
		{:else if device}
			<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
				<div class="space-y-6 lg:col-span-2">
					<Card class="p-6">
						<div class="mb-6 flex items-start justify-between">
							<div>
								<h2 class="text-xl font-bold text-app">{device.model}</h2>
								<p class="text-sm text-app-muted">{device.device_id}</p>
							</div>
							<span class={getStatusBadge(device.status)}>
								{device.status.toUpperCase()}
							</span>
						</div>

						<div class="mb-6 grid grid-cols-2 gap-6">
							<div>
								<p class="text-xs font-medium uppercase tracking-wider text-app-muted">
									Proveedor
								</p>
								<p class="mt-1 text-app">{device.provider}</p>
							</div>
							<div>
								<p class="text-xs font-medium uppercase tracking-wider text-app-muted">Lote</p>
								<p class="mt-1 text-app">{device.batch}</p>
							</div>
						</div>

						<div>
							<p class="mb-1 text-xs font-medium uppercase tracking-wider text-app-muted">
								Notas
							</p>
							<p
								class="rounded-md p-3 text-sm"
								style="background: var(--color-bg-tertiary); color: var(--color-text-secondary); border: 1px solid var(--color-border)"
							>
								{device.notes}
							</p>
						</div>
					</Card>

					<Card class="p-6">
						<h3 class="mb-4 text-lg font-semibold text-app">Historial de Estados</h3>
						<div class="flow-root">
							<ul role="list" class="-mb-8">
								{#each history as event, i (i)}
									<li>
										<div class="relative pb-8">
											{#if i !== history.length - 1}
												<span
													class="absolute top-4 left-4 -ml-px h-full w-0.5"
													style="background: var(--color-border)"
													aria-hidden="true"
												></span>
											{/if}
											<div class="relative flex space-x-3">
												<div>
													<span
														class="flex h-8 w-8 items-center justify-center rounded-full"
														style="background: var(--color-bg-tertiary); border: 1px solid var(--color-border)"
													>
														<svg
															class="h-4 w-4"
															style="color: var(--color-text-muted)"
															xmlns="http://www.w3.org/2000/svg"
															fill="none"
															viewBox="0 0 24 24"
															stroke="currentColor"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
															/>
														</svg>
													</span>
												</div>
												<div class="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
													<div>
														<p class="text-sm font-medium text-app">
															{event.status.toUpperCase()}
															<span class="font-normal text-app-muted">by {event.user}</span>
														</p>
														<p class="mt-1 text-sm text-app-muted">{event.notes}</p>
													</div>
													<div class="whitespace-nowrap text-right text-sm text-app-muted">
														<time datetime={event.date}>{event.date}</time>
													</div>
												</div>
											</div>
										</div>
									</li>
								{/each}
							</ul>
						</div>
					</Card>
				</div>

				<div class="space-y-6">
					<Card class="p-6">
						<h3 class="mb-4 text-sm font-medium uppercase tracking-wider text-app">
							Cliente Asignado
						</h3>
						{#if device.client}
							<div
								class="mb-4 rounded-md p-4"
								style="background: var(--color-accent-soft); border: 1px solid var(--color-accent)"
							>
								<p class="font-semibold" style="color: var(--color-accent)">
									{device.client.name}
								</p>
								<p class="mt-1 text-xs text-app-muted">ID: {device.client.id}</p>
							</div>
							<Button
								variant="secondary"
								class="w-full text-sm"
								onclick={() => (showAssignModal = true)}
							>
								Cambiar Asignación
							</Button>
						{:else}
							<div
								class="mb-4 rounded-md py-6 text-center"
								style="background: var(--color-bg-tertiary); border: 1px dashed var(--color-border)"
							>
								<p class="text-sm text-app-muted">Sin cliente asignado</p>
							</div>
							<Button
								variant="primary"
								class="w-full"
								onclick={() => (showAssignModal = true)}
							>
								Asignar a Cliente
							</Button>
						{/if}
					</Card>

					<Card class="p-6">
						<h3 class="mb-4 text-sm font-medium uppercase tracking-wider text-app">
							Acciones
						</h3>
						<div class="space-y-3">
							<Button variant="secondary" class="w-full justify-start">
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
									class="mr-2"
									><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
										points="7 10 12 15 17 10"
									/><line x1="12" x2="12" y1="15" y2="3" /></svg
								>
								Descargar Reporte
							</Button>
							<Button variant="danger" class="w-full justify-start">
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
									class="mr-2"
									><path d="M3 6h18" /><path
										d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"
									/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg
								>
								Eliminar Dispositivo
							</Button>
						</div>
					</Card>
				</div>
			</div>
		{:else}
			<div class="py-12 text-center">
				<p class="text-app-muted">Dispositivo no encontrado.</p>
			</div>
		{/if}
	</div>

	{#if showAssignModal}
		<div class="gac-modal-backdrop">
			<div class="gac-modal p-6">
				<h3 class="mb-4 text-lg font-bold text-app">Asignar a Cliente</h3>
				<p class="mb-6 text-sm text-app-muted">
					Selecciona un cliente para asignar el dispositivo
					<strong class="text-app">{device.device_id}</strong>.
				</p>

				<div class="mb-6">
					<label for="client-select" class="gac-label">Cliente</label>
					<select id="client-select" bind:value={selectedClient} class="gac-input">
						<option value="" disabled selected>Seleccionar cliente...</option>
						{#each MOCK_CLIENTS as client (client.id)}
							<option value={client.id}>{client.name}</option>
						{/each}
					</select>
				</div>

				<div class="flex justify-end space-x-3">
					<Button variant="ghost" onclick={() => (showAssignModal = false)}>Cancelar</Button>
					<Button
						variant="primary"
						disabled={!selectedClient || assignLoading}
						onclick={handleAssignClient}
					>
						{assignLoading ? 'Asignando...' : 'Confirmar Asignación'}
					</Button>
				</div>
			</div>
		</div>
	{/if}
</div>
