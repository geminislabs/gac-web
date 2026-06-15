<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/products/nexus/devices/create', { replaceState: true });
	});
</script>

<p class="p-8 text-center text-app-muted">Redirigiendo…</p>
