<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { OrdersService } from '$lib/services/orders';
	import { PaymentsService } from '$lib/services/payments';
	import { ShipmentsService } from '$lib/services/shipments';
	import { toast } from '$lib/stores/toast';
	import { auth } from '$lib/stores/auth';
	import { canAccessNexus } from '$lib/utils/roles';

	const orderId = $derived($page.params.id);
	let showNexusLink = $derived(canAccessNexus($auth.user));

	/** @type {import('$lib/services/orders').Order | null} */
	let order = $state(null);
	/** @type {import('$lib/services/payments').Payment[]} */
	let orderPayments = $state([]);
	/** @type {import('$lib/services/shipments').Shipment[]} */
	let orderShipments = $state([]);
	let isLoading = $state(true);

	let payAmount = $state('');
	let payMethod = $state('transfer');
	let payRef = $state('');
	let isPaySubmitting = $state(false);

	let shipCarrier = $state('');
	let shipTracking = $state('');
	let shipCity = $state('');
	let shipCountry = $state('MX');
	let isShipSubmitting = $state(false);

	/**
	 * @param {string} clientId
	 * @param {string} oid
	 */
	async function loadRelatedForOrder(clientId, oid) {
		const [payments, shipments] = await Promise.all([
			PaymentsService.getByClient(clientId).catch(() => []),
			ShipmentsService.getByClient(clientId).catch(() => [])
		]);
		orderPayments = payments.filter((p) => p.order_id === oid);
		orderShipments = shipments.filter((s) => s.order_id === oid);
	}

	async function loadOrder() {
		if (!orderId) return;
		isLoading = true;
		try {
			order = await OrdersService.getById(orderId);
			if (order) {
				if (!payAmount) payAmount = String(order.total_amount ?? '');
				await loadRelatedForOrder(order.client_id, order.order_id);
			} else {
				orderPayments = [];
				orderShipments = [];
			}
		} catch (error) {
			console.error('Error loading order:', error);
			toast.error('No se pudo cargar la orden');
			order = null;
			orderPayments = [];
			orderShipments = [];
		} finally {
			isLoading = false;
		}
	}

	async function handleCreatePayment() {
		if (!order) return;
		const amount = Number(payAmount);
		if (!Number.isFinite(amount) || amount <= 0) {
			toast.error('Monto inválido');
			return;
		}
		isPaySubmitting = true;
		try {
			await PaymentsService.create({
				client_id: order.client_id,
				order_id: order.order_id,
				amount,
				method: payMethod,
				transaction_ref: payRef.trim() || undefined
			});
			toast.success('Pago registrado');
			payRef = '';
			if (order) await loadRelatedForOrder(order.client_id, order.order_id);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error';
			toast.error('No se pudo registrar el pago: ' + message);
		} finally {
			isPaySubmitting = false;
		}
	}

	async function handleCreateShipment() {
		if (!order) return;
		isShipSubmitting = true;
		try {
			await ShipmentsService.create({
				order_id: order.order_id,
				client_id: order.client_id,
				shipping_carrier: shipCarrier.trim() || undefined,
				tracking_number: shipTracking.trim() || undefined,
				address:
					shipCity.trim() || shipCountry.trim()
						? { city: shipCity.trim() || undefined, country: shipCountry.trim() || undefined }
						: undefined
			});
			toast.success('Envío registrado');
			shipCarrier = '';
			shipTracking = '';
			shipCity = '';
			if (order) await loadRelatedForOrder(order.client_id, order.order_id);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error';
			toast.error('No se pudo registrar el envío: ' + message);
		} finally {
			isShipSubmitting = false;
		}
	}

	/** @param {string} amount */
	function formatAmount(amount) {
		const value = Number(amount);
		if (Number.isNaN(value)) return amount;
		return new Intl.NumberFormat('es-MX', {
			style: 'currency',
			currency: 'MXN'
		}).format(value);
	}

	/** @param {string | undefined} dateStr */
	function formatDate(dateStr) {
		if (!dateStr) return '—';
		try {
			return new Date(dateStr).toLocaleString('es-MX', {
				dateStyle: 'long',
				timeStyle: 'short'
			});
		} catch {
			return dateStr;
		}
	}

	onMount(loadOrder);
