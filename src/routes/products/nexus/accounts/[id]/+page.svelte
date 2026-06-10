<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { ClientsService } from '$lib/services/clients';
	import { DevicesService } from '$lib/services/devices';
	import { PlansService } from '$lib/services/plans';
	import { BillingService } from '$lib/services/billing';
	import { auth } from '$lib/stores/auth';
	import { toast } from '$lib/stores/toast';
	import { goto } from '$app/navigation';
	import { nexusServiceBadge, nexusServiceDetailLine } from '$lib/utils/nexusStatus';
	import AccountCommerceSection from '$lib/components/nexus/AccountCommerceSection.svelte';
	import { toCommercialClientId } from '$lib/utils/commercialClient';

	let clientId = $derived($page.params.id);

	/** @type {any} */
	let client = $state({});
	/** @type {any[]} */
	let devices = $state([]);
	/** @type {any[]} */
	let units = $state([]);
	/** @type {any[]} */
	let organizations = $state([]);
	/** @type {any[]} */
	let plans = $state([]);
	let isLoading = $state(true);
	let isSubmitting = $state(false);

	let organizationId = $state('');
	let planId = $state('');
	let billingCycle = $state('MONTHLY');
	let activeUnits = $state('1');
	let transactionRef = $state('');
	let registrationNotes = $state('');

	/** @type {import('$lib/services/billing.js').ManualPaymentResult | null} */
	let lastPaymentResult = $state(null);

	let paymentJustCompleted = $derived(lastPaymentResult !== null);

	let selectedPlanName = $derived(
		plans.find((/** @type {any} */ p) => p.id === planId)?.name ?? ''
	);

	let selectedOrgName = $derived(
		organizations.find((/** @type {any} */ o) => o.id === organizationId)?.name ?? ''
	);

	let nexusBadge = $derived(nexusServiceBadge(client?.nexus_service_status));
	let nexusDetail = $derived(nexusServiceDetailLine(client));
	let hasActiveNexus = $derived(client?.nexus_service_status === 'active');

	/** @returns {Promise<any[]>} */
	async function loadAccountData() {
		if (!clientId) return [];

		const [clientData, orgs] = await Promise.all([
			ClientsService.getById(clientId),
			ClientsService.getOrganizations(clientId)
		]);

		client = {
			...clientData,
			name: clientData.account_name,
			formattedCreated: clientData.created_at
				? new Date(clientData.created_at).toLocaleDateString()
				: '-'
		};

		organizations = orgs || [];
		if (!organizationId && organizations.length === 1) {
			organizationId = organizations[0].id;
		}
		return organizations;
	}

	onMount(async () => {
		try {
			if (!clientId) return;
			const orgs = await loadAccountData();

			try {
				const plansResponse = await PlansService.getAll(false);
				const planList = Array.isArray(plansResponse)
					? plansResponse
					: plansResponse?.plans || plansResponse?.data?.plans || [];
				plans = planList.filter((/** @type {any} */ p) => p.is_active !== false);
			} catch (plansErr) {
				console.error('Error loading plans:', plansErr);
				plans = [];
				toast.error('No se pudieron cargar los planes');
			}

			await loadDevicesForOrganizations(orgs);
		} catch (error) {
			console.error('Error fetching client details:', error);
			toast.error('Error al cargar la cuenta');
		} finally {
			isLoading = false;
		}
	});

	/** @param {any[]} orgs */
	async function loadDevicesForOrganizations(orgs) {
		if (!orgs?.length) {
			devices = [];
			return;
		}
		try {
			const perOrg = await Promise.all(
				orgs.map((/** @type {any} */ org) =>
					DevicesService.getAll({ client_id: org.id }).catch(() => [])
				)
			);
			const seen = new Set();
			devices = perOrg.flat().filter((/** @type {any} */ d) => {
				if (!d?.device_id || seen.has(d.device_id)) return false;
				seen.add(d.device_id);
				return true;
			});
		} catch (err) {
			console.warn('Could not fetch devices for this account:', err);
			devices = [];
		}
	}

	function handleAddDevice() {
		goto('/products/nexus/devices');
	}

	async function handleManualPayment() {
		if (!organizationId || !planId) {
			toast.error('Selecciona organización y plan');
			return;
		}

		const units = parseInt(activeUnits, 10);
		if (!Number.isFinite(units) || units < 1) {
			toast.error('Unidades activas inválidas');
			return;
		}

		const authState = get(auth);
		const operatorEmail = authState.user?.email || authState.user?.username || undefined;

		isSubmitting = true;
		try {
			const result = await BillingService.registerManualPayment({
				account_id: clientId,
				organization_id: organizationId,
				plan_id: planId,
				billing_cycle: /** @type {'MONTHLY' | 'YEARLY'} */ (billingCycle),
				active_units: units,
				transaction_ref: transactionRef.trim() || undefined,
				registration_notes: registrationNotes.trim() || undefined,
				operator_email: operatorEmail
			});

			lastPaymentResult = result;
			await loadAccountData();

			toast.success(
				`Pago registrado — ${result.amount} ${result.currency}. La suscripción ya está activa.`
			);
			transactionRef = '';
			registrationNotes = '';
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error desconocido';
			toast.error('No se pudo registrar el pago: ' + message);
		} finally {
			isSubmitting = false;
		}
	}

	function resetPaymentForm() {
		lastPaymentResult = null;
	}
