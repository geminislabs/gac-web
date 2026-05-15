<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { ProductsService } from '$lib/services/products';
	import { onMount } from 'svelte';

	/** @type {any[]} */
	let products = $state([]);
	let isLoading = $state(true);

	async function loadProducts() {
		isLoading = true;
		try {
			const apiProducts = await ProductsService.getAll();
			const list = apiProducts?.products || apiProducts?.data || [];

			if (list.length > 0) {
				products = list.map((/** @type {any} */ p) => ({
					...p,
					icon: p.icon || 'Box',
					status: p.status || (p.is_active ? 'active' : 'inactive'),
					href: p.href || '/products/catalog'
				}));
			} else {
				products = [];
			}
		} catch (error) {
			console.error('Error loading products:', error);
			products = [];
		} finally {
			isLoading = false;
		}
	}

	onMount(loadProducts);
</script>

<div class="flex min-h-screen flex-col">
	<Topbar title="Productos" />

	<div class="p-6 sm:p-8">
		{#if isLoading}
			<div class="flex h-64 items-center justify-center">
				<div
					class="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
					style="border-color: var(--color-accent-primary); border-top-color: transparent"
					aria-label="Cargando"
				></div>
			</div>
		{:else if products.length === 0}
			<Card padding>
				<p class="text-center text-app-muted">No hay productos disponibles.</p>
			</Card>
		{:else}
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each products as product (product.id || product.code)}
					<Card
						hover
						class="flex h-full flex-col {product.status === 'coming_soon' ? 'opacity-75' : ''}"
					>
						<div class="flex flex-1 flex-col p-6">
							<div class="mb-4 flex items-center justify-between">
								<div
									class="rounded-lg p-3"
									style={product.status === 'active'
										? 'background-color: var(--color-accent-soft); color: var(--color-accent-primary)'
										: 'background-color: var(--color-bg-tertiary); color: var(--color-text-muted)'}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="24"
										height="24"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										aria-hidden="true"
									>
										<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
										<polyline points="3.27 6.96 12 12.01 20.73 6.96" />
										<line x1="12" y1="22.08" x2="12" y2="12" />
									</svg>
								</div>
								{#if product.status === 'coming_soon'}
									<span class="gac-badge gac-badge-neutral">Próximamente</span>
								{:else if !product.is_active}
									<span class="gac-badge gac-badge-neutral">Inactivo</span>
								{/if}
							</div>

							<h3 class="mb-2 text-lg font-semibold text-app">{product.name}</h3>
							<p class="mb-6 flex-1 text-sm text-app-secondary">
								{product.description || 'Sin descripción disponible.'}
							</p>

							{#if product.status === 'active' || product.is_active}
								<a href={product.href} class="w-full">
									<Button variant="secondary" fullWidth>
										<span class="flex w-full items-center justify-between">
											Entrar al módulo
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
												aria-hidden="true"
											>
												<path d="M5 12h14" />
												<path d="m12 5 7 7-7 7" />
											</svg>
										</span>
									</Button>
								</a>
							{:else}
								<Button variant="ghost" disabled fullWidth>No disponible</Button>
							{/if}
						</div>
					</Card>
				{/each}
			</div>
		{/if}
	</div>
</div>
