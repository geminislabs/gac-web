<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	import { SvelteSet } from 'svelte/reactivity';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { ClientsService } from '$lib/services/clients';
	import { DevicesService } from '$lib/services/devices';
	import { toast } from '$lib/stores/toast';
	import { goto } from '$app/navigation';
	import { nexusServiceBadge, nexusServiceDetailLine } from '$lib/utils/nexusStatus';
	import AccountCommerceSection from '$lib/components/nexus/AccountCommerceSection.svelte';
	import { toCommercialClientId } from '$lib/utils/commercialClient';

	let clientId = $derived($page.params.id);

	/** @type {any} */
	let client = $state({});
	/** @type {any[]} */
	let devices = $state([]);
	/** @type {any[]} */
	let organizations = $state([]);
	let isLoading = $state(true);

	let nexusBadge = $derived(nexusServiceBadge(client?.nexus_service_status));
	let nexusDetail = $derived(nexusServiceDetailLine(client));

	/** @returns {Promise<any[]>} */
	async function loadAccountData() {
		if (!clientId) return [];

		const [clientData, orgs] = await Promise.all([
			ClientsService.getById(clientId),
			ClientsService.getOrganizations(clientId)
		]);

		client = {
			...clientData,
			name: clientData.account_name,
			formattedCreated: clientData.created_at
				? new Date(clientData.created_at).toLocaleDateString()
				: '-'
		};

		organizations = orgs || [];
		return organizations;
	}

	onMount(async () => {
		try {
			if (!clientId) return;
			const orgs = await loadAccountData();
			await loadDevicesForOrganizations(orgs);
		} catch (error) {
			console.error('Error fetching client details:', error);
			toast.error('Error al cargar la cuenta');
		} finally {
			isLoading = false;
		}
	});

	/** @param {any[]} orgs */
	async function loadDevicesForOrganizations(orgs) {
		if (!orgs?.length) {
			devices = [];
			return;
		}
		try {
			const perOrg = await Promise.all(
				orgs.map((/** @type {any} */ org) =>
					DevicesService.getAll({ client_id: org.id }).catch(() => [])
				)
			);
			const seen = new SvelteSet();
			devices = perOrg.flat().filter((/** @type {any} */ d) => {
				if (!d?.device_id || seen.has(d.device_id)) return false;
				seen.add(d.device_id);
				return true;
			});
		} catch (err) {
			console.warn('Could not fetch devices for this account:', err);
			devices = [];
		}
	}

	function handleAddDevice() {
		goto('/products/nexus/devices');
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
				<div class="md:col-span-2">
					<p class="text-sm text-app-muted">ID comercial GAC</p>
					<p class="mt-1 break-all font-mono text-xs text-app">
						{clientId ? toCommercialClientId(clientId) : '—'}
					</p>
					<p class="mt-1 text-xs text-app-muted">Mismo UUID que la cuenta Nexus (client_id)</p>
				</div>
				<div class="md:col-span-2">
					<p class="text-sm text-app-muted">Servicio Nexus</p>
					<p class="mb-1 mt-1">
						<span class={nexusBadge.badgeClass}>{nexusBadge.label}</span>
					</p>
					<p class="text-sm font-medium text-app">{nexusDetail}</p>
					{#if client?.active_organization_name}
						<p class="mt-1 text-xs text-app-muted">
							Org: {client.active_organization_name}
						</p>
					{/if}
					{#if client?.active_subscription_id}
						<p class="mt-1 font-mono text-xs text-app-muted">
							{client.active_subscription_id}
						</p>
					{/if}
				</div>
			</div>
		</Card>

		<Card class="p-6">
			<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="text-lg font-semibold text-app">Organizaciones</h2>
					<p class="mt-1 text-sm text-app-muted">
						Suscripciones Nexus, pagos Siscom y métodos Stripe (solo lectura) se gestionan por
						organización.
					</p>
				</div>
				<a href={`/products/nexus/organizations/create?account_id=${clientId}`}>
					<Button variant="outline" size="sm">Nueva organización</Button>
				</a>
			</div>
			<div class="overflow-x-auto rounded-lg border" style="border-color: var(--color-border)">
				<table class="gac-table">
					<thead>
						<tr>
							<th>Nombre</th>
							<th>Estado</th>
							<th>Nexus</th>
							<th class="text-right">Acción</th>
						</tr>
					</thead>
					<tbody>
						{#if organizations.length === 0}
							<tr>
								<td colspan="4" class="px-4 py-6 text-center text-app-muted">
									Sin organizaciones. Crea una para activar billing Nexus.
								</td>
							</tr>
						{:else}
							{#each organizations as org (org.id)}
								<tr>
									<td class="font-medium text-app">{org.name}</td>
									<td>{org.status || '—'}</td>
									<td class="text-sm">
										{org.nexus_service_status === 'active' ? 'Activo' : 'Inactivo'}
									</td>
									<td class="text-right">
										<a href={`/products/nexus/organizations/${org.id}`}>
											<Button variant="ghost" size="sm">Billing y detalle</Button>
										</a>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</Card>

		{#if clientId}
			<AccountCommerceSection accountId={clientId} />
		{/if}

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-1">
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
		</div>
	</div>
</div>