</script>

<div class="flex min-h-screen flex-col bg-app text-app">
	<Topbar
		title={isLoading ? 'Cargando...' : `Nexus / Cuentas / ${client?.name || 'Desconocido'}`}
		backUrl="/products/nexus"
	/>

	<div class="space-y-6 p-8">
		<Card class="p-6">
			<h2 class="mb-4 text-lg font-semibold text-app">Información del Cliente</h2>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
				<div>
					<p class="text-sm text-app-muted">Nombre</p>
					<p class="font-medium text-app">{client?.name || '-'}</p>
				</div>
				<div>
					<p class="text-sm text-app-muted">Estatus</p>
					<p class="font-medium">
						<span
							class={`gac-badge ${
								client?.status === 'ACTIVE'
									? 'gac-badge-success'
									: client?.status === 'PENDING'
										? 'gac-badge-warning'
										: client?.status === 'SUSPENDED'
											? 'gac-badge-danger'
											: 'gac-badge-neutral'
							}`}
						>
							{client?.status || '-'}
						</span>
					</p>
				</div>
				<div>
					<p class="text-sm text-app-muted">Creado</p>
					<p class="font-medium text-app">{client?.formattedCreated || '-'}</p>
				</div>
				<div class="md:col-span-2">
					<p class="text-sm text-app-muted">ID comercial GAC</p>
					<p class="mt-1 break-all font-mono text-xs text-app">
						{clientId ? toCommercialClientId(clientId) : '—'}
					</p>
					<p class="mt-1 text-xs text-app-muted">Mismo UUID que la cuenta Nexus (client_id)</p>
				</div>
				<div class="md:col-span-2">
					<p class="text-sm text-app-muted">Servicio Nexus</p>
					<p class="mb-1 mt-1">
						<span class={nexusBadge.badgeClass}>{nexusBadge.label}</span>
					</p>
					<p class="text-sm font-medium text-app">{nexusDetail}</p>
					{#if client?.active_organization_name}
						<p class="mt-1 text-xs text-app-muted">
							Org: {client.active_organization_name}
						</p>
					{/if}
					{#if client?.active_subscription_id}
						<p class="mt-1 font-mono text-xs text-app-muted">
							{client.active_subscription_id}
						</p>
					{/if}
				</div>
			</div>
		</Card>

		<Card class="p-6">
			<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="text-lg font-semibold text-app">Pago en efectivo</h2>
					<p class="mt-1 text-sm text-app-muted">
						Registra el cobro y activa la suscripción Nexus de inmediato. El monto se calcula en el
						servidor según el plan y las unidades.
					</p>
				</div>
				{#if paymentJustCompleted}
					<span class="gac-badge gac-badge-success shrink-0">Pago registrado</span>
				{:else if hasActiveNexus}
					<span class="gac-badge gac-badge-success shrink-0">Ya con servicio activo</span>
				{:else}
					<span class="gac-badge gac-badge-warning shrink-0">Pendiente de activar</span>
				{/if}
			</div>

			{#if hasActiveNexus && !paymentJustCompleted}
				<p class="mb-4 text-sm text-app-muted">
					Este cliente ya tiene una suscripción vigente. Puedes registrar otro cobro para renovar o
					activar otra organización.
				</p>
			{/if}

			{#if paymentJustCompleted && lastPaymentResult}
				<div
					class="mb-6 rounded-lg border p-4"
					style="border-color: var(--color-success, #22c55e); background: color-mix(in srgb, var(--color-success, #22c55e) 8%, transparent)"
					role="status"
				>
					<p class="font-semibold text-app">Pago registrado y suscripción activa</p>
					<p class="mt-1 text-sm text-app-muted">
						El cliente ya puede usar Nexus con esta organización. No es necesario volver a enviar el
						formulario salvo un nuevo cobro.
					</p>
					<dl class="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
						<div>
							<dt class="text-app-muted">Organización</dt>
							<dd class="font-medium text-app">
								{selectedOrgName || lastPaymentResult.organization_id}
							</dd>
						</div>
						<div>
							<dt class="text-app-muted">Plan</dt>
							<dd class="font-medium text-app">{selectedPlanName || lastPaymentResult.plan_id}</dd>
						</div>
						<div>
							<dt class="text-app-muted">Monto cobrado</dt>
							<dd class="font-medium text-app">
								{lastPaymentResult.amount}
								{lastPaymentResult.currency}
							</dd>
						</div>
						<div>
							<dt class="text-app-muted">Ciclo / unidades</dt>
							<dd class="font-medium text-app">
								{lastPaymentResult.billing_cycle === 'YEARLY' ? 'Anual' : 'Mensual'} ·
								{lastPaymentResult.active_units} unidad(es)
							</dd>
						</div>
						<div class="sm:col-span-2">
							<dt class="text-app-muted">ID suscripción</dt>
							<dd class="font-mono text-xs text-app">{lastPaymentResult.subscription_id}</dd>
						</div>
						<div class="sm:col-span-2">
							<dt class="text-app-muted">ID pago</dt>
							<dd class="font-mono text-xs text-app">{lastPaymentResult.payment_id}</dd>
						</div>
					</dl>
				</div>
			{/if}

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				<div>
					<label for="organization" class="gac-label">Organización</label>
					<select
						id="organization"
						class="gac-input w-full"
						bind:value={organizationId}
						disabled={paymentJustCompleted || isSubmitting || organizations.length === 0}
					>
						<option value="">Seleccionar...</option>
						{#each organizations as org (org.id)}
							<option value={org.id}>
								{org.name}{org.nexus_service_status === 'active'
									? ' · servicio activo'
									: ' · sin servicio'}
							</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="plan" class="gac-label">Plan</label>
					<select
						id="plan"
						class="gac-input w-full"
						bind:value={planId}
						disabled={paymentJustCompleted || isSubmitting || plans.length === 0}
					>
						<option value="">Seleccionar...</option>
						{#each plans as plan (plan.id)}
							<option value={plan.id}>
								{plan.name} ({plan.code})
							</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="billing-cycle" class="gac-label">Ciclo</label>
					<select
						id="billing-cycle"
						class="gac-input w-full"
						bind:value={billingCycle}
						disabled={paymentJustCompleted || isSubmitting}
					>
						<option value="MONTHLY">Mensual</option>
						<option value="YEARLY">Anual</option>
					</select>
				</div>

				<Input
					label="Unidades activas"
					id="active-units"
					type="number"
					bind:value={activeUnits}
					disabled={paymentJustCompleted || isSubmitting}
					required
				/>

				<Input
					label="Referencia / recibo"
					id="transaction-ref"
					bind:value={transactionRef}
					placeholder="REC-001, folio caja..."
					disabled={paymentJustCompleted || isSubmitting}
				/>

				<div class="md:col-span-2 lg:col-span-3">
					<Input
						label="Notas"
						id="registration-notes"
						bind:value={registrationNotes}
						placeholder="Detalle del cobro (opcional)"
						disabled={paymentJustCompleted || isSubmitting}
					/>
				</div>
			</div>

			<div class="mt-6 flex flex-wrap justify-end gap-3">
				{#if paymentJustCompleted}
					<Button variant="outline" onclick={resetPaymentForm}>Registrar otro cobro</Button>
					<Button disabled={true}>Suscripción activa</Button>
				{:else}
					<Button
						onclick={handleManualPayment}
						disabled={isSubmitting || isLoading || !organizationId || !planId}
					>
						{isSubmitting ? 'Registrando...' : 'Registrar pago y activar'}
					</Button>
				{/if}
			</div>
		</Card>

		{#if clientId}
			<AccountCommerceSection accountId={clientId} />
		{/if}

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<Card class="h-full overflow-hidden">
				<div
					class="flex items-center justify-between p-4"
					style="border-bottom: 1px solid var(--color-border)"
				>
					<h3 class="font-semibold text-app">Dispositivos Asignados</h3>
					<Button variant="outline" size="sm" onclick={handleAddDevice}>Asignar Dispositivo</Button>
				</div>
				<div class="overflow-x-auto">
					<table class="gac-table">
						<thead>
							<tr>
								<th>Device ID</th>
								<th>Marca</th>
								<th>Modelo</th>
							</tr>
						</thead>
						<tbody>
							{#if devices.length === 0}
								<tr>
									<td colspan="3" class="px-4 py-6 text-center text-app-muted">
										Sin dispositivos asignados.
									</td>
								</tr>
							{:else}
								{#each devices as device (device.device_id)}
									<tr
										class="cursor-pointer"
										onclick={async () =>
											await goto(`/products/nexus/devices?device_id=${device.device_id}`)}
									>
										<td class="font-medium" style="color: var(--color-accent)">
											{device.device_id}
										</td>
										<td>{device.brand}</td>
										<td>{device.model}</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</Card>

			<Card class="h-full overflow-hidden">
				<div class="p-4" style="border-bottom: 1px solid var(--color-border)">
					<h3 class="font-semibold text-app">Unidades</h3>
				</div>
				<div class="overflow-x-auto">
					<table class="gac-table">
						<thead>
							<tr>
								<th>Nombre</th>
								<th>Placas</th>
								<th>Vehículo</th>
								<th>Dispositivo</th>
							</tr>
						</thead>
						<tbody>
							{#if units.length === 0}
								<tr>
									<td colspan="4" class="px-4 py-6 text-center text-app-muted">
										Sin unidades registradas.
									</td>
								</tr>
							{:else}
								{#each units as unit (unit.name)}
									<tr>
										<td class="font-medium text-app">{unit.name}</td>
										<td>{unit.plate}</td>
										<td>{unit.brand} {unit.model}</td>
										<td class="text-app-muted">{unit.device}</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</Card>
		</div>
	</div>
</div>
