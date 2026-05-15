<script>
	import { onMount, untrack } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { PlansService } from '$lib/services/plans';
	import { ProductsService } from '$lib/services/products';
	import { toast } from '$lib/stores/toast';

	/** @type {{
	 * 	plan: import('$lib/services/plans').Plan,
	 * 	onSave?: () => void
	 * }} */
	let { plan: initialPlan, onSave } = $props();

	/** @type {import('$lib/services/plans').Plan} */
	// svelte-ignore state_referenced_locally
	let plan = $state(structuredClone(initialPlan));
	let isSaving = $state(false);

	/** @type {any[]} */
	let availableProducts = $state([]);
	/** @type {any[]} */
	let availableCapabilities = $state([]);

	/** @type {Record<string, any>} */
	let capabilityValues = $state({});
	/** @type {string} */
	let selectedProductCode = $state('');

	onMount(async () => {
		try {
			const [productsResponse, caps] = await Promise.all([
				ProductsService.getAll({ is_active: true }),
				PlansService.getAvailableCapabilities()
			]);
			availableProducts = productsResponse?.products || productsResponse?.data || [];
			availableCapabilities = Array.isArray(caps) ? caps : [];
		} catch (err) {
			console.error('Error loading catalogs:', err);
			toast.error('Error al cargar catálogos');
		}
	});

	$effect(() => {
		const planId = initialPlan?.id;
		if (!planId) return;
		untrack(() => {
			plan = structuredClone(initialPlan);
			const products = plan.products || [];
			selectedProductCode = products.length > 0 ? products[0].code : '';
			/** @type {Record<string, any>} */
			const vals = {};
			(plan.capabilities || []).forEach((c) => {
				vals[c.capability_code] = c.value !== undefined ? c.value : (c.value_int ?? c.value_bool);
			});
			capabilityValues = vals;
		});
	});

	/** @param {SubmitEvent} e */
	async function handleSubmit(e) {
		e.preventDefault();
		if (!selectedProductCode) {
			toast.error('Debe seleccionar un producto antes de guardar');
			return;
		}

		isSaving = true;
		try {
			/** @type {import('$lib/services/plans').PlanCapability[]} */
			const capabilities = Object.entries(capabilityValues).map(([code, value]) => {
				const def = availableCapabilities.find((d) => d.code === code);
				/** @type {import('$lib/services/plans').PlanCapability} */
				const item = { capability_code: code };
				if (def?.value_type === 'int') item.value_int = parseInt(String(value), 10);
				else if (def?.value_type === 'bool') item.value_bool = !!value;
				else item.value = value;
				return item;
			});

			/** @type {Partial<import('$lib/services/plans').Plan>} */
			const updateData = {
				name: plan.name,
				code: plan.code,
				description: plan.description,
				price_monthly: plan.price_monthly,
				price_yearly: plan.price_yearly,
				is_active: plan.is_active,
				product_codes: [selectedProductCode],
				capabilities
			};

			if (!plan.id) {
				throw new Error('No se puede actualizar un plan sin ID');
			}
			await PlansService.update(plan.id, updateData);
			toast.success('Plan actualizado correctamente');
			onSave?.();
		} catch (err) {
			console.error('Error updating plan:', err);
			toast.error('Error al guardar el plan');
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="flex h-full flex-col bg-app-deep">
	<form onsubmit={handleSubmit} class="flex h-full flex-col">
		<div
			class="flex items-center justify-between border-b p-4"
			style="border-color: var(--color-border); background-color: var(--color-bg-tertiary)"
		>
			<div>
				<h3 class="text-sm font-bold uppercase tracking-wider text-app">
					Detalle del plan: {plan.name}
				</h3>
				<p class="font-mono text-xs text-app-muted">ID: {plan.id}</p>
			</div>
			<div class="flex gap-2">
				<Button type="submit" variant="primary" size="sm" disabled={isSaving}>
					{isSaving ? 'Guardando…' : 'Guardar cambios'}
				</Button>
			</div>
		</div>

		<div class="flex-1 space-y-8 overflow-y-auto p-6">
			<!-- Información general -->
			<section class="space-y-4">
				<div
					class="flex items-center justify-between border-b pb-2"
					style="border-color: var(--color-border)"
				>
					<h4 class="text-xs font-bold uppercase tracking-widest text-app-muted">
						Información general
					</h4>
					<label class="flex cursor-pointer items-center gap-2">
						<span class="text-xs font-medium text-app-muted">Activo</span>
						<div class="relative inline-flex items-center">
							<input type="checkbox" bind:checked={plan.is_active} class="peer sr-only" />
							<div
								class="peer h-4 w-8 rounded-full transition-colors peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:h-3 after:w-3 after:rounded-full after:bg-white after:transition-all"
								style="background-color: {plan.is_active
									? 'var(--color-success)'
									: 'var(--color-bg-elevated)'}"
							></div>
						</div>
					</label>
				</div>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Input label="Nombre del plan" bind:value={plan.name} required />
					<Input label="Código" bind:value={plan.code} required />
					<div class="md:col-span-2">
						<Input label="Descripción" bind:value={plan.description} />
					</div>
				</div>
			</section>

			<!-- Precios -->
			<section class="space-y-4">
				<h4
					class="border-b pb-2 text-xs font-bold uppercase tracking-widest text-app-muted"
					style="border-color: var(--color-border)"
				>
					Precios (MXN)
				</h4>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Input label="Precio mensual" type="number" bind:value={plan.price_monthly} required />
					<Input label="Precio anual" type="number" bind:value={plan.price_yearly} required />
				</div>
			</section>

			<!-- Producto -->
			<section class="space-y-4">
				<h4
					class="border-b pb-2 text-xs font-bold uppercase tracking-widest text-app-muted"
					style="border-color: var(--color-border)"
				>
					Producto asociado <span class="text-danger">*</span>
				</h4>
				{#if !selectedProductCode}
					<p class="text-sm text-danger">Debe seleccionar un producto antes de guardar el plan.</p>
				{/if}
				<div class="space-y-3">
					{#each availableProducts as product (product.code)}
						{@const active = selectedProductCode === product.code}
						<label
							class="flex cursor-pointer items-center rounded-lg border p-3 transition-colors"
							style={active
								? 'background-color: var(--color-accent-soft); border-color: var(--color-accent-primary);'
								: 'background-color: var(--color-bg-elevated); border-color: var(--color-border);'}
						>
							<input
								type="radio"
								name="product"
								value={product.code}
								bind:group={selectedProductCode}
								class="h-4 w-4"
								style="accent-color: var(--color-accent-primary)"
								required
							/>
							<div class="ml-3 min-w-0">
								<p class="text-sm font-medium text-app">{product.name}</p>
								<p class="font-mono text-xs text-app-muted">{product.code}</p>
								{#if product.description}
									<p class="mt-1 text-xs text-app-muted">{product.description}</p>
								{/if}
							</div>
						</label>
					{/each}
				</div>
			</section>

			<!-- Capabilities -->
			<section class="space-y-4">
				<h4
					class="border-b pb-2 text-xs font-bold uppercase tracking-widest text-app-muted"
					style="border-color: var(--color-border)"
				>
					Capabilities y límites
				</h4>
				<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{#each availableCapabilities as cap (cap.code)}
						<div class="flex flex-col gap-1.5">
							<span class="text-xs font-medium text-app-muted" title={cap.description}>
								{cap.code}
							</span>
							{#if cap.value_type === 'bool'}
								<label class="relative mt-1 inline-flex cursor-pointer items-center">
									<input
										type="checkbox"
										bind:checked={capabilityValues[cap.code]}
										class="peer sr-only"
									/>
									<div
										class="peer h-5 w-9 rounded-full transition-colors peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all"
										style="background-color: {capabilityValues[cap.code]
											? 'var(--color-accent-primary)'
											: 'var(--color-bg-elevated)'}"
									></div>
									<span class="ml-3 text-sm text-app-secondary">
										{capabilityValues[cap.code] ? 'Habilitado' : 'Deshabilitado'}
									</span>
								</label>
							{:else}
								<input
									type="number"
									bind:value={capabilityValues[cap.code]}
									class="gac-input h-9"
								/>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		</div>
	</form>
</div>
