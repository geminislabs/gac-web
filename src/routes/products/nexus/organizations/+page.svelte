<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { OrganizationsService } from '$lib/services/organizations';
	import { toast } from '$lib/stores/toast';

	/** @type {import('$lib/services/organizations').Organization[]} */
	let organizations = $state([]);
	let isLoading = $state(false);
	let searchTerm = $state('');
	let statusFilter = $state('');

	let filtered = $derived(() => {
		const q = searchTerm.trim().toLowerCase();
		return organizations.filter((org) => {
			const matchesSearch =
				!q ||
				org.name.toLowerCase().includes(q) ||
				(org.account_id || '').toLowerCase().includes(q);
			const matchesStatus = !statusFilter || org.status === statusFilter;
			return matchesSearch && matchesStatus;
		});
	});

	async function loadOrganizations() {
		isLoading = true;
		try {
			organizations = await OrganizationsService.list({
				limit: 200,
				status: statusFilter || undefined,
				search: searchTerm.trim() || undefined
			});
		} catch (error) {
			console.error('Error loading organizations:', error);
			toast.error('No se pudieron cargar las organizaciones');
			organizations = [];
		} finally {
			isLoading = false;
		}
	}

	/** @param {string} status */
	function statusBadgeClass(status) {
		const s = (status || '').toLowerCase();
		if (s === 'active') return 'gac-badge gac-badge-success';
		if (s === 'suspended' || s === 'deleted') return 'gac-badge gac-badge-danger';
		if (s === 'pending') return 'gac-badge gac-badge-warning';
		return 'gac-badge gac-badge-neutral';
	}

	$effect(() => {
		statusFilter;
		loadOrganizations();
	});
</script>

<div class="flex min-h-screen flex-col bg-app text-app">
	<Topbar title="Organizaciones" subtitle="Raíz operativa de clientes Nexus">
		<a href="/products/nexus/organizations/create">
			<Button variant="primary" size="sm">Nueva organización</Button>
		</a>
	</Topbar>

	<div class="mx-auto w-full max-w-7xl space-y-6 p-6">
		<Card class="p-4">
			<div class="flex flex-wrap items-end gap-4">
				<div class="min-w-[200px] flex-1">
					<Input
						label="Buscar"
						placeholder="Nombre o account_id..."
						bind:value={searchTerm}
						onkeydown={(/** @type {KeyboardEvent} */ e) => e.key === 'Enter' && loadOrganizations()}
					/>
				</div>
				<div>
					<label for="org-status-filter" class="gac-label">Estado</label>
					<select
						id="org-status-filter"
						class="gac-input"
						bind:value={statusFilter}
						onchange={loadOrganizations}
					>
						<option value="">Todos</option>
						<option value="ACTIVE">Activa</option>
						<option value="PENDING">Pendiente</option>
						<option value="SUSPENDED">Suspendida</option>
					</select>
				</div>
				<Button variant="outline" onclick={loadOrganizations}>Buscar</Button>
			</div>
		</Card>

		<Card class="overflow-hidden">
			<div class="overflow-x-auto">
				<table class="gac-table">
					<thead>
						<tr>
							<th>Nombre</th>
							<th>Estado</th>
							<th>Cuenta</th>
							<th>País</th>
							<th>Creada</th>
							<th class="text-right">Acción</th>
						</tr>
					</thead>
					<tbody>
						{#if isLoading}
							<tr>
								<td colspan="6" class="px-4 py-8 text-center text-app-muted">Cargando...</td>
							</tr>
						{:else if filtered().length === 0}
							<tr>
								<td colspan="6" class="px-4 py-8 text-center text-app-muted">Sin organizaciones.</td
								>
							</tr>
						{:else}
							{#each filtered() as org (org.id)}
								<tr>
									<td class="font-medium text-app">{org.name}</td>
									<td><span class={statusBadgeClass(org.status)}>{org.status}</span></td>
									<td>
										{#if org.account_id}
											<a
												href={`/products/nexus/accounts/${org.account_id}`}
												class="font-mono text-xs text-accent hover:underline"
											>
												{org.account_id.slice(0, 8)}…
											</a>
										{:else}
											—
										{/if}
									</td>
									<td>{org.country || '—'}</td>
									<td class="text-sm text-app-secondary">
										{org.created_at ? new Date(org.created_at).toLocaleDateString() : '—'}
									</td>
									<td class="text-right">
										<a href={`/products/nexus/organizations/${org.id}`}>
											<Button variant="ghost" size="sm">Ver</Button>
										</a>
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
