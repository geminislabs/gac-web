<script>
	import { theme, setTheme, AVAILABLE_THEMES } from '$lib/stores/theme';

	let open = $state(false);
	let current = $derived($theme);
	let currentMeta = $derived(AVAILABLE_THEMES.find((t) => t.id === current) ?? AVAILABLE_THEMES[0]);

	function toggle() {
		open = !open;
	}

	/** @param {string} id */
	function pick(id) {
		setTheme(/** @type {any} */ (id));
		open = false;
	}

	/** @param {MouseEvent | KeyboardEvent} event */
	function handleOutsideClick(event) {
		const target = /** @type {HTMLElement | null} */ (event.target);
		if (target && !target.closest('[data-gac-theme-switcher]')) {
			open = false;
		}
	}
</script>

<svelte:window onclick={handleOutsideClick} />

<div class="relative" data-gac-theme-switcher>
	<button
		type="button"
		class="gac-btn gac-btn-secondary gac-btn-sm"
		onclick={toggle}
		aria-haspopup="listbox"
		aria-expanded={open}
		title="Cambiar tema"
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
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2v2" />
			<path d="M12 20v2" />
			<path d="m4.93 4.93 1.41 1.41" />
			<path d="m17.66 17.66 1.41 1.41" />
			<path d="M2 12h2" />
			<path d="M20 12h2" />
			<path d="m6.34 17.66-1.41 1.41" />
			<path d="m19.07 4.93-1.41 1.41" />
		</svg>
		<span class="hidden sm:inline">{currentMeta?.label ?? 'Tema'}</span>
	</button>

	{#if open}
		<ul
			role="listbox"
			class="gac-panel-solid absolute right-0 mt-2 w-56 overflow-hidden p-1 z-dropdown"
		>
			{#each AVAILABLE_THEMES as item (item.id)}
				<li>
					<button
						type="button"
						role="option"
						aria-selected={current === item.id}
						onclick={() => pick(item.id)}
						class="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors
							{current === item.id
							? 'bg-app-elevated text-accent'
							: 'text-app-secondary hover:bg-app-elevated hover:text-app'}"
					>
						<span class="flex items-center gap-2">
							<span
								class="inline-block h-3 w-3 rounded-full"
								style="background: var(--gradient-brand); box-shadow: 0 0 0 1px var(--color-border)"
								aria-hidden="true"
							></span>
							{item.label}
						</span>
						{#if current === item.id}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<polyline points="20 6 9 17 4 12" />
							</svg>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
