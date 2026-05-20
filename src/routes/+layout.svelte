<script>
	import '../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import favicon from '$lib/assets/favicon.png';
	import { auth } from '$lib/stores/auth';
	import '$lib/stores/theme';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import {
		canAccessNexus,
		canManageInternalUsers,
		pathRequiresAdmin,
		pathRequiresNexusAccess
	} from '$lib/utils/roles';

	let { children } = $props();

	let isLoginPage = $derived($page.url.pathname === '/login');
	let isSidebarCollapsed = $state(false);

	onMount(() => {
		const unsubscribe = auth.subscribe(async (state) => {
			if (!state.isAuthenticated && !isLoginPage) {
				await goto('/login');
				return;
			}
			if (state.isAuthenticated && isLoginPage) {
				await goto('/');
				return;
			}
			if (!state.isAuthenticated || isLoginPage) return;

			const path = $page.url.pathname;
			if (pathRequiresAdmin(path) && !canManageInternalUsers(state.user)) {
				await goto('/');
				return;
			}
			if (pathRequiresNexusAccess(path) && !canAccessNexus(state.user)) {
				await goto('/');
			}
		});
		return unsubscribe;
	});

	let mainPadding = $derived(
		isSidebarCollapsed ? 'pl-[var(--sidebar-width-collapsed)]' : 'pl-[var(--sidebar-width)]'
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Toast />

<div class="min-h-screen bg-app text-app theme-transition" style="font-family: var(--font-sans)">
	{#if !isLoginPage}
		<Sidebar bind:isCollapsed={isSidebarCollapsed} />
		<main
			class="min-h-screen theme-transition {mainPadding}"
			style="transition: padding-left var(--transition-base)"
		>
			{@render children()}
		</main>
	{:else}
		<main class="flex min-h-screen flex-col items-center justify-center p-4">
			{@render children()}
		</main>
	{/if}
</div>