</script>

<svelte:head>
	<title>Orden · Geminislabs</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-app text-app">
	<Topbar title="Detalle de orden" backUrl="/admin/orders" />

	<div class="mx-auto w-full max-w-5xl space-y-6 p-6">
		{#if isLoading}
			<Card padding>
				<div class="flex h-32 items-center justify-center">
					<div
						class="h-8 w-8 animate-spin rounded-full border-b-2"
						style="border-color: var(--color-accent)"
					></div>
				</div>
			</Card>
		{:else if order}
			<Card padding>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Order ID</p>
						<p class="mt-1 break-all font-mono text-sm text-app">{order.order_id}</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Cliente</p>
						<p class="mt-1 break-all font-mono text-sm text-app">{order.client_id}</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Estado</p>
						<p class="mt-1 text-sm font-semibold text-app">{order.status}</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Total</p>
						<p class="mt-1 text-base font-bold text-app">
							{formatAmount(order.total_amount)}
						</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Creada</p>
						<p class="mt-1 text-sm text-app">{formatDate(order.created_at)}</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Actualizada</p>
						<p class="mt-1 text-sm text-app">{formatDate(order.updated_at)}</p>
					</div>
				</div>
				{#if order.notes}
					<div class="mt-6 border-t pt-4" style="border-color: var(--color-border)">
						<p class="text-xs uppercase tracking-wide text-app-muted">Notas</p>
						<p class="mt-2 text-sm text-app-secondary">{order.notes}</p>
					</div>
				{/if}
				{#if showNexusLink}
					<div
						class="mt-6 flex flex-wrap gap-3 border-t pt-4"
						style="border-color: var(--color-border)"
					>
						<a href={`/products/nexus/accounts/${order.client_id}`}>
							<Button variant="outline" size="sm">Ver cuenta Nexus</Button>
						</a>
					</div>
				{/if}
			</Card>

			{#if order.items && order.items.length > 0}
				<Card>
					<div class="border-b p-4" style="border-color: var(--color-border)">
						<h2 class="text-sm font-semibold text-app">Artículos</h2>
					</div>
					<div class="overflow-x-auto">
						<table class="gac-table">
							<thead>
								<tr>
									<th>Producto / Dispositivo</th>
									<th class="text-right">Cantidad</th>
									<th class="text-right">Precio unitario</th>
									<th class="text-right">Subtotal</th>
								</tr>
							</thead>
							<tbody>
								{#each order.items as item (item.item_id)}
									{@const qty = Number(item.quantity) || 0}
									{@const price = Number(item.unit_price) || 0}
									{@const subtotal = (qty * price).toFixed(2)}
									<tr>
										<td>
											{#if item.product_key}
												<div class="text-sm font-medium text-app">{item.product_key}</div>
											{/if}
											{#if item.device_id}
												<div class="font-mono text-xs text-app-muted">
													device: {item.device_id.slice(0, 8)}…
												</div>
											{/if}
										</td>
										<td class="text-right text-app">{item.quantity}</td>
										<td class="text-right text-app-secondary">
											{formatAmount(item.unit_price)}
										</td>
										<td class="text-right font-medium text-app">
											{formatAmount(subtotal)}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</Card>
			{/if}

			{#if orderPayments.length > 0 || orderShipments.length > 0}
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					{#if orderPayments.length > 0}
						<Card>
							<div class="border-b p-4" style="border-color: var(--color-border)">
								<h2 class="text-sm font-semibold text-app">
									Pagos vinculados <span class="text-app-muted">({orderPayments.length})</span>
								</h2>
							</div>
							<div class="overflow-x-auto">
								<table class="gac-table">
									<thead>
										<tr>
											<th>Pago</th>
											<th>Estado</th>
											<th>Monto</th>
											<th class="text-right">Acción</th>
										</tr>
									</thead>
									<tbody>
										{#each orderPayments as payment (payment.payment_id)}
											<tr>
												<td class="font-mono text-xs">{payment.payment_id.slice(0, 8)}…</td>
												<td class="text-sm">{payment.status}</td>
												<td>{formatAmount(payment.amount)}</td>
												<td class="text-right">
													<a href={`/admin/payments/${payment.payment_id}`}>
														<Button variant="ghost" size="sm">Ver</Button>
													</a>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</Card>
					{/if}

					{#if orderShipments.length > 0}
						<Card>
							<div class="border-b p-4" style="border-color: var(--color-border)">
								<h2 class="text-sm font-semibold text-app">
									Envíos vinculados <span class="text-app-muted">({orderShipments.length})</span>
								</h2>
							</div>
							<div class="overflow-x-auto">
								<table class="gac-table">
									<thead>
										<tr>
											<th>Envío</th>
											<th>Estado</th>
											<th>Guía</th>
											<th class="text-right">Acción</th>
										</tr>
									</thead>
									<tbody>
										{#each orderShipments as shipment (shipment.shipment_id)}
											<tr>
												<td class="font-mono text-xs">{shipment.shipment_id.slice(0, 8)}…</td>
												<td class="text-sm">{shipment.status ?? '—'}</td>
												<td class="text-sm">{shipment.tracking_number ?? '—'}</td>
												<td class="text-right">
													<a href={`/admin/shipments/${shipment.shipment_id}`}>
														<Button variant="ghost" size="sm">Ver</Button>
													</a>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</Card>
					{/if}
				</div>
			{/if}

			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<Card class="p-6">
					<h2 class="mb-1 text-sm font-semibold text-app">Registrar pago</h2>
					<p class="mb-4 text-xs text-app-muted">Vincula el cobro a esta orden en gac-api.</p>
					<div class="space-y-3">
						<Input label="Monto (MXN)" type="number" bind:value={payAmount} min="0" step="0.01" />
						<div>
							<label class="gac-label" for="pay-method">Método</label>
							<select id="pay-method" class="gac-input w-full" bind:value={payMethod}>
								<option value="transfer">Transferencia</option>
								<option value="cash">Efectivo</option>
								<option value="card">Tarjeta</option>
							</select>
						</div>
						<Input label="Referencia" bind:value={payRef} placeholder="Folio, SPEI, recibo…" />
					</div>
					<div class="mt-4 flex justify-end">
						<Button onclick={handleCreatePayment} disabled={isPaySubmitting}>
							{isPaySubmitting ? 'Guardando…' : 'Registrar pago'}
						</Button>
					</div>
				</Card>

				<Card class="p-6">
					<h2 class="mb-1 text-sm font-semibold text-app">Registrar envío</h2>
					<p class="mb-4 text-xs text-app-muted">Guía y transportista para esta orden.</p>
					<div class="space-y-3">
						<Input label="Transportista" bind:value={shipCarrier} placeholder="DHL, Estafeta…" />
						<Input label="Número de guía" bind:value={shipTracking} />
						<div class="grid grid-cols-2 gap-3">
							<Input label="Ciudad" bind:value={shipCity} />
							<Input label="País" bind:value={shipCountry} />
						</div>
					</div>
					<div class="mt-4 flex justify-end">
						<Button onclick={handleCreateShipment} disabled={isShipSubmitting}>
							{isShipSubmitting ? 'Guardando…' : 'Registrar envío'}
						</Button>
					</div>
				</Card>
			</div>
		{:else}
			<Card padding>
				<p class="text-sm text-app-muted">Orden no encontrada.</p>
				<div class="mt-4">
					<a href="/admin/orders">
						<Button variant="outline" size="sm">Volver al listado</Button>
					</a>
				</div>
			</Card>
		{/if}
	</div>
</div>
