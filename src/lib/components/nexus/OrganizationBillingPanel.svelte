<script>
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { BillingService } from '$lib/services/billing';
	import { SubscriptionsService } from '$lib/services/subscriptions';
	import { PlansService } from '$lib/services/plans';
	import { auth } from '$lib/stores/auth';
	import { toast } from '$lib/stores/toast';
	import { get } from 'svelte/store';
	import { nexusServiceBadge, nexusServiceDetailLine } from '$lib/utils/nexusStatus';

	/** @type {{ organizationId: string, accountId: string, nexusStatus?: Record<string, any> }} */
	let { organizationId, accountId, nexusStatus = {} } = $props();

	let isLoading = $state(true);
	/** @type {any[]} */
	let subscriptions = $state([]);
	/** @type {any[]} */
	let payments = $state([]);
	/** @type {any[]} */
	let invoices = $state([]);
	/** @type {any[]} */
	let paymentMethods = $state([]);
	/** @type {any[]} */
	let plans = $state([]);
	/** @type {Record<string, any> | null} */
	let billingSummary = $state(null);

	let planId = $state('');
	let billingCycle = $state('MONTHLY');
	let activeUnits = $state('1');
	let transactionRef = $state('');
	let registrationNotes = $state('');
	let isSubmitting = $state(false);
	let cancelingId = $state('');

	let nexusBadge = $derived(nexusServiceBadge(nexusStatus?.nexus_service_status));
	let nexusDetail = $derived(nexusServiceDetailLine(nexusStatus));

	$effect(() => {
		if (organizationId) loadAll();
	});

	async function loadAll() {
		isLoading = true;
		try {
			const [subs, pays, invs, pms, plansRes, summaryRes] = await Promise.all([
				SubscriptionsService.listByOrganization(organizationId, { limit: 50 }),
				BillingService.listPayments(organizationId, { limit: 50 }),
				BillingService.listInvoices(organizationId, { limit: 50 }),
				BillingService.listPaymentMethods(organizationId).catch(() => []),
				PlansService.getAll(false).catch(() => []),
				BillingService.getSummary(organizationId).catch(() => null)
			]);
			subscriptions = subs;
			payments = pays;
			invoices = invs;
			paymentMethods = pms;
			billingSummary = summaryRes;
			const planList = Array.isArray(plansRes)
				? plansRes
				: plansRes?.plans || plansRes?.data?.plans || [];
			plans = planList.filter((/** @type {any} */ p) => p.is_active !== false);
		} catch (error) {
			console.error('Error loading billing data:', error);
			toast.error('No se pudo cargar la información de billing');
		} finally {
			isLoading = false;
		}
	}

	async function handleManualPayment() {
		if (!planId) {
			toast.error('Selecciona un plan');
			return;
		}
		const units = parseInt(activeUnits, 10);
		if (!Number.isFinite(units) || units < 1) {
			toast.error('Unidades activas inválidas');
			return;
		}
		const authState = get(auth);
		isSubmitting = true;
		try {
			await BillingService.registerManualPayment({
				account_id: accountId,
				organization_id: organizationId,
				plan_id: planId,
				billing_cycle: /** @type {'MONTHLY' | 'YEARLY'} */ (billingCycle),
				active_units: units,
				transaction_ref: transactionRef.trim() || undefined,
				registration_notes: registrationNotes.trim() || undefined,
				operator_email: authState.user?.email || undefined
			});
			toast.success('Pago registrado y suscripción activada');
			transactionRef = '';
			registrationNotes = '';
			await loadAll();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error desconocido';
			toast.error('No se pudo registrar el pago: ' + message);
		} finally {
			isSubmitting = false;
		}
	}

	/** @param {string} subscriptionId */
	async function handleCancel(subscriptionId) {
		if (!confirm('¿Cancelar esta suscripción?')) return;
		cancelingId = subscriptionId;
		try {
			await SubscriptionsService.cancel(organizationId, subscriptionId, {
				cancel_immediately: false
			});
			toast.success('Suscripción cancelada');
			await loadAll();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error';
			toast.error('No se pudo cancelar: ' + message);
		} finally {
			cancelingId = '';
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
		if (['active', 'trial', 'success', 'paid'].includes(s)) return 'gac-badge gac-badge-success';
		if (['cancelled', 'canceled', 'failed', 'suspended'].includes(s))
			return 'gac-badge gac-badge-danger';
		if (['pending', 'processing'].includes(s)) return 'gac-badge gac-badge-warning';
		return 'gac-badge gac-badge-neutral';
	}
</script>

<Card class="p-6">
	<div class="mb-4">
		<h2 class="text-lg font-semibold text-app">Suscripciones y billing</h2>
		<p class="mt-1 text-sm text-app-muted">
			Suscripciones Nexus, pagos Siscom y métodos Stripe (solo lectura).
		</p>
		{#if nexusStatus?.nexus_service_status}
			<p class="mt-2">
				<span class={nexusBadge.badgeClass}>{nexusBadge.label}</span>
				<span class="ml-2 text-sm text-app-secondary">{nexusDetail}</span>
			</p>
		{/if}
	</div>

	{#if isLoading}
		<div class="flex h-24 items-center justify-center">
			<div
				class="h-8 w-8 animate-spin rounded-full border-2 border-transparent"
				style="border-top-color: var(--color-accent)"
			></div>
		</div>
	{:else}
		{#if billingSummary}
			<div
				class="mb-6 grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-3"
				style="border-color: var(--color-border)"
			>
				<div>
					<p class="text-xs uppercase tracking-wide text-app-muted">Plan actual</p>
					<p class="mt-1 font-medium text-app">
						{billingSummary.current_plan?.plan_name ?? 'Sin plan activo'}
					</p>
					{#if billingSummary.current_plan?.billing_cycle}
						<p class="text-xs text-app-muted">{billingSummary.current_plan.billing_cycle}</p>
					{/if}
				</div>
				<div>
					<p class="text-xs uppercase tracking-wide text-app-muted">Pendiente</p>
					<p class="mt-1 text-lg font-semibold text-app">
						{formatAmount(billingSummary.pending_amount)}
					</p>
				</div>
				<div>
					<p class="text-xs uppercase tracking-wide text-app-muted">Total pagado</p>
					<p class="mt-1 text-lg font-semibold text-app">
						{formatAmount(billingSummary.stats?.total_paid)}
					</p>
					<p class="text-xs text-app-muted">
						{billingSummary.stats?.payments_count ?? 0} pago(s)
					</p>
				</div>
			</div>
		{/if}
		<div class="space-y-8">
			<div>
				<h3 class="mb-3 text-sm font-semibold text-app">Pago en efectivo</h3>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
					<div>
						<label for="org-billing-plan" class="gac-label">Plan</label>
						<select id="org-billing-plan" class="gac-input w-full" bind:value={planId}>
							<option value="">Seleccionar...</option>
							{#each plans as plan (plan.id)}
								<option value={plan.id}>{plan.name} ({plan.code})</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="org-billing-cycle" class="gac-label">Ciclo</label>
						<select id="org-billing-cycle" class="gac-input w-full" bind:value={billingCycle}>
							<option value="MONTHLY">Mensual</option>
							<option value="YEARLY">Anual</option>
						</select>
					</div>
					<Input label="Unidades" id="org-active-units" type="number" bind:value={activeUnits} />
					<Input
						label="Referencia"
						id="org-transaction-ref"
						bind:value={transactionRef}
						placeholder="REC-001..."
					/>
				</div>
				<div class="mt-4 flex justify-end">
					<Button onclick={handleManualPayment} disabled={isSubmitting || !planId}>
						{isSubmitting ? 'Registrando...' : 'Registrar pago manual'}
					</Button>
				</div>
			</div>

			<div>
				<h3 class="mb-3 text-sm font-semibold text-app">
					Suscripciones <span class="text-app-muted">({subscriptions.length})</span>
				</h3>
				<div class="overflow-x-auto rounded-lg border" style="border-color: var(--color-border)">
					<table class="gac-table">
						<thead>
							<tr>
								<th>Plan</th>
								<th>Estado</th>
								<th>Ciclo</th>
								<th>Vence</th>
								<th class="text-right">Acción</th>
							</tr>
						</thead>
						<tbody>
							{#if subscriptions.length === 0}
								<tr
									><td colspan="5" class="px-4 py-6 text-center text-app-muted"
										>Sin suscripciones.</td
									></tr
								>
							{:else}
								{#each subscriptions as sub (sub.id)}
									<tr>
										<td>{sub.plan_name || sub.plan_code || sub.plan_id}</td>
										<td><span class={statusBadgeClass(sub.status)}>{sub.status}</span></td>
										<td>{sub.billing_cycle || '—'}</td>
										<td class="text-sm">{formatDate(sub.expires_at)}</td>
										<td class="text-right">
											{#if sub.status !== 'CANCELLED' && sub.is_active}
												<Button
													variant="outline"
													size="sm"
													disabled={cancelingId === sub.id}
													onclick={() => handleCancel(sub.id)}
												>
													Cancelar
												</Button>
											{/if}
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
								<th>Gateway</th>
								<th>Estado</th>
								<th>Monto</th>
								<th>Fecha</th>
							</tr>
						</thead>
						<tbody>
							{#if payments.length === 0}
								<tr><td colspan="4" class="px-4 py-6 text-center text-app-muted">Sin pagos.</td></tr
								>
							{:else}
								{#each payments as payment (payment.id)}
									<tr>
										<td class="text-sm">{payment.gateway || '—'}</td>
										<td
											><span class={statusBadgeClass(payment.payment_status)}
												>{payment.payment_status}</span
											></td
										>
										<td>{formatAmount(payment.amount)}</td>
										<td class="text-sm">{formatDate(payment.succeeded_at)}</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>

			<div>
				<h3 class="mb-3 text-sm font-semibold text-app">
					Facturas <span class="text-app-muted">({invoices.length})</span>
				</h3>
				<div class="overflow-x-auto rounded-lg border" style="border-color: var(--color-border)">
					<table class="gac-table">
						<thead>
							<tr>
								<th>Número</th>
								<th>Estado</th>
								<th>Total</th>
								<th>Creada</th>
								<th class="text-right">Acción</th>
							</tr>
						</thead>
						<tbody>
							{#if invoices.length === 0}
								<tr
									><td colspan="5" class="px-4 py-6 text-center text-app-muted">Sin facturas.</td
									></tr
								>
							{:else}
								{#each invoices as inv (inv.id)}
									<tr>
										<td class="font-mono text-xs">{inv.invoice_number || inv.id?.slice(0, 8)}</td>
										<td><span class={statusBadgeClass(inv.status)}>{inv.status}</span></td>
										<td>{formatAmount(inv.amount)}</td>
										<td class="text-sm">{formatDate(inv.created_at)}</td>
										<td class="text-right">
											<a
												href={`/products/nexus/organizations/${organizationId}/invoices/${inv.id}`}
											>
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
					Métodos de pago Stripe <span class="text-app-muted">(solo lectura)</span>
				</h3>
				<div class="overflow-x-auto rounded-lg border" style="border-color: var(--color-border)">
					<table class="gac-table">
						<thead>
							<tr>
								<th>Marca</th>
								<th>Últimos 4</th>
								<th>Expira</th>
								<th>Default</th>
							</tr>
						</thead>
						<tbody>
							{#if paymentMethods.length === 0}
								<tr
									><td colspan="4" class="px-4 py-6 text-center text-app-muted"
										>Sin métodos guardados. La gestión de tarjetas Stripe no está disponible desde
										GAC.</td
									></tr
								>
							{:else}
								{#each paymentMethods as pm (pm.id || pm.external_token)}
									<tr>
										<td class="text-sm">{pm.brand || pm.card_brand || '—'}</td>
										<td class="font-mono text-sm">{pm.last4 || pm.last_four || '—'}</td>
										<td class="text-sm"
											>{pm.exp_month && pm.exp_year ? `${pm.exp_month}/${pm.exp_year}` : '—'}</td
										>
										<td>{pm.is_default ? 'Sí' : '—'}</td>
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
