<script>
	import { page } from '$app/stores';
	import { auth, logout } from '$lib/stores/auth';
	import { canAccessNexus, canManageInternalUsers } from '$lib/utils/roles';

	/** @type {{ isCollapsed?: boolean }} */
	let { isCollapsed = $bindable(false) } = $props();

	/**
	 * @typedef {{ href: string, label: string, icon: string, section?: 'main' | 'commerce' | 'admin', nexus?: boolean, adminOnly?: boolean }} MenuItem
	 */

	/** @type {MenuItem[]} */
	const menuItems = [
		{ href: '/', label: 'Dashboard', icon: 'LayoutDashboard', section: 'main' },
		{
			href: '/products/catalog',
			label: 'Productos',
			icon: 'Package',
			section: 'main',
			nexus: true
		},
		{ href: '/products/nexus', label: 'Nexus', icon: 'Smartphone', section: 'main', nexus: true },
		{
			href: '/products/nexus/organizations',
			label: 'Organizaciones',
			icon: 'Users',
			section: 'main',
			nexus: true
		},
		{ href: '/products/plans', label: 'Planes', icon: 'Tag', section: 'main', nexus: true },
		{ href: '/admin/orders', label: 'Órdenes', icon: 'ShoppingCart', section: 'commerce' },
		{ href: '/admin/payments', label: 'Pagos', icon: 'CreditCard', section: 'commerce' },
		{ href: '/admin/shipments', label: 'Envíos', icon: 'Truck', section: 'commerce' },
		{
			href: '/admin/internal-users',
			label: 'Usuarios Internos',
			icon: 'Users',
			section: 'admin',
			adminOnly: true
		}
	];

	let visibleMenuItems = $derived(
		menuItems.filter((item) => {
			if (item.adminOnly) return canManageInternalUsers($auth.user);
			if (item.nexus) return canAccessNexus($auth.user);
			return true;
		})
	);

	let userInitial = $derived(
		($auth.user?.full_name || $auth.user?.name || $auth.user?.email || 'U').charAt(0).toUpperCase()
	);

	let userName = $derived(
		$auth.user?.full_name || $auth.user?.name || $auth.user?.email || 'Usuario'
	);

	let userEmail = $derived($auth.user?.email || 'sin-email@local');

	/**
	 * Solo un ítem activo: el prefijo de href más específico que coincida.
	 * Evita que /products/nexus quede activo en /products/nexus/organizations.
	 * @param {MenuItem} item
	 */
	function isActive(item) {
		const pathname = $page.url.pathname;
		/** @type {MenuItem[]} */
		const matches = visibleMenuItems.filter((entry) => {
			if (entry.href === '/') return pathname === '/';
			return pathname === entry.href || pathname.startsWith(`${entry.href}/`);
		});
		if (matches.length === 0) return false;
		const best = matches.reduce((a, b) => (a.href.length >= b.href.length ? a : b));
		return best.href === item.href;
	}
</script>

<aside
	class="z-sidebar fixed left-0 top-0 flex h-screen flex-col border-r theme-transition"
	style="
		width: {isCollapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)'};
		background: var(--gradient-surface);
		border-color: var(--color-border);
		transition:
			width var(--transition-base),
			background-color var(--transition-base),
			border-color var(--transition-base);
	"
