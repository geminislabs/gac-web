<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import { onMount } from 'svelte';
	import { userService } from '$lib/services/users';
	import { toast } from '$lib/stores/toast';

	/** @type {any[]} */
	let allUsers = $state([]);
	let isLoading = $state(true);
	let searchQuery = $state('');
	let currentPage = $state(1);
	const itemsPerPage = 10;

	let confirmOpen = $state(false);
	/** @type {string | null} */
	let pendingDeleteId = $state(null);

	let filteredUsers = $derived(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return allUsers;
		return allUsers.filter(
			(u) =>
				(u.full_name && u.full_name.toLowerCase().includes(q)) ||
				(u.email && u.email.toLowerCase().includes(q))
		);
	});

	let totalPages = $derived(Math.max(1, Math.ceil(filteredUsers().length / itemsPerPage)));
	let paginated = $derived(() => {
		const start = (currentPage - 1) * itemsPerPage;
		return filteredUsers().slice(start, start + itemsPerPage);
	});

	async function loadUsers() {
		isLoading = true;
		try {
			const response = await userService.getUsers(0, 100);
			if (response && Array.isArray(response.data)) {
				allUsers = response.data;
			} else if (Array.isArray(response)) {
				allUsers = response;
			} else {
				allUsers = [];
			}
		} catch (error) {
			console.error('Error loading users:', error);
			allUsers = [];
			toast.error('No se pudo cargar la lista de usuarios');
		} finally {
			isLoading = false;
		}
	}

	/** @param {Event} e */
	function handleSearch(e) {
		searchQuery = /** @type {HTMLInputElement} */ (e.target).value;
		currentPage = 1;
	}

	/** @param {string} userId */
	function requestDelete(userId) {
		pendingDeleteId = userId;
		confirmOpen = true;
	}

	async function confirmDelete() {
		if (!pendingDeleteId) return;
		try {
			await userService.deleteUser(pendingDeleteId);
			toast.success('Usuario desactivado correctamente');
			await loadUsers();
		} catch (error) {
			console.error('Error deleting user:', error);
			toast.error('Error al desactivar usuario');
		} finally {
			pendingDeleteId = null;
		}
	}

	function nextPage() {
		if (currentPage < totalPages) currentPage++;
	}

	function prevPage() {
		if (currentPage > 1) currentPage--;
	}

	onMount(loadUsers);
</script>

<div class="flex min-h-screen flex-col">
	<Topbar title="Administración" subtitle="Usuarios internos">
		<a href="/admin/internal-users/create">
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
					<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
					<circle cx="9" cy="7" r="4" />
					<line x1="20" x2="20" y1="8" y2="14" />
					<line x1="23" x2="17" y1="11" y2="11" />
				</svg>
				Nuevo usuario
			</Button>
		</a>
	</Topbar>

	<div class="p-6 sm:p-8">
		<Card class="overflow-hidden">
			<div
				class="flex flex-col items-stretch gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between"
				style="border-color: var(--color-border); background-color: var(--color-bg-secondary)"
			>
				<div class="sm:w-80">
					<Input
						placeholder="Buscar por nombre o email…"
						value={searchQuery}
						oninput={handleSearch}
					/>
				</div>
				<div class="text-sm text-app-muted">
					Mostrando {filteredUsers().length}
					{filteredUsers().length === 1 ? 'usuario' : 'usuarios'}
				</div>
			</div>

			<div class="overflow-x-auto">
				<table class="gac-table">
					<thead>
						<tr>
							<th>Nombre</th>
							<th>Email</th>
							<th>Roles</th>
							<th>Estado</th>
							<th class="text-right">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#if isLoading}
							<tr>
								<td colspan="5" class="py-10 text-center text-app-muted">
									<div class="flex items-center justify-center gap-2">
										<svg
											class="h-4 w-4 animate-spin"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											aria-hidden="true"
										>
											<circle
												class="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												stroke-width="4"
											></circle>
											<path
												class="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
											></path>
										</svg>
										Cargando usuarios…
									</div>
								</td>
							</tr>
						{:else if paginated().length === 0}
							<tr>
								<td colspan="5" class="py-10 text-center text-app-muted">
									No se encontraron usuarios
								</td>
							</tr>
						{:else}
							{#each paginated() as user (user.user_id || user.email)}
								<tr>
									<td>
										<div class="flex items-center gap-3">
											<div
												class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
												style="background: var(--gradient-brand)"
												aria-hidden="true"
											>
												{(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
											</div>
											<span class="font-medium text-app">{user.full_name || user.email}</span>
										</div>
									</td>
									<td class="text-app-secondary">{user.email}</td>
									<td class="text-app-secondary">
										{#if Array.isArray(user.roles) && user.roles.length > 0}
											<div class="flex flex-wrap gap-1">
												{#each user.roles as role (role)}
													<span class="gac-badge gac-badge-neutral">{role}</span>
												{/each}
											</div>
										{:else}
											<span class="text-app-muted text-xs italic">Sin roles</span>
										{/if}
									</td>
									<td>
										{#if user.is_active}
											<span class="gac-badge gac-badge-success">Activo</span>
										{:else}
											<span class="gac-badge gac-badge-neutral">Inactivo</span>
										{/if}
									</td>
									<td class="text-right">
										<div class="flex justify-end gap-2">
											<a href="/admin/internal-users/{user.user_id}">
												<Button variant="ghost" size="sm">Editar</Button>
											</a>
											<Button variant="ghost" size="sm" onclick={() => requestDelete(user.user_id)}>
												<span class="text-danger">Desactivar</span>
											</Button>
										</div>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			{#if !isLoading && filteredUsers().length > 0}
				<div
					class="flex items-center justify-between border-t p-4 text-sm"
					style="border-color: var(--color-border); background-color: var(--color-bg-tertiary)"
				>
					<div class="text-app-muted">Página {currentPage} de {totalPages}</div>
					<div class="flex gap-2">
						<Button variant="outline" size="sm" disabled={currentPage === 1} onclick={prevPage}>
							Anterior
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={currentPage === totalPages}
							onclick={nextPage}
						>
							Siguiente
						</Button>
					</div>
				</div>
			{/if}
		</Card>
	</div>
</div>

<ConfirmDialog
	bind:isOpen={confirmOpen}
	title="Desactivar usuario"
	message="¿Confirmas que deseas desactivar este usuario? Podrás reactivarlo más tarde editando su perfil."
	confirmLabel="Desactivar"
	variant="danger"
	onConfirm={confirmDelete}
/>
