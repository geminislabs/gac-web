<script>
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import { ClientsService } from '$lib/services/clients';
	import { toast } from '$lib/stores/toast';
	import {
		accountTypeAction,
		brandReadiness,
		capabilityHelp,
		capabilityLabel,
		describeSource,
		formatCapabilityValue,
		initialEditorValue,
		parseCapabilityInput,
		sortCapabilities
	} from '$lib/utils/accountBrand';

	/**
	 * Marca y reventa de una cuenta (B4): convertirla en marca y fijar sus techos
	 * comerciales. Lo valida y lo audita siscom-admin-api (#154); aquí solo se
	 * muestra y se manda.
	 *
	 * @type {{
	 * 	accountId: string,
	 * 	account: { account_type?: string, parent_account_id?: string | null, name?: string },
	 * 	onAccountChange?: (patch: { account_type: string }) => void
	 * }}
	 */
	let { accountId, account, onAccountChange = () => {} } = $props();

	let isLoading = $state(true);
	let loadError = $state('');
	/** @type {import('$lib/services/clients').AccountCapability[]} */
	let capabilities = $state([]);
	/** Valor del editor por código. @type {Record<string, any>} */
	let drafts = $state({});
	/** Motivo por código. @type {Record<string, string>} */
	let reasons = $state({});
	/** Error del editor por código. @type {Record<string, string>} */
	let errors = $state({});
	/** El código que se está guardando o quitando. @type {string | null} */
	let busyCode = $state(null);

	let typeBusy = $state(false);
	let confirmOpen = $state(false);

	let typeAction = $derived(accountTypeAction(account?.account_type));
	let readiness = $derived(brandReadiness(account, capabilities));

	$effect(() => {
		if (!accountId) return;
		loadCapabilities(accountId);
	});

	/** @param {import('$lib/services/clients').AccountCapability[]} list */
	function adopt(list) {
		capabilities = sortCapabilities(list);
		drafts = Object.fromEntries(capabilities.map((c) => [c.code, initialEditorValue(c)]));
		reasons = Object.fromEntries(capabilities.map((c) => [c.code, c.reason ?? '']));
		errors = {};
	}

	/** @param {string} id */
	async function loadCapabilities(id) {
		isLoading = true;
		loadError = '';
		try {
			adopt(await ClientsService.getCapabilities(id));
		} catch (error) {
			console.error('Error loading account capabilities:', error);
			loadError = 'No se pudieron cargar las capabilities de la cuenta.';
			capabilities = [];
		} finally {
			isLoading = false;
		}
	}

	/** @param {import('$lib/services/clients').AccountCapability} capability */
	async function save(capability) {
		const parsed = parseCapabilityInput(capability.value_type, drafts[capability.code]);
		if (!parsed.ok) {
			errors = { ...errors, [capability.code]: parsed.error };
			return;
		}
		errors = { ...errors, [capability.code]: '' };
		busyCode = capability.code;
		try {
			const updated = await ClientsService.setCapability(accountId, capability.code, {
				value: parsed.value,
				reason: reasons[capability.code]?.trim() || null
			});
			replace(updated);
			if (updated.effective_value !== updated.own_value) {
				toast.info(
					`${capabilityLabel(capability.code)}: se guardó, pero rige ${formatCapabilityValue(updated.effective_value)}. ${describeSource(updated)}`
				);
			} else {
				toast.success(`${capabilityLabel(capability.code)} actualizado`);
			}
		} catch (error) {
			console.error('Error saving capability:', error);
			toast.error(error instanceof Error ? error.message : 'No se pudo guardar');
		} finally {
			busyCode = null;
		}
	}

	/** @param {import('$lib/services/clients').AccountCapability} capability */
	async function remove(capability) {
		busyCode = capability.code;
		try {
			await ClientsService.removeCapability(accountId, capability.code);
			// El efectivo depende de los ancestros: se vuelve a pedir, no se adivina.
			adopt(await ClientsService.getCapabilities(accountId));
			toast.success(`${capabilityLabel(capability.code)}: vuelve a heredar`);
		} catch (error) {
			console.error('Error removing capability:', error);
			toast.error(error instanceof Error ? error.message : 'No se pudo quitar');
		} finally {
			busyCode = null;
		}
	}

	/** @param {import('$lib/services/clients').AccountCapability} updated */
	function replace(updated) {
		capabilities = capabilities.map((c) => (c.code === updated.code ? updated : c));
		drafts = { ...drafts, [updated.code]: initialEditorValue(updated) };
		reasons = { ...reasons, [updated.code]: updated.reason ?? '' };
	}

	async function changeType() {
		if (!typeAction.action) return;
		const next = typeAction.action === 'to_reseller' ? 'RESELLER' : 'CUSTOMER';
		typeBusy = true;
		try {
			/** @type {any} */
			const result = await ClientsService.setAccountType(accountId, next);
			onAccountChange({ account_type: result?.account_type ?? next });
			toast.success(
				next === 'RESELLER' ? 'La cuenta ahora es marca' : 'La cuenta es cliente final'
			);
		} catch (error) {
			console.error('Error changing account type:', error);
			toast.error(error instanceof Error ? error.message : 'No se pudo cambiar el tipo');
		} finally {
			typeBusy = false;
			confirmOpen = false;
		}
	}
</script>

