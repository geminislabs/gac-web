<script>
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { CommerceService } from '$lib/services/commerce';

	/** @type {{ accountId: string }} */
	let { accountId } = $props();

	let isLoading = $state(true);
	let loadError = $state('');

	/** @type {string} */
	let clientId = $state('');
	/** @type {import('$lib/services/orders').Order[]} */
	let orders = $state([]);
	/** @type {import('$lib/services/payments').Payment[]} */
	let payments = $state([]);
	/** @type {import('$lib/services/shipments').Shipment[]} */
	let shipments = $state([]);
	/** @type {{ orders_count?: number, payments_count?: number, shipments_count?: number } | null} */
	let summary = $state(null);

	$effect(() => {
		if (!accountId) return;
		loadCommerce(accountId);
	});

	/** @param {string} id */
	async function loadCommerce(id) {
		isLoading = true;
		loadError = '';
		try {
			const bundle = await CommerceService.getByAccount(id);
			clientId = bundle.clientId;
			orders = bundle.orders;
			payments = bundle.payments;
			shipments = bundle.shipments;
			summary = bundle.summary;
		} catch (error) {
			console.error('Error loading commerce data:', error);
			loadError = 'No se pudo cargar la información comercial.';
			clientId = id;
			orders = [];
			payments = [];
			shipments = [];
			summary = null;
		} finally {
			isLoading = false;
		}
	}

	/** @param {string} amount */
	function formatAmount(amount) {
		const value = Number(amount);
		if (Number.isNaN(value)) return amount;
		return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
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

	/** @param {string} status */
	function statusBadgeClass(status) {
		const s = (status || '').toLowerCase();
		if (
			['completed', 'completado', 'paid', 'pagado', 'approved', 'delivered', 'entregado'].includes(
				s
			)
		)
			return 'gac-badge gac-badge-success';
		if (['cancelled', 'cancelado', 'failed', 'fallido', 'refunded'].includes(s))
			return 'gac-badge gac-badge-danger';
		if (
			[
				'pending',
				'pendiente',
				'processing',
				'procesando',
				'preparing',
				'shipped',
				'in_transit'
			].includes(s)
		)
			return 'gac-badge gac-badge-warning';
		return 'gac-badge gac-badge-neutral';
	}
</script>

<Card class="p-6">
	<div class="mb-4 flex flex-wrap items-start justify-between gap-3">
		<div>
			<h2 class="text-lg font-semibold text-app">Comercio GAC</h2>
			<p class="mt-1 text-sm text-app-muted">
				Órdenes, pagos y envíos vinculados a esta cuenta. El ID comercial coincide con el account_id
				de Nexus.
			</p>
		</div>
		<a href={`/admin/orders/create?client_id=${encodeURIComponent(accountId)}`}>
			<Button variant="primary" size="sm">Nueva orden</Button>
		</a>
		<a href="/admin/orders">
			<Button variant="outline" size="sm">Ir a órdenes</Button>
		</a>
		<a href="/admin/shipments">
			<Button variant="outline" size="sm">Ir a envíos</Button>
		</a>
	</div>

	<div class="mb-6 rounded-lg border p-4" style="border-color: var(--color-border)">
		<p class="text-xs font-medium uppercase tracking-wide text-app-muted">
			ID comercial (client_id)
		</p>
		<p class="mt-1 break-all font-mono text-sm text-app">{clientId || accountId || '—'}</p>
	</div>

	{#if isLoading}
		<div class="flex h-24 items-center justify-center">
			<div
				class="h-8 w-8 animate-spin rounded-full border-2 border-transparent"
				style="border-top-color: var(--color-accent)"
				aria-label="Cargando comercio"
			></div>
		</div>
	{:else if loadError}
		<p class="text-sm text-app-muted" role="alert">{loadError}</p>
	{:else}
		<div class="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
			<div class="rounded-lg border p-4" style="border-color: var(--color-border)">
				<p class="text-xs uppercase tracking-wide text-app-muted">Órdenes</p>
				<p class="mt-1 text-2xl font-bold text-app">{summary?.orders_count ?? orders.length}</p>
			</div>
			<div class="rounded-lg border p-4" style="border-color: var(--color-border)">
				<p class="text-xs uppercase tracking-wide text-app-muted">Pagos</p>
				<p class="mt-1 text-2xl font-bold text-app">{summary?.payments_count ?? payments.length}</p>
			</div>
			<div class="rounded-lg border p-4" style="border-color: var(--color-border)">
				<p class="text-xs uppercase tracking-wide text-app-muted">Envíos</p>
				<p class="mt-1 text-2xl font-bold text-app">
					{summary?.shipments_count ?? shipments.length}
				</p>
			</div>
		</div>
		<div class="space-y-6">
			<div>
				<h3 class="mb-3 text-sm font-semibold text-app">
					Órdenes <span class="text-app-muted">({orders.length})</span>
				</h3>
				<div class="overflow-x-auto rounded-lg border" style="border-color: var(--color-border)">
					<table class="gac-table">
						<thead>
							<tr>
								<th>Orden</th>
								<th>Estado</th>
								<th>Total</th>
								<th>Creada</th>
								<th class="text-right">Acción</th>
							</tr>
						</thead>
						<tbody>
							{#if orders.length === 0}
								<tr>
									<td colspan="5" class="px-4 py-6 text-center text-app-muted">
										Sin órdenes para este cliente.
									</td>
								</tr>
							{:else}
								{#each orders as order (order.order_id)}
									<tr>
										<td class="font-mono text-xs">{order.order_id.slice(0, 8)}…</td>
										<td>
											<span class={statusBadgeClass(order.status)}>{order.status}</span>
										</td>
										<td>{formatAmount(order.total_amount)}</td>
										<td class="text-sm text-app-secondary">{formatDate(order.created_at)}</td>
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
			</div>

			<div>
				<h3 class="mb-3 text-sm font-semibold text-app">
					Pagos <span class="text-app-muted">({payments.length})</span>
				</h3>
				<div class="overflow-x-auto rounded-lg border" style="border-color: var(--color-border)">
					<table class="gac-table">
						<thead>
							<tr>
								<th>Pago</th>
								<th>Estado</th>
								<th>Monto</th>
								<th>Método</th>
								<th>Creado</th>
								<th class="text-right">Acción</th>
							</tr>
						</thead>
						<tbody>
							{#if payments.length === 0}
								<tr>
									<td colspan="6" class="px-4 py-6 text-center text-app-muted">
										Sin pagos registrados en GAC.
									</td>
								</tr>
							{:else}
								{#each payments as payment (payment.payment_id)}
									<tr>
										<td class="font-mono text-xs">{payment.payment_id.slice(0, 8)}…</td>
										<td>
											<span class={statusBadgeClass(payment.status)}>{payment.status}</span>
										</td>
										<td>{formatAmount(payment.amount)}</td>
										<td class="text-sm">{payment.method}</td>
										<td class="text-sm text-app-secondary">{formatDate(payment.created_at)}</td>
										<td class="text-right">
											<a href={`/admin/payments/${payment.payment_id}`}>
												<Button variant="ghost" size="sm">Ver</Button>
											</a>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>

			<div>
				<h3 class="mb-3 text-sm font-semibold text-app">
					Envíos <span class="text-app-muted">({shipments.length})</span>
				</h3>
				<div class="overflow-x-auto rounded-lg border" style="border-color: var(--color-border)">
					<table class="gac-table">
						<thead>
							<tr>
								<th>Envío</th>
								<th>Estado</th>
								<th>Transportista</th>
								<th>Guía</th>
								<th>Creado</th>
								<th class="text-right">Acción</th>
							</tr>
						</thead>
						<tbody>
							{#if shipments.length === 0}
								<tr>
									<td colspan="6" class="px-4 py-6 text-center text-app-muted">
										Sin envíos para este cliente.
									</td>
								</tr>
							{:else}
								{#each shipments as shipment (shipment.shipment_id)}
									<tr>
										<td class="font-mono text-xs">{shipment.shipment_id.slice(0, 8)}…</td>
										<td>
											<span class={statusBadgeClass(shipment.status || '')}
												>{shipment.status || '—'}</span
											>
										</td>
										<td class="text-sm">{shipment.shipping_carrier || '—'}</td>
										<td class="text-sm">{shipment.tracking_number || '—'}</td>
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
			</div>
		</div>
	{/if}
</Card>
