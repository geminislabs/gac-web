<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { OrganizationsService } from '$lib/services/organizations';
	import { DevicesService } from '$lib/services/devices';
	import OrganizationBillingPanel from '$lib/components/nexus/OrganizationBillingPanel.svelte';
	import { toast } from '$lib/stores/toast';
	import { nexusServiceBadge, nexusServiceDetailLine } from '$lib/utils/nexusStatus';

	const orgId = $derived($page.params.id);

	/** @type {import('$lib/services/organizations').Organization | null} */
	let organization = $state(null);
	/** @type {Record<string, any>} */
	let nexusStatus = $state({});
	/** @type {import('$lib/services/organizations').OrganizationUser[]} */
	let users = $state([]);
	/** @type {any[]} */
	let devices = $state([]);
	let isLoading = $state(true);
	let isSaving = $state(false);
	let isEditing = $state(false);

	let editName = $state('');
	let editBillingEmail = $state('');
	let editCountry = $state('');
	let editTimezone = $state('');

	let nexusBadge = $derived(nexusServiceBadge(nexusStatus?.nexus_service_status));
	let nexusDetail = $derived(nexusServiceDetailLine(nexusStatus));

	async function loadOrganization() {
		if (!orgId) return;
		isLoading = true;
		try {
			const [org, status, orgUsers, orgDevices] = await Promise.all([
				OrganizationsService.getById(orgId),
				OrganizationsService.getNexusStatus(orgId),
				OrganizationsService.getUsers(orgId),
				DevicesService.getAll({ client_id: orgId }).catch(() => [])
			]);
			organization = org;
			nexusStatus = status || {};
			users = orgUsers;
			devices = orgDevices;
			editName = org.name || '';
			editBillingEmail = org.billing_email || '';
			editCountry = org.country || '';
			editTimezone = org.timezone || '';
		} catch (error) {
			console.error('Error loading organization:', error);
			toast.error('No se pudo cargar la organización');
			organization = null;
		} finally {
			isLoading = false;
		}
	}

	async function saveEdits() {
		if (!orgId) return;
		isSaving = true;
		try {
			organization = await OrganizationsService.update(orgId, {
				name: editName.trim() || undefined,
				billing_email: editBillingEmail.trim() || undefined,
				country: editCountry.trim() || undefined,
				timezone: editTimezone.trim() || undefined
			});
			isEditing = false;
			toast.success('Organización actualizada');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error';
			toast.error('No se pudo actualizar: ' + message);
		} finally {
			isSaving = false;
		}
	}

	/** @param {string} newStatus */
	async function changeStatus(newStatus) {
		if (!orgId || !confirm(`¿Cambiar estado a ${newStatus}?`)) return;
		try {
			await OrganizationsService.updateStatus(orgId, newStatus);
			await loadOrganization();
			toast.success('Estado actualizado');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error';
			toast.error('No se pudo cambiar el estado: ' + message);
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

	onMount(loadOrganization);
</script>

<svelte:head>
	<title>Organización · Geminislabs</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-app text-app">
	<Topbar
		title={organization?.name || 'Organización'}
		subtitle="Detalle operativo"
		backUrl="/products/nexus/organizations"
	>
		{#if organization?.account_id}
			<a href={`/products/nexus/accounts/${organization.account_id}`}>
				<Button variant="outline" size="sm">Ver cuenta</Button>
			</a>
		{/if}
	</Topbar>

	<div class="mx-auto w-full max-w-7xl space-y-6 p-6">
		{#if isLoading}
			<Card class="p-8 text-center text-app-muted">Cargando...</Card>
		{:else if !organization}
			<Card class="p-8 text-center text-app-muted">Organización no encontrada.</Card>
		{:else}
			<Card class="p-6">
				<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
					<h2 class="text-lg font-semibold text-app">Información general</h2>
					<div class="flex flex-wrap gap-2">
						{#if !isEditing}
							<Button variant="outline" size="sm" onclick={() => (isEditing = true)}
								>Editar</Button
							>
						{/if}
						{#if organization.status === 'ACTIVE'}
							<Button variant="outline" size="sm" onclick={() => changeStatus('SUSPENDED')}
								>Suspender</Button
							>
						{:else if organization.status === 'SUSPENDED'}
							<Button variant="outline" size="sm" onclick={() => changeStatus('ACTIVE')}
								>Activar</Button
							>
						{/if}
					</div>
				</div>

				{#if isEditing}
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<Input label="Nombre" bind:value={editName} />
						<Input label="Email facturación" bind:value={editBillingEmail} />
						<Input label="País" bind:value={editCountry} />
						<Input label="Timezone" bind:value={editTimezone} />
					</div>
					<div class="mt-4 flex justify-end gap-2">
						<Button variant="outline" onclick={() => (isEditing = false)}>Cancelar</Button>
						<Button onclick={saveEdits} disabled={isSaving}>
							{isSaving ? 'Guardando...' : 'Guardar'}
						</Button>
					</div>
				{:else}
					<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div>
							<p class="text-sm text-app-muted">Estado</p>
							<p class="mt-1"><span class={statusBadgeClass(organization.status)}
									>{organization.status}</span
								></p>
						</div>
						<div>
							<p class="text-sm text-app-muted">Cuenta (account_id)</p>
							<p class="mt-1 break-all font-mono text-xs">{organization.account_id || '—'}</p>
						</div>
						<div>
							<p class="text-sm text-app-muted">Servicio Nexus</p>
							<p class="mt-1">
								<span class={nexusBadge.badgeClass}>{nexusBadge.label}</span>
							</p>
							<p class="text-sm text-app-secondary">{nexusDetail}</p>
						</div>
						<div>
							<p class="text-sm text-app-muted">Email facturación</p>
							<p class="font-medium">{organization.billing_email || '—'}</p>
						</div>
						<div>
							<p class="text-sm text-app-muted">País / Zona</p>
							<p class="font-medium">{organization.country || '—'} · {organization.timezone || '—'}</p>
						</div>
						<div>
							<p class="text-sm text-app-muted">ID</p>
							<p class="break-all font-mono text-xs">{organization.id}</p>
						</div>
					</div>
				{/if}
			</Card>

			{#if organization.account_id}
				<OrganizationBillingPanel
					organizationId={organization.id}
					accountId={organization.account_id}
					{nexusStatus}
				/>
			{/if}

			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<Card class="overflow-hidden">
					<div class="p-4" style="border-bottom: 1px solid var(--color-border)">
						<h3 class="font-semibold text-app">Usuarios ({users.length})</h3>
					</div>
					<div class="overflow-x-auto">
						<table class="gac-table">
							<thead>
								<tr>
									<th>Email</th>
									<th>Nombre</th>
									<th>Master</th>
								</tr>
							</thead>
							<tbody>
								{#if users.length === 0}
									<tr
										><td colspan="3" class="px-4 py-6 text-center text-app-muted"
											>Sin usuarios.</td
										></tr
									>
								{:else}
									{#each users as user (user.id)}
										<tr>
											<td>{user.email}</td>
											<td>{user.full_name || '—'}</td>
											<td>{user.is_master ? 'Sí' : '—'}</td>
										</tr>
									{/each}
								{/if}
							</tbody>
						</table>
					</div>
				</Card>

				<Card class="overflow-hidden">
					<div class="p-4" style="border-bottom: 1px solid var(--color-border)">
						<h3 class="font-semibold text-app">Dispositivos ({devices.length})</h3>
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
									<tr
										><td colspan="3" class="px-4 py-6 text-center text-app-muted"
											>Sin dispositivos.</td
										></tr
									>
								{:else}
									{#each devices as device (device.device_id)}
										<tr>
											<td>
												<a
													href={`/products/nexus/devices/${device.device_id}`}
													class="font-mono text-xs text-accent hover:underline"
												>
													{device.device_id.slice(0, 12)}…
												</a>
											</td>
											<td>{device.brand || '—'}</td>
											<td>{device.model || '—'}</td>
										</tr>
									{/each}
								{/if}
							</tbody>
						</table>
					</div>
				</Card>
			</div>
		{/if}
	</div>
</div>
