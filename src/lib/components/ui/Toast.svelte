<script>
	import { toast } from '$lib/stores/toast';
	import { fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';

	let toasts = $derived($toast);

	/** @param {string} type */
	function toneClass(type) {
		switch (type) {
			case 'success':
				return 'border-success';
			case 'error':
				return 'border-danger';
			default:
				return 'border-info';
		}
	}

	/** @param {string} type */
	function iconColor(type) {
		switch (type) {
			case 'success':
				return 'text-success';
			case 'error':
				return 'text-danger';
			default:
				return 'text-info';
		}
	}

	/** @param {string} type */
	function progressColor(type) {
		switch (type) {
			case 'success':
				return 'var(--color-success)';
			case 'error':
				return 'var(--color-danger)';
			default:
				return 'var(--color-info)';
		}
	}
</script>

<div
	class="fixed top-4 right-4 z-toast flex flex-col gap-2 pointer-events-none"
	style="max-width: calc(100vw - 2rem)"
	role="region"
	aria-live="polite"
	aria-label="Notificaciones"
>
	{#each toasts as t (t.id)}
		<div
			animate:flip={{ duration: 200 }}
			in:fly={{ x: 280, duration: 200 }}
			out:fly={{ x: 280, duration: 180 }}
			class="gac-panel-solid pointer-events-auto min-w-[280px] max-w-md overflow-hidden {toneClass(
				t.type
			)}"
			style="border-left-width: 4px"
			role="status"
		>
			<div class="flex items-start gap-3 p-4">
				<div class="flex-shrink-0 {iconColor(t.type)}">
					{#if t.type === 'success'}
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
							<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
							<polyline points="22 4 12 14.01 9 11.01"></polyline>
						</svg>
					{:else if t.type === 'error'}
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
							<circle cx="12" cy="12" r="10"></circle>
							<line x1="15" y1="9" x2="9" y2="15"></line>
							<line x1="9" y1="9" x2="15" y2="15"></line>
						</svg>
					{:else}
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
							<circle cx="12" cy="12" r="10"></circle>
							<line x1="12" y1="16" x2="12" y2="12"></line>
							<line x1="12" y1="8" x2="12.01" y2="8"></line>
						</svg>
					{/if}
				</div>

				<div class="flex-1 pt-0.5">
					<p class="text-sm font-medium text-app">
						{t.message}
					</p>
				</div>

				<button
					type="button"
					onclick={() => toast.dismiss(t.id)}
					class="gac-btn gac-btn-ghost gac-btn-sm flex-shrink-0 p-1"
					aria-label="Cerrar notificación"
				>
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
						aria-hidden="true"
					>
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</div>

			{#if t.duration > 0}
				<div class="h-1 bg-app-tertiary">
					<div
						class="h-full"
						style="
							background: {progressColor(t.type)};
							animation: gac-toast-shrink {t.duration}ms linear forwards;
						"
					></div>
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	@keyframes gac-toast-shrink {
		from {
			width: 100%;
		}
		to {
			width: 0%;
		}
	}
</style>
