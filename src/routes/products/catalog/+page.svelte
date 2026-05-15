<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import { ProductsService } from '$lib/services/products';
	import { toast } from '$lib/stores/toast';

	/** @type {any[]} */
	let products = $state([]);
	let isLoading = $state(false);
	let searchTerm = $state('');
	let activeFilter = $state(/** @type {'active' | 'inactive' | 'all'} */ ('active'));

	let confirmDialog = $state({
		isOpen: false,
		productId: '',
		productName: ''
	});

	let filteredProducts = $derived(
		products.filter((product) => {
			const term = searchTerm.toLowerCase();
			const matchesSearch =
				(product.code || '').toLowerCase().includes(term) ||
				(product.name || '').toLowerCase().includes(term);
			if (activeFilter === 'active') return matchesSearch && product.is_active;
			if (activeFilter === 'inactive') return matchesSearch && !product.is_active;
			return matchesSearch;
		})
	);

	async function loadProducts() {
		isLoading = true;
		try {
			/** @type {Record<string, any>} */
			const filters = {};
			if (activeFilter === 'active') filters.is_active = true;
			if (activeFilter === 'inactive') filters.is_active = false;

			const response = await ProductsService.getAll(filters);
			products = response?.products || response?.data || [];
		} catch (error) {
			console.error('Error loading products:', error);
			toast.error('Error al cargar productos');
		} finally {
			isLoading = false;
		}
	}

	/** @param {string} productId @param {string} productName */
	function openDeleteConfirm(productId, productName) {
		confirmDialog = { isOpen: true, productId, productName };
	}

	async function handleDelete() {
		try {
			await ProductsService.delete(confirmDialog.productId);
			await loadProducts();
			toast.success('Producto desactivado correctamente');
		} catch (error) {
			console.error('Error deleting product:', error);
			toast.error('Error al desactivar producto');
		}
	}

	// Carga al montar y cuando cambia el filtro (evita duplicar con onMount + $effect).
	$effect(() => {
		activeFilter;
		loadProducts();
	});

	const filters = /** @type {const} */ ([
		{ id: 'active', label: 'Activos' },
		{ id: 'inactive', label: 'Inactivos' },
		{ id: 'all', label: 'Todos' }
	]);
</script>

<div class="flex min-h-screen flex-col">
	<Topbar title="Productos" subtitle="Catálogo de productos">
		<a href="/products/catalog/create">
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
				Nuevo producto
			</Button>
		</a>
	</Topbar>

	<div class="space-y-6 p-6 sm:p-8">
		<Card class="p-4">
			<div
				class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center"
			>
				<div class="w-full md:w-96">
					<Input
						placeholder="Buscar por código o nombre…"
						bind:value={searchTerm}
					/>
				</div>
				<div class="flex gap-2">
					{#each filters as f}
						<button
							type="button"
							onclick={() => (activeFilter = f.id)}
							aria-pressed={activeFilter === f.id}
							class="rounded-md px-4 py-2 text-sm font-medium transition-colors"
							style={activeFilter === f.id
								? 'background: var(--gradient-primary); color: white; box-shadow: 0 4px 14px var(--color-shadow-primary)'
								: 'background-color: var(--color-bg-elevated); color: var(--color-text-secondary); border: 1px solid var(--color-border)'}
						>
							{f.label}
						</button>
					{/each}
				</div>
			</div>
		</Card>

		<Card class="overflow-hidden">
			<div class="overflow-x-auto">
				<table class="gac-table">
					<thead>
						<tr>
							<th>Código</th>
							<th>Nombre</th>
							<th>Descripción</th>
							<th>Estado</th>
							<th>Creado</th>
							<th class="text-right">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#if isLoading}
							<tr>
								<td colspan="6" class="py-10 text-center text-app-muted">Cargando productos…</td>
							</tr>
						{:else if filteredProducts.length === 0}
							<tr>
								<td colspan="6" class="py-10 text-center text-app-muted">
									No se encontraron productos.
								</td>
							</tr>
						{:else}
							{#each filteredProducts as product (product.id)}
								<tr>
									<td>
										<code
											class="rounded px-2 py-0.5 font-mono text-xs"
											style="background-color: var(--color-bg-tertiary); color: var(--color-accent-primary)"
										>
											{product.code}
										</code>
									</td>
									<td>
										<div class="font-medium text-app">{product.name}</div>
									</td>
									<td class="max-w-xs">
										<div class="truncate text-app-secondary">{product.description || '—'}</div>
									</td>
									<td>
										{#if product.is_active}
											<span class="gac-badge gac-badge-success">Activo</span>
										{:else}
											<span class="gac-badge gac-badge-neutral">Inactivo</span>
										{/if}
									</td>
									<td class="text-app-muted">
										{product.created_at ? new Date(product.created_at).toLocaleDateString() : '—'}
									</td>
									<td class="text-right">
										<div class="flex justify-end gap-2">
											<a href="/products/catalog/{product.id}/edit">
												<Button variant="ghost" size="sm">Editar</Button>
											</a>
											{#if product.is_active}
												<Button
													variant="ghost"
													size="sm"
													onclick={() => openDeleteConfirm(product.id, product.name)}
												>
													<span class="text-danger">Desactivar</span>
												</Button>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</Card>
	</div>
</div>

<ConfirmDialog
	bind:isOpen={confirmDialog.isOpen}
	title="Desactivar producto"
	message={`¿Confirmas que deseas desactivar el producto «${confirmDialog.productName}»? Esta acción marcará el producto como inactivo.`}
	confirmLabel="Desactivar"
	cancelLabel="Cancelar"
	variant="danger"
	onConfirm={handleDelete}
/>
