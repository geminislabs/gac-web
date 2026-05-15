<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { onMount } from 'svelte';
	import { OrdersService } from '$lib/services/orders';
	import { toast } from '$lib/stores/toast';

	/** @type {import('$lib/services/orders').Order[]} */
	let orders = $state([]);
	let isLoading = $state(true);
	let searchQuery = $state('');
	let statusFilter = $state('');
	let currentPage = $state(1);
	const itemsPerPage = 25;

	let filteredOrders = $derived(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return orders;
		return orders.filter(
			(o) =>
				o.order_id.toLowerCase().includes(q) ||
				o.client_id.toLowerCase().includes(q) ||
				(o.status && o.status.toLowerCase().includes(q))
		);
	});

	let totalPages = $derived(Math.max(1, Math.ceil(filteredOrders().length / itemsPerPage)));
	let paginated = $derived(() => {
		const start = (currentPage - 1) * itemsPerPage;
		return filteredOrders().slice(start, start + itemsPerPage);
	});

	async function loadOrders() {
		isLoading = true;
		try {
			orders = await OrdersService.list({
				limit: 500,
				status: statusFilter || undefined
			});
		} catch (error) {
			console.error('Error loading orders:', error);
			toast.error('No se pudieron cargar las órdenes');
			orders = [];
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
		loadOrders();
	}

	/**
	 * @param {string} status
	 * @returns {string}
	 */
	function statusBadgeClass(status) {
		const s = (status || '').toLowerCase();
		if (['completed', 'completado', 'paid', 'pagado'].includes(s)) return 'gac-badge gac-badge-success';
		if (['cancelled', 'cancelado', 'failed', 'fallido'].includes(s)) return 'gac-badge gac-badge-danger';
		if (['pending', 'pendiente', 'processing', 'procesando'].includes(s)) return 'gac-badge gac-badge-warning';
		return 'gac-badge gac-badge-neutral';
	}

	/** @param {string} amount */
	function formatAmount(amount) {
		const value = Number(amount);
		if (Number.isNaN(value)) return amount;
		return new Intl.NumberFormat('es-MX', {
			style: 'currency',
			currency: 'MXN',
			minimumFractionDigits: 2
		}).format(value);
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

	onMount(loadOrders);
</script>

<svelte:head>
	<title>Órdenes · Geminislabs</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-app text-app">
	<Topbar title="Órdenes" subtitle="Listado de órdenes registradas en el sistema" backUrl="/" />

	<div class="mx-auto w-full max-w-7xl space-y-6 p-6">
		<Card padding>
			<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div class="flex-1">
					<Input
						placeholder="Buscar por order_id, client_id o estado…"
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
						<option value="processing">En proceso</option>
						<option value="completed">Completada</option>
						<option value="cancelled">Cancelada</option>
						<option value="failed">Fallida</option>
					</select>
					<Button variant="ghost" size="sm" onclick={loadOrders} disabled={isLoading}>
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
							<th>Orden</th>
							<th>Cliente</th>
							<th>Estado</th>
							<th>Total</th>
							<th>Creada</th>
							<th class="text-right">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#if isLoading}
							<tr>
								<td colspan="6" class="py-8 text-center text-app-muted">Cargando órdenes…</td>
							</tr>
						{:else if paginated().length === 0}
							<tr>
								<td colspan="6" class="py-12 text-center text-app-muted">
									No se encontraron órdenes con los filtros aplicados.
								</td>
							</tr>
						{:else}
							{#each paginated() as order (order.order_id)}
								<tr>
									<td class="font-mono text-xs text-app">{order.order_id.slice(0, 8)}…</td>
									<td class="font-mono text-xs text-app-secondary">
										{order.client_id.slice(0, 8)}…
									</td>
									<td>
										<span class={statusBadgeClass(order.status)}>{order.status}</span>
									</td>
									<td class="font-semibold text-app">{formatAmount(order.total_amount)}</td>
									<td class="text-app-secondary text-sm">{formatDate(order.created_at)}</td>
									<td class="text-right">
										<a href={`/admin/orders/${order.order_id}`}>
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
						Página {currentPage} de {totalPages} ·
						{filteredOrders().length} órdenes
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
