<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { OrdersService } from '$lib/services/orders';
	import { toast } from '$lib/stores/toast';

	const orderId = $derived($page.params.id);

	/** @type {import('$lib/services/orders').Order | null} */
	let order = $state(null);
	let isLoading = $state(true);

	async function loadOrder() {
		if (!orderId) return;
		isLoading = true;
		try {
			order = await OrdersService.getById(orderId);
		} catch (error) {
			console.error('Error loading order:', error);
			toast.error('No se pudo cargar la orden');
			order = null;
		} finally {
			isLoading = false;
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
