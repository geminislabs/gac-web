<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { onMount } from 'svelte';
	import { ShipmentsService } from '$lib/services/shipments';
	import { toast } from '$lib/stores/toast';
	import { auth } from '$lib/stores/auth';
	import { canAccessNexus } from '$lib/utils/roles';

	/** @type {import('$lib/services/shipments').Shipment[]} */
	let shipments = $state([]);
	let isLoading = $state(true);
	let showNexusLink = $derived(canAccessNexus($auth.user));
	let searchQuery = $state('');
	let statusFilter = $state('');
	let currentPage = $state(1);
	const itemsPerPage = 25;

	let filteredShipments = $derived(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return shipments;
		return shipments.filter(
			(s) =>
				s.shipment_id.toLowerCase().includes(q) ||
				s.client_id.toLowerCase().includes(q) ||
				(s.tracking_number && s.tracking_number.toLowerCase().includes(q)) ||
				(s.shipping_carrier && s.shipping_carrier.toLowerCase().includes(q))
		);
	});

	let totalPages = $derived(Math.max(1, Math.ceil(filteredShipments().length / itemsPerPage)));
	let paginated = $derived(() => {
		const start = (currentPage - 1) * itemsPerPage;
		return filteredShipments().slice(start, start + itemsPerPage);
	});

	async function loadShipments() {
		isLoading = true;
		try {
			shipments = await ShipmentsService.list({
				limit: 500,
				status: statusFilter || undefined
			});
		} catch (error) {
			console.error('Error loading shipments:', error);
			toast.error('No se pudieron cargar los envíos');
			shipments = [];
		} finally {
			isLoading = false;
		}
	}

	/** @param {Event} e */
	function handleSearch(e) {
		searchQuery = /** @type {HTMLInputElement} */ (e.target).value;
		currentPage = 1;
	}

	/** @param {Event} e */
	function handleStatusFilter(e) {
		statusFilter = /** @type {HTMLSelectElement} */ (e.target).value;
		currentPage = 1;
		loadShipments();
	}

	/** @param {string} status */
	function statusBadgeClass(status) {
		const s = (status || '').toLowerCase();
		if (['delivered', 'entregado', 'completed'].includes(s)) return 'gac-badge gac-badge-success';
		if (['failed', 'cancelled', 'lost', 'rechazado'].includes(s))
			return 'gac-badge gac-badge-danger';
		if (['in_transit', 'transito', 'shipped', 'enviado'].includes(s))
			return 'gac-badge gac-badge-info';
		if (['pending', 'pendiente', 'preparing', 'preparado'].includes(s))
			return 'gac-badge gac-badge-warning';
		return 'gac-badge gac-badge-neutral';
	}

	/** @param {string | undefined} dateStr */
	function formatDate(dateStr) {
		if (!dateStr) return '—';
		try {
			return new Date(dateStr).toLocaleString('es-MX', {
				dateStyle: 'short',
				timeStyle: 'short'
			});
		} catch {
			return dateStr;
		}
	}

	onMount(loadShipments);
</script>

<svelte:head>
	<title>Envíos · Geminislabs</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-app text-app">
	<Topbar title="Envíos" subtitle="Operación logística y seguimiento" backUrl="/" />

	<div class="mx-auto w-full max-w-7xl space-y-6 p-6">
		<Card padding>
			<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div class="flex-1">
					<Input
						placeholder="Buscar por shipment_id, client_id, guía o transportista…"
						value={searchQuery}
						oninput={handleSearch}
					/>
				</div>
				<div class="flex items-center gap-3">
					<select
						class="gac-input min-w-[180px]"
						value={statusFilter}
						onchange={handleStatusFilter}
					>
						<option value="">Todos los estados</option>
						<option value="pending">Pendiente</option>
						<option value="preparing">En preparación</option>
						<option value="shipped">Enviado</option>
						<option value="in_transit">En tránsito</option>
						<option value="delivered">Entregado</option>
						<option value="cancelled">Cancelado</option>
					</select>
					<Button variant="ghost" size="sm" onclick={loadShipments} disabled={isLoading}>
						{isLoading ? 'Cargando…' : 'Actualizar'}
					</Button>
				</div>
			</div>
		</Card>

		<Card>
			<div class="overflow-x-auto">
				<table class="gac-table">
					<thead>
						<tr>
							<th>Envío</th>
							<th>Cliente</th>
							<th>Estado</th>
							<th>Transportista</th>
							<th>Guía</th>
							<th>Creado</th>
							<th class="text-right">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#if isLoading}
							<tr>
								<td colspan="7" class="py-8 text-center text-app-muted">Cargando envíos…</td>
							</tr>
						{:else if paginated().length === 0}
							<tr>
								<td colspan="7" class="py-12 text-center text-app-muted">
									No hay envíos para mostrar con los filtros aplicados.
								</td>
							</tr>
						{:else}
							{#each paginated() as shipment (shipment.shipment_id)}
								<tr>
									<td class="font-mono text-xs text-app">{shipment.shipment_id.slice(0, 8)}…</td>
									<td class="font-mono text-xs">
										{#if showNexusLink}
											<a
												href={`/products/nexus/accounts/${shipment.client_id}`}
												class="text-accent hover:underline"
												title={shipment.client_id}
											>
												{shipment.client_id.slice(0, 8)}…
											</a>
										{:else}
											<span class="text-app-secondary">{shipment.client_id.slice(0, 8)}…</span>
										{/if}
									</td>
									<td>
										<span class={statusBadgeClass(shipment.status ?? '')}>
											{shipment.status ?? '—'}
										</span>
									</td>
									<td class="text-sm text-app-secondary">{shipment.shipping_carrier ?? '—'}</td>
									<td class="font-mono text-xs text-app-muted">
										{shipment.tracking_number ?? '—'}
									</td>
									<td class="text-sm text-app-secondary">{formatDate(shipment.created_at)}</td>
									<td class="text-right">
										<a href={`/admin/shipments/${shipment.shipment_id}`}>
											<Button variant="ghost" size="sm">Ver</Button>
										</a>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			{#if !isLoading && totalPages > 1}
				<div
					class="flex items-center justify-between border-t p-4 text-xs text-app-muted"
					style="border-color: var(--color-border)"
				>
					<span>
						Página {currentPage} de {totalPages} · {filteredShipments().length} envíos
					</span>
					<div class="flex gap-2">
						<Button
							variant="ghost"
							size="sm"
							disabled={currentPage <= 1}
							onclick={() => (currentPage -= 1)}
						>
							Anterior
						</Button>
						<Button
							variant="ghost"
							size="sm"
							disabled={currentPage >= totalPages}
							onclick={() => (currentPage += 1)}
						>
							Siguiente
						</Button>
					</div>
				</div>
			{/if}
		</Card>
	</div>
</div>
