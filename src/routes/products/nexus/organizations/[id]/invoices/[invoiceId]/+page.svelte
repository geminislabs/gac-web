<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { BillingService } from '$lib/services/billing';
	import { toast } from '$lib/stores/toast';

	const orgId = $derived($page.params.id);
	const invoiceId = $derived($page.params.invoiceId);

	/** @type {Record<string, any> | null} */
	let invoice = $state(null);
	let isLoading = $state(true);

	async function loadInvoice() {
		if (!orgId || !invoiceId) return;
		isLoading = true;
		try {
			invoice = await BillingService.getInvoice(orgId, invoiceId);
		} catch (error) {
			console.error('Error loading invoice:', error);
			toast.error('No se pudo cargar la factura');
			invoice = null;
		} finally {
			isLoading = false;
		}
	}

	/** @param {string | number | undefined} amount */
	function formatAmount(amount) {
		const value = Number(amount);
		if (Number.isNaN(value)) return amount ?? '—';
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

	onMount(loadInvoice);
</script>

<svelte:head>
	<title>Factura · Geminislabs</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-app text-app">
	<Topbar title="Detalle de factura" backUrl={`/products/nexus/organizations/${orgId}`} />

	<div class="mx-auto w-full max-w-3xl space-y-6 p-6">
		{#if isLoading}
			<Card class="p-8 text-center text-app-muted">Cargando...</Card>
		{:else if !invoice}
			<Card class="p-8 text-center text-app-muted">Factura no encontrada.</Card>
		{:else}
			<Card class="p-6">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Número</p>
						<p class="mt-1 font-mono text-sm">{invoice.invoice_number}</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Estado</p>
						<p class="mt-1 font-medium">{invoice.invoice_status}</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Subtotal</p>
						<p class="mt-1">{formatAmount(invoice.subtotal)}</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Total</p>
						<p class="mt-1 text-lg font-bold">{formatAmount(invoice.total_amount)}</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Creada</p>
						<p class="mt-1 text-sm">{formatDate(invoice.created_at)}</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-app-muted">Pagada</p>
						<p class="mt-1 text-sm">{formatDate(invoice.paid_at)}</p>
					</div>
				</div>
			</Card>

			{#if invoice.payment}
				<Card class="p-6">
					<h2 class="mb-4 text-sm font-semibold text-app">Pago asociado</h2>
					<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
						<div>
							<p class="text-xs text-app-muted">Gateway</p>
							<p class="font-medium">{invoice.payment.gateway}</p>
						</div>
						<div>
							<p class="text-xs text-app-muted">Estado</p>
							<p class="font-medium">{invoice.payment.payment_status}</p>
						</div>
						<div>
							<p class="text-xs text-app-muted">Monto</p>
							<p class="font-medium">{formatAmount(invoice.payment.amount)}</p>
						</div>
						<div>
							<p class="text-xs text-app-muted">Método</p>
							<p class="font-medium">{invoice.payment.payment_method_type}</p>
						</div>
						{#if invoice.payment.gateway_payment_id}
							<div class="md:col-span-2">
								<p class="text-xs text-app-muted">Referencia gateway</p>
								<p class="break-all font-mono text-xs">{invoice.payment.gateway_payment_id}</p>
							</div>
						{/if}
					</div>
					{#if invoice.stripe_receipt_url}
						<div class="mt-4">
							<a href={invoice.stripe_receipt_url} target="_blank" rel="noopener noreferrer">
								<Button variant="outline" size="sm">Recibo Stripe</Button>
							</a>
						</div>
					{/if}
				</Card>
			{/if}

			{#if invoice.invoice_pdf_url}
				<Card class="p-6">
					<a href={invoice.invoice_pdf_url} target="_blank" rel="noopener noreferrer">
						<Button variant="outline">Descargar PDF</Button>
					</a>
				</Card>
			{/if}
		{/if}
	</div>
</div>
