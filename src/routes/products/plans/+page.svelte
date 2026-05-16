<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import PlanDetail from '$lib/components/nexus/PlanDetail.svelte';
	import { PlansService } from '$lib/services/plans';
	import { onMount } from 'svelte';

	/** @type {import('$lib/services/plans').Plan[]} */
	let plans = $state([]);
	let isLoading = $state(true);
	let searchTerm = $state('');
	let productFilter = $state('');
	/** @type {string | null} */
	let selectedPlanId = $state(null);

	let filteredPlans = $derived(
		plans.filter((p) => {
			const term = searchTerm.toLowerCase();
			const matchesSearch =
				p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term);
			if (!productFilter) return matchesSearch;
			const hasProduct = (p.products || []).some((prod) => prod.code === productFilter);
			return matchesSearch && hasProduct;
		})
	);

	let selectedPlan = $derived(plans.find((p) => p.id === selectedPlanId));

	let productOptions = $derived.by(() => {
		/** @type {Record<string, { code: string; name?: string }>} */
		const byCode = {};
		for (const p of plans) {
			for (const prod of p.products || []) {
				if (!byCode[prod.code]) byCode[prod.code] = prod;
			}
		}
		return Object.values(byCode);
	});

	onMount(loadPlans);

	async function loadPlans() {
		isLoading = true;
		try {
			const response = await PlansService.getAll();
			plans = Array.isArray(response) ? response : response?.plans || response?.data || [];
		} catch (error) {
			console.error('Error loading plans:', error);
		} finally {
			isLoading = false;
		}
	}

	/** @param {string} id */
	function handleRowClick(id) {
		selectedPlanId = id;
	}
</script>

<div class="flex h-screen flex-col overflow-hidden bg-app">
	<Topbar title="Planes" subtitle="Configuración de planes y capacidades" backUrl="/">
		<a href="/products/plans/new">
			<Button variant="primary" size="sm">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="mr-1.5"
					aria-hidden="true"
				>
					<path d="M5 12h14" />
					<path d="M12 5v14" />
				</svg>
				Nuevo plan
			</Button>
		</a>
	</Topbar>

	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- TOP: tabla -->
		<div
			class="flex h-[42%] flex-col border-b"
			style="border-color: var(--color-border); background-color: var(--color-bg-secondary)"
		>
			<div
				class="z-sticky flex items-center justify-between gap-4 border-b p-4"
				style="border-color: var(--color-border)"
			>
				<div class="flex flex-1 gap-3">
					<div class="flex-1">
						<Input placeholder="Filtrar por nombre o código…" bind:value={searchTerm} />
					</div>
					<div class="w-64">
						<select bind:value={productFilter} class="gac-input">
							<option value="">Todos los productos</option>
							{#each productOptions as product (product.code)}
								<option value={product.code}>{product.name}</option>
							{/each}
						</select>
					</div>
				</div>
				<Button variant="ghost" size="sm" onclick={loadPlans} disabled={isLoading}>
					Actualizar
				</Button>
			</div>

			<div class="flex-1 overflow-y-auto">
				<table class="gac-table">
					<thead class="sticky top-0">
						<tr>
							<th>Nombre</th>
							<th>Código</th>
							<th>Producto</th>
							<th>Precio mensual</th>
							<th>Precio anual</th>
							<th>Estado</th>
						</tr>
					</thead>
					<tbody>
						{#if isLoading}
							<tr>
								<td colspan="6" class="py-8 text-center text-app-muted">Cargando planes…</td>
							</tr>
						{:else if filteredPlans.length === 0}
							<tr>
								<td colspan="6" class="py-8 text-center text-app-muted">
									No se encontraron planes.
								</td>
							</tr>
						{:else}
							{#each filteredPlans as plan (plan.id)}
								<tr
									class="cursor-pointer"
									style={selectedPlanId === plan.id
										? 'background-color: var(--color-accent-soft)'
										: ''}
									onclick={() => plan.id && handleRowClick(plan.id)}
								>
									<td class="font-medium text-app">{plan.name}</td>
									<td class="font-mono text-xs uppercase text-accent">{plan.code}</td>
									<td>
										{#if plan.products && plan.products.length > 0}
											<span class="text-sm text-app-secondary">{plan.products[0].name}</span>
										{:else}
											<span class="text-xs italic text-app-muted">Sin producto</span>
										{/if}
									</td>
									<td class="text-app-secondary">${plan.price_monthly}</td>
									<td class="text-app-secondary">${plan.price_yearly}</td>
									<td>
										{#if plan.is_active}
											<span class="gac-badge gac-badge-success">Activo</span>
										{:else}
											<span class="gac-badge gac-badge-neutral">Inactivo</span>
										{/if}
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<!-- BOTTOM: detalle del plan -->
		<div class="h-[58%] overflow-hidden bg-app">
			{#if selectedPlan}
				<PlanDetail plan={selectedPlan} onSave={loadPlans} />
			{:else}
				<div class="flex h-full flex-col items-center justify-center text-app-muted">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="48"
						height="48"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="mb-4 opacity-60"
						aria-hidden="true"
					>
						<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
						<line x1="3" y1="10" x2="21" y2="10" />
						<line x1="9" y1="22" x2="9" y2="10" />
					</svg>
					<p class="text-lg font-medium text-app">Selecciona un plan</p>
					<p class="text-sm">Elige un plan de la tabla superior para ver y editar sus detalles.</p>
				</div>
			{/if}
		</div>
	</div>
</div>
