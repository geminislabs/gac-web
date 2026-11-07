<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { toast } from '$lib/stores/toast';
	import { formatApiErrorMessage } from '$lib/utils/apiErrors';
	import { userService } from '$lib/services/users';
	import { AppVersionsService, validatePolicyClient } from '$lib/services/appVersions';
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';

	/**
	 * @typedef {'ios' | 'android'} Platform
	 */

	/**
	 * @typedef {Object} PlatformForm
	 * @property {string} min_supported_version
	 * @property {string} latest_version
	 * @property {string} store_url
	 * @property {string[]} blocked_versions
	 * @property {string} newBlockedInput
	 * @property {string|null} updated_at
	 * @property {string|null} updated_by
	 * @property {string|null} updated_by_display
	 * @property {Record<string, string>} errors
	 */

	/** @type {Platform} */
	let selectedPlatform = $state('ios');
	let isLoading = $state(true);
	let isSaving = $state(false);
	let isPreviewing = $state(false);
	let isMockMode = $state(false);
	let generalError = $state('');

	// Mock baseline dataset based on contract §3.2
	const MOCK_POLICIES = {
		ios: {
			platform: 'ios',
			min_supported_version: '1.0.0',
			latest_version: '1.3.0',
			blocked_versions: [],
			store_url: 'https://apps.apple.com/app/id123456789',
			updated_at: '2026-11-05T14:20:00Z',
			updated_by: 'migracion 047'
		},
		android: {
			platform: 'android',
			min_supported_version: null,
			latest_version: '1.2.0',
			blocked_versions: ['1.1.3'],
			store_url: 'https://play.google.com/store/apps/details?id=com.geminislabs.nexus',
			updated_at: '2026-11-07T02:16:30Z',
			updated_by: 'gac:5b1f8c12-3456-4789-a012-3456789abcde'
		}
	};

	const MOCK_INSTALLS = {
		ios: {
			platform: 'ios',
			days: 30,
			total: 412,
			versions: [
				{ app_version: '1.1.0', installs: 300 },
				{ app_version: '1.0.1', installs: 100 },
				{ app_version: 'desconocida', installs: 12 }
			]
		},
		android: {
			platform: 'android',
			days: 30,
			total: 520,
			versions: [
				{ app_version: '1.2.0', installs: 350 },
				{ app_version: '1.1.3', installs: 20 },
				{ app_version: '1.1.0', installs: 130 },
				{ app_version: 'desconocida', installs: 20 }
			]
		}
	};

	/** @type {Record<Platform, PlatformForm>} */
	let forms = $state({
		ios: {
			min_supported_version: '',
			latest_version: '',
			store_url: '',
			blocked_versions: [],
			newBlockedInput: '',
			updated_at: null,
			updated_by: null,
			updated_by_display: null,
			errors: {}
		},
		android: {
			min_supported_version: '',
			latest_version: '',
			store_url: '',
			blocked_versions: [],
			newBlockedInput: '',
			updated_at: null,
			updated_by: null,
			updated_by_display: null,
			errors: {}
		}
	});

	/** @type {Record<Platform, any>} */
	let originalPolicies = $state({
		ios: null,
		android: null
	});

	/** @type {Record<Platform, any>} */
	let installsData = $state({
		ios: null,
		android: null
	});

	// Preview / Impact modal state
	let showImpactModal = $state(false);
	/** @type {import('$lib/services/appVersions').PreviewResponse | null} */
	let previewResult = $state(null);
	let confirmCriticalCheckbox = $state(false);
	let confirmVersionTyped = $state('');

	/** @type {SvelteMap<string, string>} */
	const userDisplayCache = new SvelteMap();

	onMount(async () => {
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get('mock') === 'true' || urlParams.get('mock') === '1') {
			isMockMode = true;
		}
		await loadData();
	});

	/**
	 * Resuelve el texto legible de updated_by (ej. si es gac:<uuid>, busca en userService)
	 * @param {string|null|undefined} raw
	 * @returns {Promise<string>}
	 */
	async function resolveUpdatedBy(raw) {
		if (!raw) return 'Desconocido';
		if (!raw.startsWith('gac:')) return raw;

		const uuid = raw.slice(4).trim();
		if (!uuid) return raw;

		if (userDisplayCache.has(uuid)) {
			return userDisplayCache.get(uuid) || raw;
		}

		try {
			const res = await userService.getUser(uuid);
			const u = res?.data || res;
			const display = u?.full_name || u?.name || u?.email || raw;
			userDisplayCache.set(uuid, display);
			return display;
		} catch {
			return raw;
		}
	}

	async function loadData() {
		isLoading = true;
		generalError = '';

		try {
			if (isMockMode) {
				applyMockPolicies();
				applyMockInstalls();
				isLoading = false;
				return;
			}

			let policies = [];
			try {
				policies = await AppVersionsService.getAll();
			} catch (err) {
				console.warn('Backend client-version-policy no respondió. Activando fallback mock.', err);
				isMockMode = true;
				applyMockPolicies();
				applyMockInstalls();
				isLoading = false;
				return;
			}

			if (Array.isArray(policies)) {
				for (const p of policies) {
					const plat = /** @type {Platform} */ (p.platform);
					if (forms[plat]) {
						originalPolicies[plat] = JSON.parse(JSON.stringify(p));
						forms[plat].min_supported_version = p.min_supported_version || '';
						forms[plat].latest_version = p.latest_version || '';
						forms[plat].store_url = p.store_url || '';
						forms[plat].blocked_versions = Array.isArray(p.blocked_versions)
							? [...p.blocked_versions]
							: [];
						forms[plat].updated_at = p.updated_at || null;
						forms[plat].updated_by = p.updated_by || null;
						forms[plat].updated_by_display = await resolveUpdatedBy(p.updated_by);
					}
				}
			}

			// Cargar installs en paralelo
			await Promise.all([loadPlatformInstalls('ios'), loadPlatformInstalls('android')]);
		} catch (err) {
			generalError = formatApiErrorMessage(err, 'Error al cargar la política de versiones');
		} finally {
			isLoading = false;
		}
	}

	/**
	 * @param {Platform} platform
	 */
	async function loadPlatformInstalls(platform) {
		try {
			if (isMockMode) {
				installsData[platform] = MOCK_INSTALLS[platform];
				return;
			}
			installsData[platform] = await AppVersionsService.getInstalls(platform, 30);
		} catch (err) {
			console.error(`Error cargando instalaciones de ${platform}:`, err);
			installsData[platform] = MOCK_INSTALLS[platform];
		}
	}

	function applyMockPolicies() {
		for (const plat of ['ios', 'android']) {
			const p = MOCK_POLICIES[/** @type {Platform} */ (plat)];
			const target = forms[/** @type {Platform} */ (plat)];
			originalPolicies[/** @type {Platform} */ (plat)] = JSON.parse(JSON.stringify(p));
			target.min_supported_version = p.min_supported_version || '';
			target.latest_version = p.latest_version || '';
			target.store_url = p.store_url || '';
			target.blocked_versions = [...p.blocked_versions];
			target.updated_at = p.updated_at;
			target.updated_by = p.updated_by;
			target.updated_by_display =
				p.updated_by === 'gac:5b1f8c12-3456-4789-a012-3456789abcde'
					? 'Administrador Nexus (admin@geminislabs.com)'
					: p.updated_by;
		}
	}

	function applyMockInstalls() {
		installsData.ios = MOCK_INSTALLS.ios;
		installsData.android = MOCK_INSTALLS.android;
	}

	/**
	 * @param {Platform} platform
	 */
	function handleAddBlockedVersion(platform) {
		const form = forms[platform];
		const version = (form.newBlockedInput || '').trim();
		if (!version) return;

		form.errors.blocked_versions = '';
		if (form.blocked_versions.includes(version)) {
			form.errors.blocked_versions = `La versión "${version}" ya está en la lista de bloqueadas`;
			return;
		}

		if (form.blocked_versions.length >= 50) {
			form.errors.blocked_versions = 'No se pueden añadir más de 50 versiones bloqueadas';
			return;
		}

		form.blocked_versions = [...form.blocked_versions, version];
		form.newBlockedInput = '';
	}

	/**
	 * @param {Platform} platform
	 * @param {string} version
	 */
	function handleRemoveBlockedVersion(platform, version) {
		const form = forms[platform];
		form.blocked_versions = form.blocked_versions.filter((v) => v !== version);
		form.errors.blocked_versions = '';
	}

	/**
	 * Construye el payload para PUT o Preview
	 * @param {Platform} platform
	 * @returns {import('$lib/services/appVersions').PolicyPayload}
	 */
	function buildPayload(platform) {
		const form = forms[platform];
		return {
			min_supported_version: form.min_supported_version.trim() || null,
			latest_version: form.latest_version.trim() || null,
			blocked_versions: form.blocked_versions.map((v) => v.trim()).filter(Boolean),
			store_url: form.store_url.trim()
		};
	}

	/**
	 * Verifica si el cambio sube el mínimo o agrega versiones bloqueadas
	 * @param {Platform} platform
	 */
	function isStrictCriticalChange(platform) {
		const form = forms[platform];
		const orig = originalPolicies[platform];
		if (!orig) return false;

		const newMin = form.min_supported_version.trim() || null;
		const oldMin = orig.min_supported_version || null;

		// Si antes no había mínimo y ahora sí, o cambió
		const minChanged = newMin !== oldMin && Boolean(newMin);

		// Si se agregaron nuevas versiones bloqueadas que antes no estaban
		const oldBlocked = new Set(orig.blocked_versions || []);
		const addedBlocked = form.blocked_versions.some((v) => !oldBlocked.has(v));

		return minChanged || addedBlocked;
	}

	/**
	 * Al pulsar "Guardar", se valida en cliente y se llama a `preview`
	 * @param {Platform} platform
	 */
	async function handleSaveClick(platform) {
		const form = forms[platform];
		form.errors = {};
		generalError = '';

		const payload = buildPayload(platform);

		// Validación local temprana
		const clientErrors = validatePolicyClient(platform, payload);
		if (Object.keys(clientErrors).length > 0) {
			form.errors = clientErrors;
			return;
		}

		isPreviewing = true;
		confirmCriticalCheckbox = false;
		confirmVersionTyped = '';

		try {
			if (isMockMode) {
				if (
					payload.store_url.includes('simular-422') ||
					payload.min_supported_version === '4.2.2'
				) {
					const mock422 = new Error('store_url debe ser de apps.apple.com');
					/** @type {any} */ (mock422).field = 'store_url';
					/** @type {any} */ (mock422).status = 422;
					throw mock422;
				}

				// Simulación de preview según datos de ejemplo del contrato
				const installs = installsData[platform] || MOCK_INSTALLS[platform];
				const total = installs.total || 412;
				let required = 0;
				let optional = 0;

				/** @type {import('$lib/services/appVersions').PreviewVersionItem[]} */
				const previewVersions = (installs.versions || []).map((v) => {
					let updateStatus = /** @type {'required' | 'optional' | 'none'} */ ('none');
					if (payload.blocked_versions.includes(v.app_version)) {
						updateStatus = 'required';
						required += v.installs;
					} else if (payload.min_supported_version && v.app_version === '1.0.1') {
						updateStatus = 'required';
						required += v.installs;
					} else if (payload.latest_version && v.app_version === '1.1.0') {
						updateStatus = 'optional';
						optional += v.installs;
					}
					return {
						app_version: v.app_version,
						installs: v.installs,
						update: updateStatus
					};
				});

				previewResult = {
					platform,
					days: 30,
					total,
					required,
					optional,
					versions: previewVersions
				};
			} else {
				previewResult = await AppVersionsService.preview(platform, payload, 30);
			}

			showImpactModal = true;
		} catch (err) {
			/** @type {any} */
			const errorObj = err;
			if (errorObj?.field) {
				form.errors[errorObj.field] = errorObj.message || 'Valor inválido';
			} else {
				generalError = formatApiErrorMessage(err, 'Error al calcular impacto de la política');
			}
		} finally {
			isPreviewing = false;
		}
	}

	/**
	 * Confirmación definitiva y ejecución de PUT /client-version-policy/{platform}
	 */
	async function handleConfirmSave() {
		if (!previewResult) return;
		const platform = previewResult.platform;
		const form = forms[platform];
		const payload = buildPayload(platform);

		isSaving = true;
		generalError = '';

		try {
			let updatedRow;
			if (isMockMode) {
				updatedRow = {
					platform,
					...payload,
					updated_at: new Date().toISOString(),
					updated_by: 'gac:admin-user-actual'
				};
			} else {
				updatedRow = await AppVersionsService.update(platform, payload);
			}

			// Actualizar estado en UI
			originalPolicies[platform] = JSON.parse(JSON.stringify(updatedRow));
			form.updated_at = updatedRow.updated_at || new Date().toISOString();
			form.updated_by = updatedRow.updated_by || 'gac:admin-user-actual';
			form.updated_by_display = await resolveUpdatedBy(form.updated_by);

			toast.success(`Política de ${platform.toUpperCase()} guardada correctamente`);
			showImpactModal = false;
			previewResult = null;

			// Refrescar conteo de instalaciones
			await loadPlatformInstalls(platform);
		} catch (err) {
			/** @type {any} */
			const errorObj = err;
			showImpactModal = false;
			if (errorObj?.field) {
				form.errors[errorObj.field] = errorObj.message || 'Valor inválido';
				toast.error(`Error en el campo: ${errorObj.field}`);
			} else {
				generalError = formatApiErrorMessage(err, 'Error al guardar la política de versiones');
				toast.error(generalError);
			}
		} finally {
			isSaving = false;
		}
	}

	/**
	 * Formatea una fecha UTC a hora local legible
	 * @param {string|null} dateStr
	 */
	function formatLocalDateTime(dateStr) {
		if (!dateStr) return 'Nunca';
		try {
			return new Date(dateStr).toLocaleString(undefined, {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			});
		} catch {
			return dateStr;
		}
	}

	let currentForm = $derived(forms[selectedPlatform]);
	let currentInstalls = $derived(installsData[selectedPlatform]);
	let isCritical = $derived(
		Boolean(previewResult && previewResult.required > 0 && isStrictCriticalChange(selectedPlatform))
	);

	let requiredConfirmed = $derived(
		!isCritical ||
			(confirmCriticalCheckbox &&
				(!currentForm.min_supported_version ||
					confirmVersionTyped.trim() === currentForm.min_supported_version.trim()))
	);
