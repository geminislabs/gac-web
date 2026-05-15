<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { ProductsService } from '$lib/services/products';
	import { goto } from '$app/navigation';
	import { toast } from '$lib/stores/toast';

	let formData = $state({
		code: '',
		name: '',
		description: '',
		is_active: true
	});

	let errors = $state({
		code: '',
		name: ''
	});

	let isSubmitting = $state(false);

	/** @param {string} code */
	function validateCode(code) {
		const codePattern = /^[a-z0-9_]+$/;
		if (!code) {
			return 'El código es requerido';
		}
		if (code.length < 3 || code.length > 50) {
			return 'El código debe tener entre 3 y 50 caracteres';
		}
		if (!codePattern.test(code)) {
			return 'El código solo puede contener letras minúsculas, números y guiones bajos';
		}
		return '';
	}

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
	function handleCodeInput(e) {
		const target = /** @type {HTMLInputElement} */ (e.target);
		formData.code = target.value;
		errors.code = validateCode(formData.code);
	}

	/** @param {Event} e */
	function handleNameInput(e) {
		const target = /** @type {HTMLInputElement} */ (e.target);
		formData.name = target.value;
		errors.name = validateName(formData.name);
	}

	/** @param {SubmitEvent} e */
	async function handleSubmit(e) {
		e.preventDefault();

		// Validate all fields
		errors.code = validateCode(formData.code);
		errors.name = validateName(formData.name);

		// Check if there are any errors
		if (errors.code || errors.name) {
			return;
		}

		isSubmitting = true;
		try {
			await ProductsService.create(formData);
			toast.success('Producto creado exitosamente');
			goto('/products/catalog');
		} catch (error) {
			console.error('Error creating product:', error);
			const message = error instanceof Error ? error.message : String(error);
			toast.error('Error al crear producto: ' + message);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex flex-col min-h-screen bg-app text-app">
	<Topbar title="Nuevo Producto">
		<a href="/products/catalog">
			<Button variant="ghost" size="sm">Cancelar</Button>
		</a>
	</Topbar>

	<div class="p-8">
		<div class="mx-auto max-w-2xl">
			<Card class="p-6">
				<form onsubmit={handleSubmit} class="space-y-6">
					<div>
						<label for="code" class="gac-label">
							Código <span style="color: var(--color-danger)">*</span>
						</label>
						<Input
							id="code"
							type="text"
							placeholder="ej: gps_tracker"
							value={formData.code}
							oninput={handleCodeInput}
							error={errors.code}
							required
						/>
						{#if !errors.code}
							<p class="mt-1 text-xs text-app-muted">
								Solo letras minúsculas, números y guiones bajos (3-50 caracteres)
							</p>
						{/if}
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
						<label for="is_active" class="text-sm font-medium text-app"> Producto activo </label>
					</div>

					<div
						class="flex justify-end space-x-3 pt-4"
						style="border-top: 1px solid var(--color-border)"
					>
						<a href="/products/catalog">
							<Button variant="ghost" type="button">Cancelar</Button>
						</a>
						<Button variant="primary" type="submit" disabled={isSubmitting}>
							{isSubmitting ? 'Creando...' : 'Crear Producto'}
						</Button>
					</div>
				</form>
			</Card>
		</div>
	</div>
</div>
