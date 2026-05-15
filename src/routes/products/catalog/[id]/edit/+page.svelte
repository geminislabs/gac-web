<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { ProductsService } from '$lib/services/products';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast';

	const productId = $derived($page.params.id);

	let formData = $state({
		code: '',
		name: '',
		description: '',
		is_active: true
	});

	let errors = $state({
		name: ''
	});

	let isLoading = $state(true);
	let isSubmitting = $state(false);

	/** @param {string} name */
	function validateName(name) {
		if (!name) {
			return 'El nombre es requerido';
		}
		if (name.length > 255) {
			return 'El nombre no puede exceder 255 caracteres';
		}
		return '';
	}

	/** @param {Event} e */
	function handleNameInput(e) {
		const target = /** @type {HTMLInputElement} */ (e.target);
		formData.name = target.value;
		errors.name = validateName(formData.name);
	}

	async function loadProduct() {
		isLoading = true;
		try {
			if (!productId) {
				throw new Error('ID de producto inválido');
			}
			const product = await ProductsService.getById(productId);
			formData = {
				code: product.code,
				name: product.name,
				description: product.description || '',
				is_active: product.is_active
			};
		} catch (error) {
			console.error('Error loading product:', error);
			const message = error instanceof Error ? error.message : String(error);
			toast.error('Error al cargar producto: ' + message);
			goto('/products/catalog');
		} finally {
			isLoading = false;
		}
	}

	/** @param {SubmitEvent} e */
	async function handleSubmit(e) {
		e.preventDefault();

		errors.name = validateName(formData.name);

		if (errors.name) {
			return;
		}

		isSubmitting = true;
		try {
			const updateData = {
				name: formData.name,
				description: formData.description,
				is_active: formData.is_active
			};

			if (!productId) {
				throw new Error('ID de producto inválido');
			}
			await ProductsService.update(productId, updateData);
			toast.success('Producto actualizado exitosamente');
			goto('/products/catalog');
		} catch (error) {
			console.error('Error updating product:', error);
			const message = error instanceof Error ? error.message : String(error);
			toast.error('Error al actualizar producto: ' + message);
		} finally {
			isSubmitting = false;
		}
	}

	onMount(() => {
		loadProduct();
	});
</script>

<div class="flex flex-col min-h-screen bg-app text-app">
	<Topbar title="Editar Producto">
		<a href="/products/catalog">
			<Button variant="ghost" size="sm">Cancelar</Button>
		</a>
	</Topbar>

	<div class="p-8">
		<div class="mx-auto max-w-2xl">
			{#if isLoading}
				<Card class="p-6">
					<div class="flex h-64 items-center justify-center">
						<div
							class="h-8 w-8 animate-spin rounded-full border-b-2"
							style="border-color: var(--color-accent)"
						></div>
					</div>
				</Card>
			{:else}
				<Card class="p-6">
					<form onsubmit={handleSubmit} class="space-y-6">
						<div>
							<label for="code" class="gac-label">Código</label>
							<Input id="code" type="text" value={formData.code} disabled />
							<p class="mt-1 text-xs text-app-muted">El código no puede ser modificado</p>
						</div>

						<div>
							<label for="name" class="gac-label">
								Nombre <span style="color: var(--color-danger)">*</span>
							</label>
							<Input
								id="name"
								type="text"
								placeholder="ej: GPS Tracker Premium"
								value={formData.name}
								oninput={handleNameInput}
								error={errors.name}
								required
							/>
							{#if !errors.name}
								<p class="mt-1 text-xs text-app-muted">Máximo 255 caracteres</p>
							{/if}
						</div>

						<div>
							<label for="description" class="gac-label">Descripción</label>
							<textarea
								id="description"
								bind:value={formData.description}
								placeholder="Descripción detallada del producto..."
								rows="4"
								class="gac-input w-full"
							></textarea>
							<p class="mt-1 text-xs text-app-muted">Opcional</p>
						</div>

						<div class="flex items-center space-x-3">
							<input
								id="is_active"
								type="checkbox"
								bind:checked={formData.is_active}
								class="h-4 w-4 rounded"
								style="accent-color: var(--color-accent); border-color: var(--color-border)"
							/>
							<label for="is_active" class="text-sm font-medium text-app">
								Producto activo
							</label>
						</div>

						<div
							class="flex justify-end space-x-3 pt-4"
							style="border-top: 1px solid var(--color-border)"
						>
							<a href="/products/catalog">
								<Button variant="ghost" type="button">Cancelar</Button>
							</a>
							<Button variant="primary" type="submit" disabled={isSubmitting}>
								{isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
							</Button>
						</div>
					</form>
				</Card>
			{/if}
		</div>
	</div>
</div>
