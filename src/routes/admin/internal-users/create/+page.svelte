<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { goto } from '$app/navigation';
	import { userService } from '$lib/services/users';
	import { toast } from '$lib/stores/toast';
	import { onMount } from 'svelte';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	/** @type {string[]} */
	let selectedRoles = $state([]);
	/** @type {Array<{ role_id?: string, name: string }>} */
	let availableRoles = $state([]);
	let isLoading = $state(false);
	let error = $state('');

	const FALLBACK_ROLES = [{ name: 'admin' }, { name: 'user' }, { name: 'viewer' }];

	async function loadRoles() {
		try {
			const res = await userService.getRoles();
			if (Array.isArray(res)) {
				availableRoles = res;
			} else if (res && Array.isArray(res.data)) {
				availableRoles = res.data;
			} else {
				availableRoles = FALLBACK_ROLES;
			}
		} catch (e) {
			console.error('Error loading roles', e);
			availableRoles = FALLBACK_ROLES;
		}
	}

	onMount(loadRoles);

	/** @param {string} roleName */
	function toggleRole(roleName) {
		selectedRoles = selectedRoles.includes(roleName)
			? selectedRoles.filter((r) => r !== roleName)
			: [...selectedRoles, roleName];
	}

	/** @param {SubmitEvent} e */
	async function handleSubmit(e) {
		e.preventDefault();
		isLoading = true;
		error = '';

		try {
			await userService.createUser({
				full_name: name,
				email,
				password,
				roles: selectedRoles
			});
			toast.success('Usuario creado correctamente');
			await goto('/admin/internal-users');
		} catch (err) {
			console.error('Failed to create user:', err);
			error = /** @type {any} */ (err).message || 'Error al crear usuario.';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="flex min-h-screen flex-col">
	<Topbar title="Usuarios" subtitle="Crear usuario interno" backUrl="/admin/internal-users">
		<a href="/admin/internal-users">
			<Button variant="ghost" size="sm">Cancelar</Button>
		</a>
	</Topbar>

	<div class="mx-auto w-full max-w-2xl p-6 sm:p-8">
		<Card class="p-6 sm:p-8">
			<h2 class="mb-6 text-xl font-semibold text-app">Registrar usuario interno</h2>

			<form onsubmit={handleSubmit} class="space-y-5">
				<Input
					id="name"
					label="Nombre completo"
					placeholder="Ej: Juan Pérez"
					bind:value={name}
					required
				/>

				<Input
					id="email"
					label="Correo electrónico"
					type="email"
					placeholder="usuario@geminislabs.com"
					bind:value={email}
					autocomplete="email"
					required
				/>

				<Input
					id="password"
					label="Contraseña"
					type="password"
					placeholder="••••••••"
					autocomplete="new-password"
					bind:value={password}
					required
				/>

				<div class="space-y-2">
					<span class="gac-label" id="roles-label">Roles</span>
					{#if availableRoles.length > 0}
						<div class="flex flex-wrap gap-2" role="group" aria-labelledby="roles-label">
							{#each availableRoles as role (role.role_id || role.name)}
								{@const roleName = role.name}
								{@const active = selectedRoles.includes(roleName)}
								<button
									type="button"
									class="rounded-full border px-3 py-1.5 text-sm font-medium transition-colors"
									style={active
										? 'background-color: var(--color-accent-soft); color: var(--color-accent-primary); border-color: var(--color-accent-primary);'
										: 'background-color: var(--color-bg-elevated); color: var(--color-text-secondary); border-color: var(--color-border);'}
									onclick={() => toggleRole(roleName)}
									aria-pressed={active}
								>
									{roleName}
								</button>
							{/each}
						</div>
						<p class="mt-1 text-xs text-app-muted">
							Selecciona uno o varios roles que tendrá el usuario.
						</p>
					{:else}
						<p class="text-sm italic text-app-muted">No hay roles disponibles para seleccionar.</p>
					{/if}
				</div>

				{#if error}
					<div
						class="rounded-md border p-3 text-sm"
						style="background-color: var(--color-danger-bg); color: var(--color-danger); border-color: color-mix(in srgb, var(--color-danger) 30%, transparent)"
						role="alert"
					>
						{error}
					</div>
				{/if}

				<div class="flex justify-end gap-3 pt-4">
					<a href="/admin/internal-users">
						<Button variant="outline">Cancelar</Button>
					</a>
					<Button type="submit" variant="primary" disabled={isLoading}>
						{isLoading ? 'Guardando…' : 'Crear usuario'}
					</Button>
				</div>
			</form>
		</Card>
	</div>
</div>
