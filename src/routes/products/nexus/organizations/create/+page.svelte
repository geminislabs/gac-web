<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { OrganizationsService } from '$lib/services/organizations';
	import { ClientsService } from '$lib/services/clients';
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast';

	/** @type {import('$lib/services/clients').ClientAccount[]} */
	let accounts = $state([]);
	let accountId = $state('');
	let name = $state('');
	let billingEmail = $state('');
	let country = $state('MX');
	let timezone = $state('America/Mexico_City');
	let isSubmitting = $state(false);

	onMount(async () => {
		const fromUrl = $page.url.searchParams.get('account_id');
		if (fromUrl) accountId = fromUrl;
		try {
			accounts = await ClientsService.getAll({ limit: 100 });
		} catch (error) {
			console.error('Error loading accounts:', error);
		}
	});

	async function handleSubmit(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		if (!accountId || !name.trim()) {
			toast.error('Cuenta y nombre son obligatorios');
			return;
		}
		isSubmitting = true;
		try {
			const org = await OrganizationsService.create({
				account_id: accountId,
				name: name.trim(),
				billing_email: billingEmail.trim() || undefined,
				country: country.trim() || undefined,
				timezone: timezone.trim() || undefined
			});
			toast.success('Organización creada');
			await goto(`/products/nexus/organizations/${org.id}`);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error';
			toast.error('No se pudo crear: ' + message);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex min-h-screen flex-col bg-app text-app">
	<Topbar title="Nueva organización" backUrl="/products/nexus/organizations" />

	<div class="mx-auto w-full max-w-2xl p-6">
		<Card class="p-6">
			<form onsubmit={handleSubmit} class="space-y-4">
				<div>
					<label for="account" class="gac-label">Cuenta (account_id)</label>
					<select id="account" class="gac-input w-full" bind:value={accountId} required>
						<option value="">Seleccionar cuenta...</option>
						{#each accounts as account (account.id)}
							<option value={account.id}>{account.account_name} ({account.id.slice(0, 8)}…)</option>
						{/each}
					</select>
				</div>
				<Input label="Nombre" bind:value={name} required placeholder="Flota Norte" />
				<Input
					label="Email facturación"
					bind:value={billingEmail}
					placeholder="facturacion@empresa.com"
				/>
				<Input label="País (ISO)" bind:value={country} placeholder="MX" />
				<Input label="Timezone" bind:value={timezone} placeholder="America/Mexico_City" />
				<div class="flex justify-end gap-2 pt-2">
					<a href="/products/nexus/organizations">
						<Button variant="outline" type="button">Cancelar</Button>
					</a>
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? 'Creando...' : 'Crear organización'}
					</Button>
				</div>
			</form>
		</Card>
	</div>
</div>