<Card class="p-6">
	<div class="mb-4 flex flex-wrap items-start justify-between gap-3">
		<div>
			<h2 class="text-lg font-semibold text-app">Marca y reventa</h2>
			<p class="mt-1 max-w-2xl text-sm text-app-muted">
				Convertir la cuenta en marca no concede nada por sí solo: la marca propia la habilita «Marca
				propia» y la reventa «Reventa». Un valor que pida más que el de una cuenta superior se
				guarda, pero rige recortado.
			</p>
		</div>
		<div class="flex items-center gap-2">
			<span
				class={typeAction.isBrand ? 'gac-badge gac-badge-success' : 'gac-badge gac-badge-neutral'}
			>
				{account?.account_type || '—'}
			</span>
			{#if typeAction.action}
				<Button
					variant={typeAction.action === 'to_reseller' ? 'primary' : 'outline'}
					size="sm"
					disabled={typeBusy || !account?.account_type}
					onclick={() => (confirmOpen = true)}
				>
					{typeAction.label}
				</Button>
			{/if}
		</div>
	</div>

	<ul
		class="mb-5 flex flex-wrap gap-x-5 gap-y-1 text-sm"
		aria-label="Lista para la pantalla de marca"
	>
		{#each readiness.steps as step (step.id)}
			<li class={step.done ? 'text-app' : 'text-app-muted'}>
				<span aria-hidden="true">{step.done ? '✓' : '○'}</span>
				{step.label}
			</li>
		{/each}
		<li class="font-medium {readiness.ready ? 'text-app' : 'text-app-muted'}">
			{readiness.ready
				? 'Lista: su owner ya ve «Marca» en Nexus.'
				: 'Su owner todavía no ve «Marca» en Nexus.'}
		</li>
	</ul>

	{#if isLoading}
		<p class="text-sm text-app-muted">Cargando capabilities…</p>
	{:else if loadError}
		<div class="flex items-center gap-3 text-sm text-app-muted">
			<span>{loadError}</span>
			<Button variant="ghost" size="sm" onclick={() => loadCapabilities(accountId)}
				>Reintentar</Button
			>
		</div>
	{:else}
		<div class="overflow-x-auto rounded-lg border" style="border-color: var(--color-border)">
			<table class="gac-table">
				<thead>
					<tr>
						<th>Capability</th>
						<th>Valor propio</th>
						<th>Rige</th>
						<th>Motivo</th>
						<th class="text-right">Acción</th>
					</tr>
				</thead>
				<tbody>
					{#each capabilities as capability (capability.code)}
						{@const busy = busyCode === capability.code}
						<tr>
							<td>
								<p class="font-medium text-app">{capabilityLabel(capability.code)}</p>
								<p class="text-xs text-app-muted">{capabilityHelp(capability.code)}</p>
								<p class="font-mono text-xs text-app-muted">{capability.code}</p>
							</td>
							<td>
								{#if capability.value_type === 'bool'}
									<label class="inline-flex items-center gap-2 text-sm">
										<input
											type="checkbox"
											bind:checked={drafts[capability.code]}
											disabled={busy}
											aria-label="{capabilityLabel(capability.code)}: valor propio"
										/>
										{drafts[capability.code] ? 'Sí' : 'No'}
									</label>
								{:else}
									<input
										class="gac-input w-28 {errors[capability.code] ? 'gac-input--error' : ''}"
										type="text"
										inputmode="numeric"
										bind:value={drafts[capability.code]}
										disabled={busy}
										aria-label="{capabilityLabel(capability.code)}: valor propio"
										aria-invalid={errors[capability.code] ? 'true' : undefined}
									/>
								{/if}
								{#if errors[capability.code]}
									<p class="mt-1 text-xs" style="color: var(--color-danger)">
										{errors[capability.code]}
									</p>
								{/if}
								<p class="mt-1 text-xs text-app-muted">
									{capability.own_value === null ? 'Sin fila: hereda' : 'Fila propia'}
									{#if capability.expired}· caducada{/if}
								</p>
							</td>
							<td>
								<p class="font-medium text-app">
									{formatCapabilityValue(capability.effective_value)}
								</p>
								<p class="text-xs text-app-muted">
									{describeSource(capability, { [accountId]: account?.name || 'esta cuenta' })}
								</p>
							</td>
							<td>
								<input
									class="gac-input w-44"
									type="text"
									maxlength="500"
									placeholder="Opcional"
									bind:value={reasons[capability.code]}
									disabled={busy}
									aria-label="{capabilityLabel(capability.code)}: motivo"
								/>
							</td>
							<td class="whitespace-nowrap text-right">
								<Button size="sm" disabled={busy} onclick={() => save(capability)}>Guardar</Button>
								{#if capability.own_value !== null}
									<Button
										variant="ghost"
										size="sm"
										disabled={busy}
										title="Borra la fila: la cuenta vuelve a heredar"
										onclick={() => remove(capability)}
									>
										Quitar
									</Button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</Card>

<ConfirmDialog
	bind:isOpen={confirmOpen}
	title={typeAction.action === 'to_reseller'
		? '¿Convertir en marca?'
		: '¿Regresar a cliente final?'}
	message={typeAction.action === 'to_reseller'
		? `«${account?.name ?? 'La cuenta'}» pasa a ser RESELLER. Para que su owner vea «Marca» en Nexus falta habilitar «Marca propia».`
		: `«${account?.name ?? 'La cuenta'}» vuelve a CUSTOMER. Si tiene subcuentas, el servidor lo rechaza.`}
	confirmLabel={typeAction.label}
	variant={typeAction.action === 'to_reseller' ? 'info' : 'danger'}
	onConfirm={changeType}
/>
