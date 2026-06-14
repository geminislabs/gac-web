<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { PaymentsService } from '$lib/services/payments';
	import { toast } from '$lib/stores/toast';
	import { auth } from '$lib/stores/auth';
	import { canAccessNexus } from '$lib/utils/roles';

	const paymentId = $derived($page.params.id);
	let showNexusLink = $derived(canAccessNexus($auth.user));

	/** @type {import('$lib/services/payments').Payment | null} */
	let payment = $state(null);
	let isLoading = $state(true);

	async function loadPayment() {
		if (!paymentId) return;
		isLoading = true;
		try {
			payment = await PaymentsService.getById(paymentId);
		} catch (error) {
			console.error('Error loading payment:', error);
			toast.error('No se pudo cargar el pago');
			payment = null;
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
				dateStyle: 'long',
				timeStyle: 'short'
			});
		} catch {
			return dateStr;
		}
	}

	onMount(loadPayment);
</script>

<svelte:head>
	<title>Pago · Geminislabs</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-app text-app">
	<Topbar title="Detalle de pago" backUrl="/admin/payments" />

	<div class="mx-auto w-full max-w-3xl space-y-6 p-6">
		{#if isLoading}
			<Card class="p-8 text-center text-app-muted">Cargando...</Card>
		{:else if !payment}
			<Card class="p-8 text-center text-app-muted">Pago no encontrado.</Card>
		{:else}
			<Card class="p-6">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="md:col-span-2">
						<p class="text-xs uppercase tracking-wide text-app-muted">Payment ID</p>
						<p class="mt-1 break-all font-mono text-sm">{payment.payment_id}</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Cliente</p>
						<p class="mt-1 break-all font-mono text-sm">{payment.client_id}</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Estado</p>
						<p class="mt-1 font-medium">{payment.status}</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Monto</p>
						<p class="mt-1 text-lg font-bold">{formatAmount(payment.amount)}</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Método</p>
						<p class="mt-1">{payment.method}</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Referencia</p>
						<p class="mt-1 font-mono text-xs">{payment.transaction_ref || '—'}</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Creado</p>
						<p class="mt-1 text-sm">{formatDate(payment.created_at)}</p>
					</div>
					{#if payment.paid_at}
						<div>
							<p class="text-xs uppercase tracking-wide text-app-muted">Pagado</p>
							<p class="mt-1 text-sm">{formatDate(payment.paid_at)}</p>
						</div>
					{/if}
				</div>
				<div
					class="mt-6 flex flex-wrap gap-3 border-t pt-4"
					style="border-color: var(--color-border)"
				>
					{#if payment.order_id}
						<a href={`/admin/orders/${payment.order_id}`}>
							<Button variant="outline" size="sm">Ver orden</Button>
						</a>
					{/if}
					{#if showNexusLink}
						<a href={`/products/nexus/accounts/${payment.client_id}`}>
							<Button variant="outline" size="sm">Ver cuenta Nexus</Button>
						</a>
					{/if}
				</div>
			</Card>
		{/if}
	</div>
</div>
