<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { ShipmentsService } from '$lib/services/shipments';
	import { toast } from '$lib/stores/toast';
	import { auth } from '$lib/stores/auth';
	import { canAccessNexus } from '$lib/utils/roles';

	const shipmentId = $derived($page.params.id);
	let showNexusLink = $derived(canAccessNexus($auth.user));

	/** @type {import('$lib/services/shipments').Shipment | null} */
	let shipment = $state(null);
	let isLoading = $state(true);
	let isUpdatingStatus = $state(false);
	let selectedStatus = $state('');

	const STATUS_OPTIONS = [
		{ value: 'pending', label: 'Pendiente' },
		{ value: 'preparing', label: 'En preparación' },
		{ value: 'shipped', label: 'Enviado' },
		{ value: 'in_transit', label: 'En tránsito' },
		{ value: 'delivered', label: 'Entregado' },
		{ value: 'cancelled', label: 'Cancelado' }
	];

	async function loadShipment() {
		if (!shipmentId) return;
		isLoading = true;
		try {
			shipment = await ShipmentsService.getById(shipmentId);
			selectedStatus = shipment?.status ?? 'pending';
		} catch (error) {
			console.error('Error loading shipment:', error);
			toast.error('No se pudo cargar el envío');
			shipment = null;
		} finally {
			isLoading = false;
		}
	}

	async function handleStatusUpdate() {
		if (!shipment || !selectedStatus || selectedStatus === shipment.status) return;
		isUpdatingStatus = true;
		try {
			shipment = await ShipmentsService.updateStatus(shipment.shipment_id, selectedStatus);
			selectedStatus = shipment.status ?? selectedStatus;
			toast.success('Estado actualizado');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error desconocido';
			toast.error('No se pudo actualizar el estado: ' + message);
		} finally {
			isUpdatingStatus = false;
		}
	}

	/** @param {string | undefined} status */
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
				dateStyle: 'long',
				timeStyle: 'short'
			});
		} catch {
			return dateStr;
		}
	}

	/** @param {Record<string, any> | undefined} address */
	function formatAddress(address) {
		if (!address || typeof address !== 'object') return null;
		const parts = [
			address.street,
			address.city,
			address.state,
			address.postal_code,
			address.country
		].filter(Boolean);
		return parts.length > 0 ? parts.join(', ') : JSON.stringify(address, null, 2);
	}

	let addressLine = $derived.by(() => {
		if (!shipment?.address) return null;
		return formatAddress(shipment.address);
	});

	onMount(loadShipment);
</script>

<svelte:head>
	<title>Envío · Geminislabs</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-app text-app">
	<Topbar title="Detalle de envío" backUrl="/admin/shipments" />

	<div class="mx-auto w-full max-w-3xl space-y-6 p-6">
		{#if isLoading}
			<Card class="p-8 text-center text-app-muted">Cargando...</Card>
		{:else if !shipment}
			<Card class="p-8 text-center text-app-muted">Envío no encontrado.</Card>
		{:else}
			<Card class="p-6">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="md:col-span-2">
						<p class="text-xs uppercase tracking-wide text-app-muted">Shipment ID</p>
						<p class="mt-1 break-all font-mono text-sm">{shipment.shipment_id}</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Estado</p>
						<p class="mt-1">
							<span class={statusBadgeClass(shipment.status)}>{shipment.status ?? '—'}</span>
						</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Transportista</p>
						<p class="mt-1 font-medium">{shipment.shipping_carrier || '—'}</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Guía</p>
						<p class="mt-1 font-mono text-sm">{shipment.tracking_number || '—'}</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Cliente (client_id)</p>
						<p class="mt-1 break-all font-mono text-sm">{shipment.client_id}</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Creado</p>
						<p class="mt-1 text-sm">{formatDate(shipment.created_at)}</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Actualizado</p>
						<p class="mt-1 text-sm">{formatDate(shipment.updated_at)}</p>
					</div>
				</div>

				{#if addressLine}
					<div class="mt-6 border-t pt-4" style="border-color: var(--color-border)">
						<p class="text-xs uppercase tracking-wide text-app-muted">Dirección de envío</p>
						<p class="mt-2 whitespace-pre-wrap text-sm text-app-secondary">{addressLine}</p>
					</div>
				{/if}

				<div
					class="mt-6 flex flex-wrap gap-3 border-t pt-4"
					style="border-color: var(--color-border)"
				>
					<a href={`/admin/orders/${shipment.order_id}`}>
						<Button variant="outline" size="sm">Ver orden</Button>
					</a>
					{#if showNexusLink}
						<a href={`/products/nexus/accounts/${shipment.client_id}`}>
							<Button variant="outline" size="sm">Ver cuenta Nexus</Button>
						</a>
					{/if}
				</div>
			</Card>

			<Card class="p-6">
				<h2 class="mb-1 text-sm font-semibold text-app">Actualizar estado</h2>
				<p class="mb-4 text-xs text-app-muted">Registra el avance logístico del envío.</p>
				<div class="flex flex-wrap items-end gap-3">
					<div class="min-w-[200px] flex-1">
						<label for="shipment-status" class="gac-label">Nuevo estado</label>
						<select id="shipment-status" class="gac-input w-full" bind:value={selectedStatus}>
							{#each STATUS_OPTIONS as opt (opt.value)}
								<option value={opt.value}>{opt.label}</option>
							{/each}
						</select>
					</div>
					<Button
						onclick={handleStatusUpdate}
						disabled={isUpdatingStatus || selectedStatus === (shipment.status ?? '')}
					>
						{isUpdatingStatus ? 'Guardando…' : 'Guardar estado'}
					</Button>
				</div>
			</Card>
		{/if}
	</div>
</div>