>
	<!-- LOGO -->
	<div
		class="relative flex h-16 shrink-0 items-center justify-center border-b"
		style="border-color: var(--color-border)"
	>
		<img src="/images/logo.png" alt="Geminislabs" class="h-9 w-9 object-contain" />
		{#if !isCollapsed}
			<h1 class="ml-3 truncate text-lg font-bold tracking-tight text-app">Geminislab</h1>
		{/if}
	</div>

	<!-- COLLAPSE TOGGLE -->
	<button
		type="button"
		class="absolute -right-3 top-20 z-sidebar flex h-6 w-6 items-center justify-center rounded-full border bg-app-deep text-app-secondary shadow-md transition-colors hover:text-accent"
		style="border-color: var(--color-border)"
		onclick={() => (isCollapsed = !isCollapsed)}
		title={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
		aria-label={isCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.25"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="transition-transform duration-200 {isCollapsed ? 'rotate-180' : ''}"
			aria-hidden="true"
		>
			<polyline points="15 18 9 12 15 6" />
		</svg>
	</button>

	<!-- NAV -->
	<nav class="mt-2 flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navegación principal">
		{#each visibleMenuItems as item, index (item.href)}
			<a
				href={item.href}
				title={isCollapsed ? item.label : undefined}
				aria-current={isActive(item) ? 'page' : undefined}
				class="group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium theme-transition
					{isActive(item) ? 'text-app shadow-sm' : 'text-app-secondary hover:text-app'}
					{isCollapsed ? 'justify-center' : ''}"
				style="
					background: {isActive(item) ? 'var(--gradient-primary)' : 'transparent'};
					box-shadow: {isActive(item) ? '0 4px 16px var(--color-shadow-primary)' : 'none'};
				"
				onmouseenter={(e) => {
					if (!isActive(item)) {
						/** @type {HTMLElement} */ (e.currentTarget).style.backgroundColor =
							'var(--color-bg-elevated)';
					}
				}}
				onmouseleave={(e) => {
					if (!isActive(item)) {
						/** @type {HTMLElement} */ (e.currentTarget).style.backgroundColor = 'transparent';
					}
				}}
			>
				<span class="flex h-5 w-5 shrink-0 items-center justify-center {isCollapsed ? '' : 'mr-3'}">
					{#if item.icon === 'Package'}
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
					{:else if item.icon === 'LayoutDashboard'}
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
							<rect width="7" height="9" x="3" y="3" rx="1" />
							<rect width="7" height="5" x="14" y="3" rx="1" />
							<rect width="7" height="9" x="14" y="12" rx="1" />
							<rect width="7" height="5" x="3" y="16" rx="1" />
						</svg>
					{:else if item.icon === 'Smartphone'}
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
							<rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
							<path d="M12 18h.01" />
						</svg>
					{:else if item.icon === 'Tag'}
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
					{:else if item.icon === 'Users'}
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
							<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
							<circle cx="9" cy="7" r="4" />
							<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
							<path d="M16 3.13a4 4 0 0 1 0 7.75" />
						</svg>
					{:else if item.icon === 'ShoppingCart'}
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
					{:else if item.icon === 'CreditCard'}
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
							<rect x="2" y="5" width="20" height="14" rx="2" />
							<line x1="2" y1="10" x2="22" y2="10" />
						</svg>
					{:else if item.icon === 'Truck'}
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
							<path d="M5 18H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3h3l4 5v5h-2" />
							<circle cx="7.5" cy="18.5" r="2.5" />
							<circle cx="17.5" cy="18.5" r="2.5" />
						</svg>
					{/if}
				</span>

				{#if !isCollapsed}
					<span class="truncate">{item.label}</span>
				{/if}
			</a>

			{#if index < visibleMenuItems.length - 1 && visibleMenuItems[index + 1].section !== item.section}
				<hr class="gac-divider my-3" />
			{/if}
		{/each}
	</nav>

	<!-- FOOTER (USUARIO + LOGOUT) -->
	<div
		class="border-t p-4"
		style="border-color: var(--color-border); background: var(--color-bg-elevated)"
	>
		<div class="mb-3 flex items-center {isCollapsed ? 'justify-center' : ''}">
			<div
				class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
				style="background: var(--gradient-brand); box-shadow: 0 0 0 1px var(--color-border-strong)"
				aria-hidden="true"
			>
				{userInitial}
			</div>
			{#if !isCollapsed}
				<div class="ml-3 overflow-hidden">
					<p class="truncate text-xs font-medium text-app">{userName}</p>
					<p class="truncate text-[10px] text-app-muted">{userEmail}</p>
				</div>
			{/if}
		</div>
		<button
			type="button"
			onclick={logout}
			title={isCollapsed ? 'Cerrar sesión' : undefined}
			aria-label="Cerrar sesión"
			class="gac-btn gac-btn-outline gac-btn-sm w-full"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class={isCollapsed ? '' : 'mr-1'}
				aria-hidden="true"
			>
				<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
				<polyline points="16 17 21 12 16 7" />
				<line x1="21" x2="9" y1="12" y2="12" />
			</svg>
			{#if !isCollapsed}
				<span>Cerrar sesión</span>
			{/if}
		</button>
	</div>
</aside>
