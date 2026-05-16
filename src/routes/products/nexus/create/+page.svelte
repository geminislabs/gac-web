<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { goto } from '$app/navigation';

	let deviceId = $state('');
	let model = $state('');
	let provider = $state('');
	let batch = $state('');
	let notes = $state('');
	let isLoading = $state(false);
	let error = $state('');

	/** @param {SubmitEvent} e */
	async function handleSubmit(e) {
		e.preventDefault();
		isLoading = true;
		error = '';

		try {
			// Simulate API call
			// await api('/devices', {
			// 	method: 'POST',
			// 	body: JSON.stringify({ device_id: deviceId, model, provider, batch, notes })
			// });

			// Mock delay
			await new Promise((resolve) => setTimeout(resolve, 800));

			await goto('/products/nexus');
		} catch (err) {
			console.error('Failed to create device:', err);
			error = 'Error al crear el dispositivo. Intente nuevamente.';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="flex min-h-screen flex-col bg-app text-app">
	<Topbar title="Nexus / Nuevo Dispositivo">
		<a href="/products/nexus">
			<Button variant="secondary" size="sm">Cancelar</Button>
		</a>
	</Topbar>

	<div class="mx-auto w-full max-w-3xl p-8">
		<Card class="p-8">
			<h2 class="mb-6 text-xl font-semibold text-app">Registrar Nuevo Dispositivo</h2>

			<form onsubmit={handleSubmit} class="space-y-6">
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<Input
						id="device_id"
						label="Device ID / IMEI"
						placeholder="Ej: NEX-123456"
						bind:value={deviceId}
						required
					/>

					<Input id="model" label="Modelo" placeholder="Ej: Nexus X1" bind:value={model} required />

					<Input
						id="provider"
						label="Proveedor de Conectividad"
						placeholder="Ej: Telcel"
						bind:value={provider}
						required
					/>

					<Input
						id="batch"
						label="Lote / Batch"
						placeholder="Ej: B-2023-01"
						bind:value={batch}
						required
					/>
				</div>

				<div class="w-full">
					<label for="notes" class="gac-label">Notas Adicionales</label>
					<textarea
						id="notes"
						bind:value={notes}
						rows="3"
						class="gac-input w-full"
						placeholder="Información adicional..."
					></textarea>
				</div>

				{#if error}
					<div
						class="rounded-md p-3 text-sm"
						style="background: var(--color-danger-bg); color: var(--color-danger); border: 1px solid var(--color-danger)"
					>
						{error}
					</div>
				{/if}

				<div class="flex justify-end pt-4">
					<Button type="submit" variant="primary" disabled={isLoading} class="w-full md:w-auto">
						{isLoading ? 'Guardando...' : 'Guardar Dispositivo'}
					</Button>
				</div>
			</form>
		</Card>
	</div>
</div>
