<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { onMount } from 'svelte';
	import { PaymentsService } from '$lib/services/payments';
	import { toast } from '$lib/stores/toast';

	/** @type {import('$lib/services/payments').Payment[]} */
	let payments = $state([]);
	let isLoading = $state(true);
	let searchQuery = $state('');
	let statusFilter = $state('');
	let currentPage = $state(1);
	const itemsPerPage = 25;

	let filteredPayments = $derived(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return payments;
		return payments.filter(
			(p) =>
				p.payment_id.toLowerCase().includes(q) ||
				p.client_id.toLowerCase().includes(q) ||
				(p.transaction_ref && p.transaction_ref.toLowerCase().includes(q))
		);
	});

	let totalPages = $derived(Math.max(1, Math.ceil(filteredPayments().length / itemsPerPage)));
	let paginated = $derived(() => {
		const start = (currentPage - 1) * itemsPerPage;
		return filteredPayments().slice(start, start + itemsPerPage);
	});

	async function loadPayments() {
		isLoading = true;
		try {
			payments = await PaymentsService.list({
				limit: 500,
				status: statusFilter || undefined
			});
		} catch (error) {
			console.error('Error loading payments:', error);
			toast.error('No se pudieron cargar los pagos');
			payments = [];
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
		loadPayments();
	}

	/**
	 * @param {string} status
	 * @returns {string}
	 */
	function statusBadgeClass(status) {
		const s = (status || '').toLowerCase();
		if (['paid', 'completed', 'approved'].includes(s)) return 'gac-badge gac-badge-success';
		if (['failed', 'declined', 'refunded'].includes(s)) return 'gac-badge gac-badge-danger';
		if (['pending', 'processing'].includes(s)) return 'gac-badge gac-badge-warning';
		return 'gac-badge gac-badge-neutral';
	}

	/**
	 * @param {string} amount
	 */
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

	onMount(loadPayments);
</script>

<svelte:head>
	<title>Pagos · Geminislabs</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-app text-app">
	<Topbar title="Pagos" subtitle="Pagos registrados en la plataforma" backUrl="/" />

	<div class="mx-auto w-full max-w-7xl space-y-6 p-6">
		<Card padding>
			<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div class="flex-1">
					<Input
						placeholder="Buscar por payment_id, client_id o transaction ref…"
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
						<option value="processing">Procesando</option>
						<option value="paid">Pagado</option>
						<option value="refunded">Reembolsado</option>
						<option value="failed">Fallido</option>
					</select>
					<Button variant="ghost" size="sm" onclick={loadPayments} disabled={isLoading}>
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
							<th>Pago</th>
							<th>Cliente</th>
							<th>Estado</th>
							<th>Método</th>
							<th>Monto</th>
							<th>Transaction Ref</th>
							<th>Fecha</th>
						</tr>
					</thead>
					<tbody>
						{#if isLoading}
							<tr>
								<td colspan="7" class="py-8 text-center text-app-muted">Cargando pagos…</td>
							</tr>
						{:else if paginated().length === 0}
							<tr>
								<td colspan="7" class="py-12 text-center text-app-muted">
									No hay pagos para mostrar con los filtros aplicados.
								</td>
							</tr>
						{:else}
							{#each paginated() as payment (payment.payment_id)}
								<tr>
									<td class="font-mono text-xs text-app">{payment.payment_id.slice(0, 8)}…</td>
									<td class="font-mono text-xs text-app-secondary">
										{payment.client_id.slice(0, 8)}…
									</td>
									<td>
										<span class={statusBadgeClass(payment.status)}>{payment.status}</span>
									</td>
									<td class="text-sm text-app-secondary">{payment.method ?? '—'}</td>
									<td class="font-semibold text-app">{formatAmount(payment.amount)}</td>
									<td class="font-mono text-xs text-app-muted">
										{payment.transaction_ref ?? '—'}
									</td>
									<td class="text-sm text-app-secondary">{formatDate(payment.created_at)}</td>
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
						Página {currentPage} de {totalPages} · {filteredPayments().length} pagos
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
