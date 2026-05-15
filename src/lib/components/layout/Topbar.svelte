<script>
	import ThemeSwitcher from '$lib/components/ui/ThemeSwitcher.svelte';

	/** @type {{
	 * 	title?: string,
	 * 	subtitle?: string,
	 * 	backUrl?: string,
	 * 	showThemeSwitcher?: boolean,
	 * 	children?: import('svelte').Snippet
	 * }} */
	let {
		title = 'Dashboard',
		subtitle,
		backUrl,
		showThemeSwitcher = true,
		children
	} = $props();
</script>

<header
	class="sticky top-0 z-header flex h-16 items-center justify-between border-b px-6 sm:px-8 theme-transition"
	style="
		background-color: var(--color-bg-secondary);
		border-color: var(--color-border);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	"
>
	<div class="flex min-w-0 items-center gap-4">
		{#if backUrl}
			<a
				href={backUrl}
				aria-label="Volver"
				class="gac-btn gac-btn-ghost gac-btn-sm p-2"
				style="border-radius: 9999px"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="m15 18-6-6 6-6" />
				</svg>
			</a>
		{/if}
		<div class="min-w-0">
			<h2 class="truncate text-base font-semibold text-app sm:text-lg">{title}</h2>
			{#if subtitle}
				<p class="truncate text-xs text-app-muted">{subtitle}</p>
			{/if}
		</div>
	</div>

	<div class="flex items-center gap-2 sm:gap-3">
		{@render children?.()}
		{#if showThemeSwitcher}
			<ThemeSwitcher />
		{/if}
	</div>
</header>
