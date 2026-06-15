<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { OrdersService } from '$lib/services/orders';
	import { ProductsService } from '$lib/services/products';
	import { toast } from '$lib/stores/toast';

	const prefilledClientId = $derived($page.url.searchParams.get('client_id') || '');

	let clientId = $state('');
	let notes = $state('');
	/** @type {{ product_key: string, quantity: string, unit_price: string }[]} */
	let items = $state([{ product_key: '', quantity: '1', unit_price: '' }]);
	/** @type {any[]} */
	let products = $state([]);
	let isLoadingProducts = $state(false);
	let isSubmitting = $state(false);

	let lineTotal = $derived(
		items.reduce((sum, item) => {
			const qty = Number(item.quantity) || 0;
			const price = Number(item.unit_price) || 0;
			return sum + qty * price;
		}, 0)
	);

	onMount(async () => {
		if (prefilledClientId) clientId = prefilledClientId;
		isLoadingProducts = true;
		try {
			const res = await ProductsService.getAll({ is_active: true, limit: 100 });
			products = res.products || [];
		} catch {
			products = [];
		} finally {
			isLoadingProducts = false;
		}
	});

	function addLine() {
		items = [...items, { product_key: '', quantity: '1', unit_price: '' }];
	}

	/** @param {number} index */
	function removeLine(index) {
		if (items.length <= 1) return;
		items = items.filter((_, i) => i !== index);
	}

	/** @param {number} index */
	function applyProduct(index) {
		const key = items[index]?.product_key;
		const product = products.find((p) => p.code === key);
		if (product && !items[index].unit_price) {
			items[index].unit_price = '0';
		}
	}

	/** @param {SubmitEvent} e */
	async function handleSubmit(e) {
		e.preventDefault();
		if (!clientId.trim()) {
			toast.error('Indica el client_id (account_id Nexus)');
			return;
		}

		const payloadItems = items
			.map((item) => ({
				product_key: item.product_key.trim() || undefined,
				quantity: parseInt(item.quantity, 10),
				unit_price: Number(item.unit_price)
			}))
			.filter((item) => item.product_key && item.quantity >= 1 && item.unit_price >= 0);

		if (payloadItems.length === 0) {
			toast.error('Agrega al menos una línea con producto, cantidad y precio');
			return;
		}

		isSubmitting = true;
		try {
			const order = await OrdersService.create({
				client_id: clientId.trim(),
				notes: notes.trim() || undefined,
				items: payloadItems
			});
			toast.success('Orden creada');
			await goto(`/admin/orders/${order.order_id}`);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error desconocido';
			toast.error('No se pudo crear la orden: ' + message);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Nueva orden · Geminislabs</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-app text-app">
	<Topbar title="Nueva orden" subtitle="Comercio GAC" backUrl="/admin/orders">
		<a href="/admin/orders">
			<Button variant="ghost" size="sm">Cancelar</Button>
		</a>
	</Topbar>

	<div class="mx-auto w-full max-w-3xl p-6">
		<Card class="p-6">
			<form class="space-y-6" onsubmit={handleSubmit}>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Input
						label="Client ID (account_id Nexus)"
						bind:value={clientId}
						required
						placeholder="UUID de la cuenta"
					/>
					<Input label="Notas" bind:value={notes} placeholder="Opcional" />
				</div>

				<div>
					<div class="mb-3 flex items-center justify-between">
						<h2 class="text-sm font-semibold text-app">Artículos</h2>
						<Button type="button" variant="outline" size="sm" onclick={addLine}>
							Agregar línea
						</Button>
					</div>

					<div class="space-y-3">
						{#each items as item, index (index)}
							<div
								class="grid grid-cols-1 gap-3 rounded-lg border p-4 md:grid-cols-12"
								style="border-color: var(--color-border)"
							>
								<div class="md:col-span-4">
									<label class="gac-label" for={`product-${index}`}>Producto</label>
									{#if products.length > 0}
										<select
											id={`product-${index}`}
											class="gac-input w-full"
											bind:value={item.product_key}
											onchange={() => applyProduct(index)}
										>
											<option value="">Seleccionar…</option>
											{#each products as product (product.id)}
												<option value={product.code}>{product.name} ({product.code})</option>
											{/each}
										</select>
									{:else}
										<input
											id={`product-${index}`}
											class="gac-input w-full"
											bind:value={item.product_key}
											placeholder="product_key (ej. nexus)"
											list="product-keys"
										/>
									{/if}
								</div>
								<div class="md:col-span-2">
									<Input label="Cantidad" type="number" bind:value={item.quantity} min="1" />
								</div>
								<div class="md:col-span-3">
									<Input
										label="Precio unitario (MXN)"
										type="number"
										bind:value={item.unit_price}
										min="0"
										step="0.01"
									/>
								</div>
								<div class="flex items-end md:col-span-3">
									<Button
										type="button"
										variant="ghost"
										size="sm"
										disabled={items.length <= 1}
										onclick={() => removeLine(index)}
									>
										Quitar
									</Button>
								</div>
							</div>
						{/each}
					</div>
					<datalist id="product-keys">
						<option value="nexus"></option>
					</datalist>
					{#if isLoadingProducts}
						<p class="mt-2 text-xs text-app-muted">Cargando catálogo Siscom…</p>
					{/if}
				</div>

				<div
					class="flex items-center justify-between border-t pt-4"
					style="border-color: var(--color-border)"
				>
					<p class="text-sm text-app-muted">
						Total estimado:
						<span class="font-semibold text-app">
							{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
								lineTotal
							)}
						</span>
					</p>
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? 'Creando…' : 'Crear orden'}
					</Button>
				</div>
			</form>
		</Card>
	</div>
</div>
