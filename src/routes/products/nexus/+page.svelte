<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { ClientsService } from '$lib/services/clients';
	import { nexusServiceBadge, nexusServiceDetailLine } from '$lib/utils/nexusStatus';
	import { onMount } from 'svelte';

	/** @type {any[]} */
	let clients = $state([]);
	let isLoading = $state(false);
	let searchTerm = $state('');

	// Counters
	let deviceCount = $state(0);
	let clientCount = $state(0);

	// Filtered clients (empty for now)
	let filteredClients = $derived(
		clients.filter((client) => client.name.toLowerCase().includes(searchTerm.toLowerCase()))
	);

	onMount(async () => {
		try {
			// Fetch clients (accounts) and stats in parallel
			const [accountsData, statsData] = await Promise.all([
				// @ts-ignore
				ClientsService.getAll({ limit: 50 }),
				ClientsService.getStats()
			]);

			// @ts-ignore
			const fetchedAccounts = accountsData || [];
			/** @type {any} */
			const stats = statsData || { accounts: { total: 0 }, devices: { total: 0 } };

			// Update counters from stats
			deviceCount = stats.devices?.total || 0;
			clientCount = stats.accounts?.total || 0;

			// Format accounts for display
			clients = fetchedAccounts.map((/** @type {any} */ account) => ({
				id: account.id,
				name: account.account_name,
				billingEmail: account.billing_email,
				ownerEmail: account.owner_email,
				status: account.status,
				nexusServiceStatus: account.nexus_service_status,
				nexusDetail: nexusServiceDetailLine(account),
				nexusBadge: nexusServiceBadge(account.nexus_service_status),
				totalUsers: account.total_users || 0,
				totalOrganizations: account.total_organizations || 0,
				formattedCreated: new Date(account.created_at).toLocaleDateString(),
				formattedUpdated: new Date(account.updated_at).toLocaleDateString()
			}));
		} catch (error) {
			console.error('Error fetching dashboard data:', error);
		}
	});
</script>

<div class="flex min-h-screen flex-col bg-app text-app">
	<Topbar title="Nexus / Dashboard">
		<a href="/products/nexus/devices/create">
			<Button variant="primary" size="sm">
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
					class="mr-2"><path d="M5 12h14" /><path d="M12 5v14" /></svg
				>
				Nuevo Dispositivo
			</Button>
		</a>
	</Topbar>

	<div class="space-y-6 p-8">
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			<a href="/products/nexus/devices" class="block transition-transform hover:scale-[1.02]">
				<Card hover class="flex cursor-pointer items-center justify-between p-6">
					<div>
						<p class="text-sm font-medium text-app-muted">Total Equipos</p>
						<p class="text-3xl font-bold text-app">{deviceCount}</p>
					</div>
					<div
						class="rounded-full p-3"
						style="background: var(--color-accent-soft); color: var(--color-accent)"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></svg
						>
					</div>
				</Card>
			</a>
			<Card class="flex items-center justify-between p-6">
				<div>
					<p class="text-sm font-medium text-app-muted">Total Clientes</p>
					<p class="text-3xl font-bold text-app">{clientCount}</p>
				</div>
				<div
					class="rounded-full p-3"
					style="background: var(--color-success-bg); color: var(--color-success)"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle
							cx="9"
							cy="7"
							r="4"
						/><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg
					>
				</div>
			</Card>
			<a href="/products/plans" class="block transition-transform hover:scale-[1.02]">
				<Card hover class="flex cursor-pointer items-center justify-between p-6">
					<div>
						<p class="text-sm font-medium text-app-muted">Planes de Servicio</p>
						<p class="text-3xl font-bold text-app">Gestionar</p>
					</div>
					<div
						class="rounded-full p-3"
						style="background: var(--color-info-bg); color: var(--color-info)"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line
								x1="3"
								y1="10"
								x2="21"
								y2="10"
							/><line x1="9" y1="22" x2="9" y2="10" /></svg
						>
					</div>
				</Card>
			</a>
		</div>

		<Card class="overflow-hidden">
			<div class="p-4" style="border-bottom: 1px solid var(--color-border)">
				<div class="w-full md:w-96">
					<Input placeholder="Buscar cliente..." bind:value={searchTerm} />
				</div>
			</div>
			<div class="overflow-x-auto">
				<table class="gac-table">
					<thead>
						<tr>
							<th>Nombre</th>
							<th>Billing Email</th>
							<th>Estatus cuenta</th>
							<th>Servicio Nexus</th>
							<th>Creado</th>
							<th>Actualizado</th>
							<th class="text-center">Usuarios</th>
							<th class="text-center">Organizaciones</th>
							<th class="text-right">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#if isLoading}
							<tr>
								<td colspan="9" class="px-6 py-8 text-center text-app-muted">
									Cargando clientes...
								</td>
							</tr>
						{:else if filteredClients.length === 0}
							<tr>
								<td colspan="9" class="px-6 py-8 text-center text-app-muted">
									No se encontraron clientes.
								</td>
							</tr>
						{:else}
							{#each filteredClients as client (client.id)}
								<tr
									class="cursor-pointer"
									onclick={() => (window.location.href = `/products/nexus/accounts/${client.id}`)}
								>
									<td>
										<div class="font-medium text-app">{client.name}</div>
										<div class="text-xs text-app-muted">{client.ownerEmail || ''}</div>
									</td>
									<td>{client.billingEmail || '-'}</td>
									<td>
										<span
											class={`gac-badge ${
												client.status === 'ACTIVE'
													? 'gac-badge-success'
													: client.status === 'PENDING'
														? 'gac-badge-warning'
														: client.status === 'SUSPENDED'
															? 'gac-badge-danger'
															: 'gac-badge-neutral'
											}`}
										>
											{client.status}
										</span>
									</td>
									<td>
										<span class={client.nexusBadge.badgeClass}>{client.nexusBadge.label}</span>
										<div class="mt-1 max-w-[220px] truncate text-xs text-app-muted">
											{client.nexusDetail}
										</div>
									</td>
									<td>{client.formattedCreated}</td>
									<td>{client.formattedUpdated}</td>
									<td class="text-center">{client.totalUsers}</td>
									<td class="text-center">{client.totalOrganizations}</td>
									<td class="text-right">
										<Button variant="ghost" size="sm">Ver Detalle</Button>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</Card>
	</div>
</div>
