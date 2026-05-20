<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { onMount } from 'svelte';
	import { ClientsService } from '$lib/services/clients';
	import { auth } from '$lib/stores/auth';
	import { canAccessNexus, canManageInternalUsers } from '$lib/utils/roles';

	let currentDate = $state(new Date());
	let nexusDeviceCount = $state(0);
	let nexusClientCount = $state(0);
	let userCount = $state(0);
	let statsError = $state(false);

	let showNexus = $derived(canAccessNexus($auth.user));
	let showAdmin = $derived(canManageInternalUsers($auth.user));

	onMount(() => {
		const interval = setInterval(() => {
			currentDate = new Date();
		}, 1000);

		(async () => {
			if (!canAccessNexus($auth.user)) {
				return;
			}
			try {
				const clientStats = await ClientsService.getStats();
				nexusDeviceCount = clientStats?.devices?.total ?? 0;
				nexusClientCount = clientStats?.accounts?.total ?? 0;
				userCount = clientStats?.users?.total ?? 0;
			} catch (error) {
				console.error('Error fetching dashboard stats:', error);
				statsError = true;
			}
		})();

		return () => clearInterval(interval);
	});
</script>

<div class="flex min-h-screen flex-col">
	<Topbar title="Dashboard" subtitle="Panel administrativo Geminislabs" />

	<div class="mx-auto w-full max-w-7xl space-y-6 p-6">
		<!-- Welcome Hero -->
		<div class="gac-panel relative overflow-hidden p-8" style="background: var(--gradient-hero)">
			<div
				class="relative z-content flex flex-col items-start justify-between gap-4 md:flex-row md:items-center"
			>
				<div>
					<h1 class="mb-2 text-3xl font-bold text-app">Bienvenido a Geminislabs</h1>
					<p class="text-sm text-app-secondary">Panel de control administrativo · V1.0.0</p>
				</div>
				<div class="text-right">
					<div class="text-2xl font-mono font-semibold text-app">
						{currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
					</div>
					<div class="text-xs text-app-muted capitalize">
						{currentDate.toLocaleDateString([], {
							weekday: 'long',
							year: 'numeric',
							month: 'long',
							day: 'numeric'
						})}
					</div>
				</div>
			</div>
			<!-- Decoration -->
			<div
				class="pointer-events-none absolute -top-10 -right-10 h-64 w-64 rounded-full opacity-50 blur-3xl"
				style="background: var(--color-shadow-primary)"
				aria-hidden="true"
			></div>
			<div
				class="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full opacity-30 blur-2xl"
				style="background: var(--color-shadow-secondary)"
				aria-hidden="true"
			></div>
		</div>

		<!-- Stats -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
			{#if showNexus}
				<Card
					hover
					padding
					class="border-l-4"
					style="border-left-color: var(--color-accent-primary)"
				>
					<div class="flex items-center justify-between">
						<div>
							<p class="mb-1 text-xs font-medium uppercase tracking-wide text-app-muted">
								Clientes registrados
							</p>
							<h3 class="text-2xl font-bold text-app">{nexusClientCount}</h3>
							<p class="mt-1 text-xs text-app-muted">Total activos</p>
						</div>
						<div
							class="rounded-lg p-3 text-accent"
							style="background-color: var(--color-accent-soft)"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="22"
								height="22"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
								<circle cx="9" cy="7" r="4" />
								<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
								<path d="M16 3.13a4 4 0 0 1 0 7.75" />
							</svg>
						</div>
					</div>
				</Card>

				<Card hover padding class="border-l-4" style="border-left-color: var(--color-info)">
					<div class="flex items-center justify-between">
						<div>
							<p class="mb-1 text-xs font-medium uppercase tracking-wide text-app-muted">
								Dispositivos Nexus
							</p>
							<h3 class="text-2xl font-bold text-app">{nexusDeviceCount}</h3>
							<p class="mt-1 text-xs text-app-muted">Inventario total</p>
						</div>
						<div
							class="rounded-lg p-3"
							style="background-color: var(--color-info-bg); color: var(--color-info)"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="22"
								height="22"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
								<line x1="8" y1="21" x2="16" y2="21"></line>
								<line x1="12" y1="17" x2="12" y2="21"></line>
							</svg>
						</div>
					</div>
				</Card>
			{/if}

			<Card hover padding class="border-l-4" style="border-left-color: var(--color-success)">
				<div class="flex items-center justify-between">
					<div>
						<p class="mb-1 text-xs font-medium uppercase tracking-wide text-app-muted">
							Estado del sistema
						</p>
						<h3 class="text-2xl font-bold text-app">Operativo</h3>
						<p class="mt-1 text-xs text-app-muted">Servicios estables</p>
					</div>
					<div
						class="rounded-lg p-3"
						style="background-color: var(--color-success-bg); color: var(--color-success)"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="22"
							height="22"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
							<polyline points="22 4 12 14.01 9 11.01"></polyline>
						</svg>
					</div>
				</div>
			</Card>

			{#if showAdmin}
				<Card
					hover
					padding
					class="border-l-4"
					style="border-left-color: var(--color-accent-secondary)"
				>
					<div class="flex items-center justify-between">
						<div>
							<p class="mb-1 text-xs font-medium uppercase tracking-wide text-app-muted">
								Usuarios internos
							</p>
							<h3 class="text-2xl font-bold text-app">{userCount}</h3>
							<p class="mt-1 text-xs text-app-muted">Administradores activos</p>
						</div>
						<div
							class="rounded-lg p-3"
							style="background-color: var(--color-accent-soft); color: var(--color-accent-secondary)"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="22"
								height="22"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
								<circle cx="9" cy="7" r="4"></circle>
								<path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
								<path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
							</svg>
						</div>
					</div>
				</Card>
			{/if}
		</div>

		{#if statsError && showNexus}
			<div
				class="gac-panel-solid border-l-4 p-4 text-sm text-app-secondary"
				style="border-left-color: var(--color-warning); background-color: var(--color-warning-bg)"
				role="alert"
			>
				No se pudieron obtener métricas en tiempo real. Verifica la conexión con los servicios.
			</div>
		{/if}

		<!-- Main Content Grid -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Quick Actions -->
			<div class="space-y-4 lg:col-span-2">
				<h2 class="text-base font-semibold text-app">Accesos directos</h2>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					{#if showNexus}
						<Card hover class="group cursor-pointer overflow-hidden">
							<div class="p-6">
								<div class="mb-4 flex items-center">
									<div
										class="mr-3 rounded-lg p-2"
										style="background-color: var(--color-accent-soft); color: var(--color-accent-primary)"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="20"
											height="20"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											aria-hidden="true"
										>
											<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
											<line x1="8" y1="21" x2="16" y2="21"></line>
											<line x1="12" y1="17" x2="12" y2="21"></line>
										</svg>
									</div>
									<h3 class="text-lg font-bold text-app">Nexus</h3>
								</div>
								<p class="mb-6 text-sm text-app-secondary">
									Gestión de dispositivos GPS, telemática avanzada y rastreo en tiempo real.
								</p>
								<a href="/products/nexus/devices" class="block w-full">
									<Button variant="primary" fullWidth>Gestionar Dispositivos</Button>
								</a>
							</div>
						</Card>
					{/if}

					{#if showAdmin}
						<Card hover class="group cursor-pointer overflow-hidden">
							<div class="p-6">
								<div class="mb-4 flex items-center">
									<div
										class="mr-3 rounded-lg p-2"
										style="background-color: var(--color-accent-soft); color: var(--color-accent-secondary)"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="20"
											height="20"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											aria-hidden="true"
										>
											<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
											<circle cx="9" cy="7" r="4"></circle>
											<path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
											<path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
										</svg>
									</div>
									<h3 class="text-lg font-bold text-app">Usuarios y roles</h3>
								</div>
								<p class="mb-6 text-sm text-app-secondary">
									Administración de cuentas internas, permisos y auditoría de seguridad.
								</p>
								<a href="/admin/internal-users" class="block w-full">
									<Button variant="outline" fullWidth>Ver usuarios</Button>
								</a>
							</div>
						</Card>
					{/if}

					{#if showNexus}
						<Card hover class="group cursor-pointer overflow-hidden">
							<div class="p-6">
								<div class="mb-4 flex items-center">
									<div
										class="mr-3 rounded-lg p-2"
										style="background-color: var(--color-success-bg); color: var(--color-success)"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="20"
											height="20"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											aria-hidden="true"
										>
											<path
												d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"
											/>
											<path d="M7 7h.01" />
										</svg>
									</div>
									<h3 class="text-lg font-bold text-app">Planes de servicio</h3>
								</div>
								<p class="mb-6 text-sm text-app-secondary">
									Definición de paquetes, pricing, capacidades y límites para los productos.
								</p>
								<a href="/products/plans" class="block w-full">
									<Button variant="outline" fullWidth>Gestionar planes</Button>
								</a>
							</div>
						</Card>

						<Card hover class="group cursor-pointer overflow-hidden">
							<div class="p-6">
								<div class="mb-4 flex items-center">
									<div
										class="mr-3 rounded-lg p-2"
										style="background-color: var(--color-info-bg); color: var(--color-info)"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="20"
											height="20"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											aria-hidden="true"
										>
											<path d="m7.5 4.27 9 5.15" />
											<path
												d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
											/>
											<path d="m3.3 7 8.7 5 8.7-5" />
											<path d="M12 22V12" />
										</svg>
									</div>
									<h3 class="text-lg font-bold text-app">Catálogo</h3>
								</div>
								<p class="mb-6 text-sm text-app-secondary">
									Productos disponibles y su configuración comercial dentro de la plataforma.
								</p>
								<a href="/products/catalog" class="block w-full">
									<Button variant="outline" fullWidth>Abrir catálogo</Button>
								</a>
							</div>
						</Card>
					{/if}

					<Card hover class="group cursor-pointer overflow-hidden">
						<div class="p-6">
							<div class="mb-4 flex items-center">
								<div
									class="mr-3 rounded-lg p-2"
									style="background-color: var(--color-accent-soft); color: var(--color-accent-primary)"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="20"
										height="20"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										aria-hidden="true"
									>
										<circle cx="9" cy="21" r="1" />
										<circle cx="20" cy="21" r="1" />
										<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
									</svg>
								</div>
								<h3 class="text-lg font-bold text-app">Órdenes y comercio</h3>
							</div>
							<p class="mb-6 text-sm text-app-secondary">
								Operación comercial: órdenes, pagos y envíos asociados a los clientes.
							</p>
							<div class="grid grid-cols-3 gap-2">
								<a href="/admin/orders" class="block">
									<Button variant="outline" size="sm" fullWidth>Órdenes</Button>
								</a>
								<a href="/admin/payments" class="block">
									<Button variant="outline" size="sm" fullWidth>Pagos</Button>
								</a>
								<a href="/admin/shipments" class="block">
									<Button variant="outline" size="sm" fullWidth>Envíos</Button>
								</a>
							</div>
						</div>
					</Card>
				</div>
			</div>

			<!-- Recent Activity -->
			<div class="space-y-4">
				<h2 class="text-base font-semibold text-app">Actividad reciente</h2>
				<Card class="h-full">
					<div class="p-4">
						<ul class="divide-y" style="border-color: var(--color-border)">
							<li class="flex gap-3 py-3">
								<span
									class="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
									style="background-color: var(--color-info)"
									aria-hidden="true"
								></span>
								<div class="min-w-0">
									<p class="text-xs text-app-muted">Hace 10 min</p>
									<p class="truncate text-sm font-medium text-app">Nuevo dispositivo registrado</p>
									<p class="truncate text-xs text-app-muted">ID: 86756405…</p>
								</div>
							</li>
							<li class="flex gap-3 py-3">
								<span
									class="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
									style="background-color: var(--color-success)"
									aria-hidden="true"
								></span>
								<div class="min-w-0">
									<p class="text-xs text-app-muted">Hace 25 min</p>
									<p class="truncate text-sm font-medium text-app">Actualización del sistema</p>
									<p class="truncate text-xs text-app-muted">Deploy exitoso v1.0.2</p>
								</div>
							</li>
							<li class="flex gap-3 py-3">
								<span
									class="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
									style="background-color: var(--color-warning)"
									aria-hidden="true"
								></span>
								<div class="min-w-0">
									<p class="text-xs text-app-muted">Hace 1 h 12 min</p>
									<p class="truncate text-sm font-medium text-app">Alerta de conexión</p>
									<p class="truncate text-xs text-app-muted">Latencia alta en región US-East</p>
								</div>
							</li>
							<li class="flex gap-3 py-3">
								<span
									class="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
									style="background-color: var(--color-text-muted)"
									aria-hidden="true"
								></span>
								<div class="min-w-0">
									<p class="text-xs text-app-muted">Hace 2 h</p>
									<p class="truncate text-sm font-medium text-app">Login de administrador</p>
									<p class="truncate text-xs text-app-muted">admin@geminislabs.com</p>
								</div>
							</li>
						</ul>
						<div class="mt-2 border-t pt-4 text-center" style="border-color: var(--color-border)">
							<button type="button" class="text-xs font-medium text-accent hover:underline">
								Ver todo el historial
							</button>
						</div>
					</div>
				</Card>
			</div>
		</div>
	</div>
</div>
