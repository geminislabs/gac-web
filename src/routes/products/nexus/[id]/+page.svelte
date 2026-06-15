<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	const id = $derived($page.params.id);

	onMount(() => {
		if (id) goto(`/products/nexus/devices/${id}`, { replaceState: true });
		else goto('/products/nexus/devices', { replaceState: true });
	});
</script>

<p class="p-8 text-center text-app-muted">Redirigiendo…</p>