</script>

<div class="flex min-h-screen flex-col bg-app text-app">
	<Topbar title="Nexus / Política de Versiones Móviles" />

	<div class="space-y-6 p-8">
		<!-- AVISO FIJO DE PROPAGACIÓN (§3.3) -->
		<div
			class="flex items-start gap-3 rounded-lg border p-4 shadow-sm"
			style="background: var(--color-info-bg); border-color: var(--color-info-border); color: var(--color-info-text)"
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
				class="shrink-0 mt-0.5"
			>
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="16" x2="12" y2="12" />
				<line x1="12" y1="8" x2="12.01" y2="8" />
			</svg>
			<div class="text-sm">
				<p class="font-medium">Ventana de propagación de cambios</p>
				<p class="mt-0.5">
					Los cambios se aplican en <code class="font-mono font-semibold">client-config</code> al
					instante y en el resto de la API en <strong>hasta 60 segundos</strong> (caché del middleware).
				</p>
			</div>
		</div>

		{#if isMockMode}
			<div
				class="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-500"
			>
				<div class="flex items-center gap-2">
					<span class="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
					<span
						>Modo Mock activo: simulando respuestas del contrato §3.2 para desarrollo y pruebas.</span
					>
				</div>
				<button
					type="button"
					class="underline hover:text-amber-400 text-xs"
					onclick={() => {
						isMockMode = false;
						loadData();
					}}
				>
					Reintentar backend real
				</button>
			</div>
		{/if}

		{#if generalError}
			<div class="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-danger">
				<p class="font-semibold">Error</p>
				<p class="mt-1">{generalError}</p>
			</div>
		{/if}

		<!-- TABS DE PLATAFORMA -->
		<div class="flex gap-2 border-b" style="border-color: var(--color-border)">
			<button
				type="button"
				class="flex items-center gap-2 px-5 py-3 font-medium text-sm transition-all border-b-2 -mb-px {selectedPlatform ===
				'ios'
					? 'border-accent text-accent font-semibold'
					: 'border-transparent text-app-muted hover:text-app'}"
				onclick={() => (selectedPlatform = 'ios')}
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
				>
					<path
						d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"
					/>
					<path d="M10 2c1 .5 2 2 2 5" />
				</svg>
				Apple iOS
			</button>
			<button
				type="button"
				class="flex items-center gap-2 px-5 py-3 font-medium text-sm transition-all border-b-2 -mb-px {selectedPlatform ===
				'android'
					? 'border-accent text-accent font-semibold'
					: 'border-transparent text-app-muted hover:text-app'}"
				onclick={() => (selectedPlatform = 'android')}
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
				>
					<rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
					<path d="M12 18h.01" />
				</svg>
				Google Android
			</button>
		</div>

		{#if isLoading}
			<Card padding class="text-center py-12 text-app-muted">
				Cargando configuración de versiones...
			</Card>
		{:else}
			<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
				<!-- FORMULARIO DE POLÍTICA (2 columnas) -->
				<div class="space-y-6 lg:col-span-2">
					<Card padding class="space-y-6">
						<div
							class="flex items-center justify-between border-b pb-4"
							style="border-color: var(--color-border)"
						>
							<div>
								<h2 class="text-lg font-semibold text-app">
									Política de {selectedPlatform.toUpperCase()}
								</h2>
								<p class="text-xs text-app-muted mt-1">
									Define el umbral de actualización obligatoria, aviso opcional y fichas oficiales.
								</p>
							</div>
							<div class="text-right text-xs text-app-muted">
								<p>
									Última actualización:
									<strong class="text-app">{formatLocalDateTime(currentForm.updated_at)}</strong>
								</p>
								<p class="mt-0.5">
									Por:
									<span class="font-mono text-app">{currentForm.updated_by_display || 'N/A'}</span>
								</p>
							</div>
						</div>

						<!-- 1. min_supported_version -->
						<div class="space-y-1">
							<Input
								id="min_supported_version"
								label="Versión Mínima Soportada (min_supported_version)"
								placeholder="Ej: 1.1.0 (dejar vacío si no hay mínimo)"
								bind:value={currentForm.min_supported_version}
								error={currentForm.errors.min_supported_version}
							/>
							<p class="text-xs text-app-muted">
								Las versiones <strong>inferiores</strong> a esta quedarán
								<span class="text-danger font-medium">bloqueadas</span> con actualización obligatoria
								hacia la tienda. Si se deja vacío, no habrá bloqueo mínimo general.
							</p>
						</div>

						<!-- 2. latest_version -->
						<div class="space-y-1">
							<Input
								id="latest_version"
								label="Última Versión Publicada (latest_version)"
								placeholder="Ej: 1.3.0 (dejar vacío si no hay aviso)"
								bind:value={currentForm.latest_version}
								error={currentForm.errors.latest_version}
							/>
							<p class="text-xs text-app-muted">
								Las versiones inferiores a esta mostrarán un
								<span class="text-warning font-medium">aviso opcional</span> que el usuario puede descartar.
							</p>
						</div>

						<!-- 3. store_url -->
						<div class="space-y-1">
							<Input
								id="store_url"
								label="URL de la Ficha en Tienda (store_url)"
								placeholder={selectedPlatform === 'ios'
									? 'https://apps.apple.com/app/id123456789'
									: 'https://play.google.com/store/apps/details?id=com.geminislabs.nexus'}
								bind:value={currentForm.store_url}
								error={currentForm.errors.store_url}
							/>
							<p class="text-xs text-app-muted">
								{selectedPlatform === 'ios'
									? 'Debe iniciar con https:// y pertenecer al dominio apps.apple.com.'
									: 'Debe iniciar con https:// y pertenecer al dominio play.google.com.'}
								Es obligatoria si se fija una versión mínima.
							</p>
						</div>

						<!-- 4. blocked_versions -->
						<div class="space-y-2">
							<label for="new_blocked_input" class="gac-label">
								Versiones Específicas Bloqueadas (blocked_versions)
							</label>
							<p class="text-xs text-app-muted -mt-1">
								Versiones que tienen fallos críticos conocidos. Serán
								<strong class="text-danger">bloqueadas obligatoriamente</strong> incluso si son superiores
								al mínimo.
							</p>

							<div class="flex gap-2">
								<div class="flex-1">
									<input
										id="new_blocked_input"
										type="text"
										class="gac-input {currentForm.errors.blocked_versions
											? 'gac-input--error'
											: ''}"
										placeholder="Ej: 1.2.1"
										bind:value={currentForm.newBlockedInput}
										onkeydown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												handleAddBlockedVersion(selectedPlatform);
											}
										}}
									/>
								</div>
								<Button
									variant="secondary"
									size="md"
									onclick={() => handleAddBlockedVersion(selectedPlatform)}
								>
									Añadir
								</Button>
							</div>

							{#if currentForm.errors.blocked_versions}
								<p class="text-xs text-danger">{currentForm.errors.blocked_versions}</p>
							{/if}

							<!-- LISTA DE CHIPS BLOQUEADOS -->
							<div class="mt-3 flex flex-wrap gap-2 pt-1">
								{#if currentForm.blocked_versions.length === 0}
									<p class="text-xs italic text-app-muted">
										No hay versiones bloqueadas puntualmente.
									</p>
								{:else}
									{#each currentForm.blocked_versions as version (version)}
										<span
											class="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-mono font-medium text-danger"
										>
											v{version}
											<button
												type="button"
												class="hover:text-red-300 ml-0.5 rounded-full p-0.5"
												onclick={() => handleRemoveBlockedVersion(selectedPlatform, version)}
												title="Eliminar de lista de bloqueadas"
												aria-label="Eliminar versión {version}"
											>
												&times;
											</button>
										</span>
									{/each}
								{/if}
							</div>
						</div>

						<div
							class="flex justify-end gap-3 border-t pt-4"
							style="border-color: var(--color-border)"
						>
							<Button
								variant="primary"
								size="md"
								disabled={isPreviewing || isSaving}
								onclick={() => handleSaveClick(selectedPlatform)}
							>
								{#if isPreviewing}
									Calculando impacto...
								{:else}
									Guardar cambios
								{/if}
							</Button>
						</div>
					</Card>
				</div>

				<!-- DISTRIBUCIÓN DE INSTALACIONES (1 columna) -->
				<div class="space-y-6">
					<Card padding class="space-y-4">
						<div class="border-b pb-3" style="border-color: var(--color-border)">
							<h3 class="font-semibold text-app">Instalaciones Activas (30 días)</h3>
							<p class="text-xs text-app-muted mt-0.5">
								Distribución de versiones observadas en {selectedPlatform.toUpperCase()}.
							</p>
						</div>

						{#if !currentInstalls}
							<p class="text-xs text-app-muted py-4 text-center">
								Cargando métricas de instalación...
							</p>
						{:else}
							<div class="flex items-center justify-between rounded-lg bg-app-tertiary p-3">
								<span class="text-xs font-medium text-app-muted">Total dispositivos activos</span>
								<span class="text-lg font-bold text-app">{currentInstalls.total}</span>
							</div>

							<div class="space-y-3 pt-2">
								{#each currentInstalls.versions || [] as v (v.app_version)}
									{@const pct =
										currentInstalls.total > 0 ? (v.installs / currentInstalls.total) * 100 : 0}
									<div class="space-y-1">
										<div class="flex justify-between text-xs">
											<span class="font-mono font-medium text-app">v{v.app_version}</span>
											<span class="text-app-muted">{v.installs} inst. ({pct.toFixed(1)}%)</span>
										</div>
										<div class="h-2 w-full rounded-full bg-app-tertiary overflow-hidden">
											<div
												class="h-full rounded-full"
												style="width: {pct}%; background: var(--color-accent);"
											></div>
										</div>
									</div>
								{/each}
							</div>

							<p
								class="text-[11px] text-app-muted italic border-t pt-3"
								style="border-color: var(--color-border)"
							>
								Las versiones no identificadas como "desconocida" corresponden a clientes antiguos o
								sin header de versión.
							</p>
						{/if}
					</Card>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- MODAL DE IMPACTO Y CONFIRMACIÓN PREVIEW (§3.3) -->
{#if showImpactModal && previewResult}
	{@const total = previewResult.total || 0}
	{@const requiredCount = previewResult.required || 0}
	{@const optionalCount = previewResult.optional || 0}
	{@const reqPct = total > 0 ? ((requiredCount / total) * 100).toFixed(1) : '0'}
	{@const optPct = total > 0 ? ((optionalCount / total) * 100).toFixed(1) : '0'}

	<div
		class="gac-modal-backdrop"
		role="dialog"
		aria-modal="true"
		aria-labelledby="impact-modal-title"
		onclick={() => {
			if (!isSaving) showImpactModal = false;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape' && !isSaving) showImpactModal = false;
		}}
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="gac-modal max-w-2xl p-6 space-y-5"
			role="document"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			tabindex="-1"
		>
			<div
				class="flex items-start justify-between border-b pb-3"
				style="border-color: var(--color-border)"
			>
				<div>
					<h3 id="impact-modal-title" class="text-lg font-bold text-app">
						Impacto de la Nueva Política ({previewResult.platform.toUpperCase()})
					</h3>
					<p class="text-xs text-app-muted mt-1">
						Simulación estimada sobre las {total} instalaciones activas de los últimos 30 días.
					</p>
				</div>
				<button
					type="button"
					class="text-app-muted hover:text-app text-xl leading-none"
					onclick={() => (showImpactModal = false)}
					disabled={isSaving}
				>
					&times;
				</button>
			</div>

			<!-- RESUMEN EN LENGUAJE CLARO -->
			<div
				class="rounded-lg p-4 text-sm space-y-2 border {requiredCount > 0
					? 'bg-red-500/10 border-red-500/30 text-app'
					: 'bg-app-tertiary border-border text-app'}"
			>
				<p>
					Con esta política, <strong>{requiredCount} de {total}</strong> instalaciones activas ({reqPct}%)
					<span class={requiredCount > 0 ? 'text-danger font-semibold' : ''}
						>quedarán bloqueadas</span
					>
					hasta que el usuario actualice la app en la tienda, y
					<strong>{optionalCount}</strong> ({optPct}%) verán el aviso opcional.
				</p>
			</div>

			<!-- TABLA DE DESGLOSE DE VERSIONES -->
			<div
				class="max-h-60 overflow-y-auto rounded-md border"
				style="border-color: var(--color-border)"
			>
				<table class="gac-table w-full text-xs">
					<thead>
						<tr>
							<th>Versión</th>
							<th class="text-right">Instalaciones</th>
							<th class="text-right">% Total</th>
							<th class="text-center">Efecto en la App</th>
						</tr>
					</thead>
					<tbody>
						{#each previewResult.versions as item (item.app_version)}
							{@const pct = total > 0 ? ((item.installs / total) * 100).toFixed(1) : '0'}
							<tr>
								<td class="font-mono font-medium">{item.app_version}</td>
								<td class="text-right">{item.installs}</td>
								<td class="text-right">{pct}%</td>
								<td class="text-center">
									{#if item.update === 'required'}
										<span class="gac-badge gac-badge-danger">Actualización obligatoria</span>
									{:else if item.update === 'optional'}
										<span class="gac-badge gac-badge-warning">Aviso opcional</span>
									{:else}
										<span class="gac-badge gac-badge-success">Sin cambios</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- CONFIRMACIÓN EXPLÍCITA SI SUBE EL MÍNIMO O BLOQUEA CON required > 0 -->
			{#if isCritical}
				<div class="rounded-lg border border-red-500/40 bg-red-500/10 p-4 space-y-3">
					<div class="flex items-start gap-2 text-danger">
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
							class="shrink-0 mt-0.5"
						>
							<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
							<line x1="12" y1="9" x2="12" y2="13" />
							<line x1="12" y1="17" x2="12.01" y2="17" />
						</svg>
						<span class="text-xs font-semibold">Acción de alto impacto en producción</span>
					</div>
					<p class="text-xs text-app-secondary">
						Estás bloqueando activamente a <strong>{requiredCount}</strong> usuarios en producción. Para
						evitar bloqueos accidentales, confirma explícitamente:
					</p>

					<label class="flex items-center gap-2 cursor-pointer text-xs text-app font-medium">
						<input
							type="checkbox"
							class="rounded border-border text-danger focus:ring-danger h-4 w-4"
							bind:checked={confirmCriticalCheckbox}
						/>
						Confirmo que {requiredCount} instalaciones activas quedarán bloqueadas de inmediato.
					</label>

					{#if currentForm.min_supported_version}
						<div>
							<label for="confirm_version_input" class="gac-label text-xs">
								Escribe <span class="font-mono font-bold text-danger"
									>{currentForm.min_supported_version}</span
								> para confirmar el nuevo mínimo:
							</label>
							<input
								id="confirm_version_input"
								type="text"
								class="gac-input text-xs"
								placeholder={currentForm.min_supported_version}
								bind:value={confirmVersionTyped}
								autocomplete="off"
							/>
						</div>
					{/if}
				</div>
			{/if}

			<div class="flex justify-end gap-3 border-t pt-3" style="border-color: var(--color-border)">
				<Button
					variant="outline"
					size="sm"
					disabled={isSaving}
					onclick={() => (showImpactModal = false)}
				>
					Cancelar
				</Button>
				<Button
					variant={requiredCount > 0 ? 'danger' : 'primary'}
					size="sm"
					disabled={isSaving || !requiredConfirmed}
					onclick={handleConfirmSave}
				>
					{#if isSaving}
						Aplicando...
					{:else}
						Confirmar y aplicar política
					{/if}
				</Button>
			</div>
		</div>
	</div>
{/if}
