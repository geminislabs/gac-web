<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { goto } from '$app/navigation';
	import { userService } from '$lib/services/users';
	import { toast } from '$lib/stores/toast';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	let userId = $state('');
	let name = $state('');
	let email = $state('');
	let password = $state('');
	/** @type {string[]} */
	let selectedRoles = $state([]);
	/** @type {Array<{ role_id?: string, name: string }>} */
	let availableRoles = $state([]);
	let isActive = $state(true);
	let isLoading = $state(true);
	let isSaving = $state(false);
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

	async function loadUser() {
		try {
			const res = await userService.getUser(userId);
			const userData = res.data || res;
			name = userData.full_name || '';
			email = userData.email || '';
			isActive = userData.is_active !== undefined ? userData.is_active : true;
			selectedRoles = Array.isArray(userData.roles) ? userData.roles : [];
		} catch (e) {
			console.error('Error loading user:', e);
			error = 'Error al cargar usuario.';
		} finally {
			isLoading = false;
		}
	}

	onMount(async () => {
		userId = $page.params.id || '';
		if (userId) {
			await Promise.all([loadRoles(), loadUser()]);
		}
	});

	/** @param {string} roleName */
	function toggleRole(roleName) {
		selectedRoles = selectedRoles.includes(roleName)
			? selectedRoles.filter((r) => r !== roleName)
			: [...selectedRoles, roleName];
	}

	/** @param {SubmitEvent} e */
	async function handleSubmit(e) {
		e.preventDefault();
		isSaving = true;
		error = '';

		const payload = /** @type {Record<string, any>} */ ({
			full_name: name,
			is_active: isActive,
			roles: selectedRoles
		});

		try {
			await userService.updateUser(userId, payload);
			if (password) {
				await userService.resetPassword(userId, password);
			}
			toast.success('Usuario actualizado correctamente');
			await goto('/admin/internal-users');
		} catch (err) {
			console.error('Failed to update user:', err);
			error = /** @type {any} */ (err).message || 'Error al actualizar usuario.';
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="flex min-h-screen flex-col">
	<Topbar title="Usuarios" subtitle="Editar usuario interno" backUrl="/admin/internal-users">
		<a href="/admin/internal-users">
			<Button variant="ghost" size="sm">Cancelar</Button>
		</a>
	</Topbar>

	<div class="mx-auto w-full max-w-2xl p-6 sm:p-8">
		<Card class="p-6 sm:p-8">
			<h2 class="mb-6 text-xl font-semibold text-app">Editar usuario</h2>

			{#if isLoading}
				<div class="flex justify-center py-12">
					<div
						class="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
						style="border-color: var(--color-accent-primary); border-top-color: transparent"
						aria-label="Cargando"
					></div>
				</div>
			{:else}
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
						value={email}
						disabled
					/>

					<Input
						id="password"
						label="Nueva contraseña (opcional)"
						type="password"
						placeholder="Dejar vacía para mantener la actual"
						autocomplete="new-password"
						bind:value={password}
					/>

					<div class="flex items-center gap-3">
						<span class="gac-label mb-0" id="status-label">Estado</span>
						<button
							type="button"
							class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2"
							style="background-color: {isActive
								? 'var(--color-accent-primary)'
								: 'var(--color-bg-elevated)'}; --tw-ring-color: var(--color-accent-primary)"
							role="switch"
							aria-checked={isActive}
							aria-labelledby="status-label"
							onclick={() => (isActive = !isActive)}
						>
							<span
								aria-hidden="true"
								class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
								style="transform: translateX({isActive ? '1.25rem' : '0'})"
							></span>
						</button>
						<span class="text-sm text-app-secondary">{isActive ? 'Activo' : 'Inactivo'}</span>
					</div>

					<div class="space-y-2">
						<span class="gac-label" id="roles-label">Roles</span>
						{#if availableRoles.length > 0}
							<div class="flex flex-wrap gap-2" role="group" aria-labelledby="roles-label">
								{#each availableRoles as role (role.role_id || role.name)}
									{@const active = selectedRoles.includes(role.name)}
									<button
										type="button"
										class="rounded-full border px-3 py-1.5 text-sm font-medium transition-colors"
										style={active
											? 'background-color: var(--color-accent-soft); color: var(--color-accent-primary); border-color: var(--color-accent-primary);'
											: 'background-color: var(--color-bg-elevated); color: var(--color-text-secondary); border-color: var(--color-border);'}
										onclick={() => toggleRole(role.name)}
										aria-pressed={active}
									>
										{role.name}
									</button>
								{/each}
							</div>
						{:else}
							<p class="text-sm italic text-app-muted">
								No hay roles disponibles para seleccionar.
							</p>
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
						<Button type="submit" variant="primary" disabled={isSaving}>
							{isSaving ? 'Guardando…' : 'Guardar cambios'}
						</Button>
					</div>
				</form>
			{/if}
		</Card>
	</div>
</div>
