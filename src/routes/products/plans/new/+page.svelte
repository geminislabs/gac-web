<script>
	import { onMount } from 'svelte';
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { PlansService } from '$lib/services/plans';
	import { goto } from '$app/navigation';

	/** @type {Partial<import('$lib/services/plans').Plan>} */
	let plan = $state({
		name: '',
		code: '',
		description: '',
		price_monthly: '0.00',
		price_yearly: '0.00',
		is_active: true
	});

	let isSaving = $state(false);
	/** @type {string | null} */
	let error = $state(null);

	/** @type {import('$lib/services/plans').AvailableProduct[]} */
	let availableProducts = $state([]);
	/** @type {import('$lib/services/plans').AvailableCapability[]} */
	let availableCapabilities = $state([]);

	/** @type {Record<string, any>} */
	let capabilityValues = $state({});
	/** @type {string[]} */
	let productCodes = $state([]);

	onMount(async () => {
		try {
			const [products, caps] = await Promise.all([
				PlansService.getAvailableProducts(),
				PlansService.getAvailableCapabilities()
			]);
			availableProducts = products;
			availableCapabilities = caps;

			/** @type {Record<string, any>} */
			const defaults = {};
			caps.forEach((cap) => {
				defaults[cap.code] = cap.value_type === 'bool' ? false : 0;
			});
			capabilityValues = defaults;
		} catch (err) {
			console.error('Error loading catalogs:', err);
		}
	});

	/** @param {SubmitEvent} e */
	async function handleSubmit(e) {
		e.preventDefault();
		isSaving = true;
		error = null;

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
			const creationData = {
				...plan,
				product_codes: productCodes,
				capabilities
			};

			await PlansService.create(creationData);
			await goto('/products/plans');
		} catch (err) {
			console.error('Error creating plan:', err);
			error = err instanceof Error ? err.message : 'Error al crear el plan';
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="flex flex-col min-h-screen bg-app text-app">
	<Topbar title="Nuevo Plan" backUrl="/products/plans" />

	<div class="flex-1 p-8">
		<div class="mx-auto max-w-4xl">
			<form onsubmit={handleSubmit} class="space-y-6">
				<div class="mb-8 flex items-center justify-between">
					<h2 class="text-2xl font-bold text-app">Crear Nuevo Plan</h2>
					<div class="flex gap-3">
						<a href="/products/plans">
							<Button variant="outline" type="button">Cancelar</Button>
						</a>
						<Button type="submit" variant="primary" disabled={isSaving}>
							{isSaving ? 'Creando...' : 'Crear Plan'}
						</Button>
					</div>
				</div>

				{#if error}
					<div
						class="rounded-lg p-4 text-sm"
						style="background: var(--color-danger-bg); color: var(--color-danger); border: 1px solid var(--color-danger)"
					>
						{error}
					</div>
				{/if}

				<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
					<div class="space-y-6 lg:col-span-2">
						<div class="gac-panel space-y-4 p-6">
							<h3
								class="pb-2 text-sm font-bold uppercase tracking-widest text-app-muted"
								style="border-bottom: 1px solid var(--color-border)"
							>
								Información Básica
							</h3>
							<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
								<Input
									label="Nombre del Plan"
									bind:value={plan.name}
									required
									placeholder="Ej: Plan Pro"
								/>
								<Input label="Código" bind:value={plan.code} required placeholder="Ej: pro" />
								<div class="md:col-span-2">
									<Input
										label="Descripción"
										bind:value={plan.description}
										placeholder="Descripción breve del plan"
									/>
								</div>
							</div>
						</div>

						<div class="gac-panel space-y-4 p-6">
							<h3
								class="pb-2 text-sm font-bold uppercase tracking-widest text-app-muted"
								style="border-bottom: 1px solid var(--color-border)"
							>
								Precios (MXN)
							</h3>
							<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
								<Input
									label="Precio Mensual"
									type="number"
									bind:value={plan.price_monthly}
									required
								/>
								<Input
									label="Precio Anual"
									type="number"
									bind:value={plan.price_yearly}
									required
								/>
							</div>
						</div>

						<div class="gac-panel space-y-4 p-6">
							<h3
								class="pb-2 text-sm font-bold uppercase tracking-widest text-app-muted"
								style="border-bottom: 1px solid var(--color-border)"
							>
								Productos Asociados
							</h3>
							<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
								{#each availableProducts as product (product.code)}
									<label
										class="flex cursor-pointer items-center rounded-lg p-3 transition-colors"
										style="border: 1px solid {productCodes.includes(product.code)
											? 'var(--color-accent)'
											: 'var(--color-border)'}; background: {productCodes.includes(
											product.code
										)
											? 'var(--color-accent-soft)'
											: 'transparent'}"
									>
										<input
											type="checkbox"
											value={product.code}
											bind:group={productCodes}
											class="h-4 w-4 rounded"
											style="accent-color: var(--color-accent)"
										/>
										<div class="ml-3">
											<p class="text-sm font-medium text-app">{product.name}</p>
											<p class="text-xs text-app-muted">{product.code}</p>
										</div>
									</label>
								{/each}
							</div>
						</div>

						<div class="gac-panel space-y-4 p-6">
							<h3
								class="pb-2 text-sm font-bold uppercase tracking-widest text-app-muted"
								style="border-bottom: 1px solid var(--color-border)"
							>
								Capabilities & Límites
							</h3>
							<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
								{#each availableCapabilities as cap (cap.code)}
									<div class="flex flex-col space-y-1">
										<span class="text-xs font-medium text-app-muted" title={cap.description}>
											{cap.code}
										</span>
										{#if cap.value_type === 'bool'}
											<label class="gac-toggle mt-1">
												<input
													type="checkbox"
													bind:checked={capabilityValues[cap.code]}
													class="peer sr-only"
												/>
												<span class="gac-toggle-track">
													<span class="gac-toggle-thumb"></span>
												</span>
												<span class="ml-3 text-sm font-medium text-app">
													{capabilityValues[cap.code] ? 'Habilitado' : 'Deshabilitado'}
												</span>
											</label>
										{:else}
											<input
												type="number"
												bind:value={capabilityValues[cap.code]}
												class="gac-input w-full"
											/>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					</div>

					<div class="space-y-6">
						<div class="gac-panel space-y-4 p-6">
							<h3
								class="pb-2 text-sm font-bold uppercase tracking-widest text-app-muted"
								style="border-bottom: 1px solid var(--color-border)"
							>
								Estado
							</h3>
							<label class="flex cursor-pointer items-center space-x-3">
								<input
									type="checkbox"
									bind:checked={plan.is_active}
									class="h-4 w-4 rounded"
									style="accent-color: var(--color-accent)"
								/>
								<span class="text-sm font-medium text-app">Plan Activo</span>
							</label>
							<p class="text-xs italic text-app-muted">
								Los planes inactivos no aparecerán para nuevas suscripciones.
							</p>
						</div>
					</div>
				</div>
			</form>
		</div>
	</div>
</div>
