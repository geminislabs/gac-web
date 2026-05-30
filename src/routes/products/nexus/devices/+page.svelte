<script>
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	import CommandPanel from '$lib/components/nexus/CommandPanel.svelte';
	import AssignmentPanel from '$lib/components/nexus/AssignmentPanel.svelte';

	import { DevicesService } from '$lib/services/devices';
	import { TripsService } from '$lib/services/trips';

	import { onMount, onDestroy } from 'svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	/** @type {import('$lib/services/devices').Device[]} */
	let devices = $state([]);
	let isLoading = $state(true);

	let searchTerm = $state('');

	/** @type {string | null} */
	let selectedDeviceId = $state(null);

	let activeTab = $state('commands');

	let selectedDate = $state('');

	/** @type {string | null} */
	let lastCommunicationTime = $state(null);

	let sidebarWidth = $state(800);
	let isDragging = $state(false);
	let sidebarTab = $state('trips');

	/** @type {import('$lib/services/trips').Trip[]} */
	let trips = $state([]);
	let isLoadingTrips = $state(false);

	/** @type {string | null} */
	let selectedTripId = $state(null);

	/** @type {Record<string, unknown>[]} */
	let communications = $state([]);
	let isLoadingCommunications = $state(false);

	let hiddenColumns = new SvelteSet();

	/** @type {HTMLElement | undefined} */
	let mapContainer = $state();

	/** @type {any} */
	let map = $state(null);

	/** @type {any} */
	let googleRef = $state(null);

	/** @type {SvelteMap<string, any>} */
	let vehicleMarkers = new SvelteMap();

	/** @type {WebSocket | null} */
	let socket = $state(null);

	/** @type {string[]} */
	let selectedDevicesForAssignment = $state([]);

	/** @type {string | null} */
	let streamDeviceId = $state(null);

	let mapInitialized = $state(false);

	const allColumns = $derived(
		communications.length > 0 ? Object.keys(communications[0] || {}).filter((k) => k !== 'id') : []
	);

	onMount(async () => {
		const urlParams = new URLSearchParams(window.location.search);
		const deviceIdParam = urlParams.get('device_id');

		await loadDevices();

		if (deviceIdParam) {
			const deviceExists = devices.some((d) => d.device_id === deviceIdParam);
			if (deviceExists) selectDevice(deviceIdParam);
		}

		window.addEventListener('mousemove', handleResize);
		window.addEventListener('mouseup', stopResize);
	});

	onDestroy(() => {
		if (browser) {
			window.removeEventListener('mousemove', handleResize);
			window.removeEventListener('mouseup', stopResize);
		}
		cleanupStream();
		clearAllMarkers();
	});

	$effect(() => {
		if (mapContainer && !mapInitialized) {
			initMap();
		}
	});

	$effect(() => {
		const shouldStream = activeTab === 'communications' && selectedDeviceId && map;

		if (shouldStream) {
			if (streamDeviceId !== selectedDeviceId) {
				streamDeviceId = selectedDeviceId;
				if (selectedDeviceId) loadDeviceDataAndConnectStream(selectedDeviceId);

				if (selectedDate) {
					if (sidebarTab === 'trips') loadTrips();
					if (sidebarTab === 'history') loadCommunications();
				}
			}
		} else {
			if (streamDeviceId) {
				streamDeviceId = null;
				cleanupStream();
				lastCommunicationTime = null;
				selectedDate = '';
			}
		}
	});

	$effect(() => {
		if (activeTab === 'communications' && selectedDeviceId && selectedDate) {
			if (sidebarTab === 'trips') loadTrips();
			if (sidebarTab === 'history') loadCommunications();
		}
	});

	// ──────────────────────────────────────────────
	// Google Maps helpers
	// ──────────────────────────────────────────────

	/**
	 * Builds a vehicle SVG icon.
	 * @param {boolean} isOnline
	 * @param {number} [rotation=0]
	 * @returns {any}
	 */
	function getVehicleIcon(isOnline, rotation = 0) {
		return {
			path: 'M0,-15 L10,15 L0,10 L-10,15 Z',
			fillColor: isOnline ? '#22c55e' : '#64748b',
			fillOpacity: 1,
			strokeColor: '#FFFFFF',
			strokeWeight: 2,
			scale: 1.5,
			rotation,
			anchor: /** @type {any} */ (new /** @type {any} */ (window).google.maps.Point(0, 0))
		};
	}

	/** Remove all vehicle markers from the map. */
	function clearAllMarkers() {
		vehicleMarkers.forEach((m) => m.setMap(null));
		vehicleMarkers.clear();
	}

	/**
	 * Add or update a vehicle marker on the map.
	 * @param {{ device_id: string; latitude: number; longitude: number; bearing?: number; online?: boolean }} data
	 */
	function upsertVehicleMarker(data) {
		if (!map || !googleRef) return;

		const position = { lat: data.latitude, lng: data.longitude };
		const icon = getVehicleIcon(data.online ?? true, data.bearing ?? 0);

		if (vehicleMarkers.has(data.device_id)) {
			const marker = vehicleMarkers.get(data.device_id);
			marker?.setPosition(position);
			marker?.setIcon(icon);
		} else {
			const marker = new googleRef.maps.Marker({
				position,
				map,
				icon,
				title: data.device_id
			});
			vehicleMarkers.set(data.device_id, marker);
		}
	}

	async function initMap() {
		try {
			mapInitialized = true;

			const { Loader } = await import('@googlemaps/js-api-loader');
			const loader = new Loader({
				apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
				version: 'weekly',
				libraries: ['places', 'geometry', 'marker']
			});

			await loader.load();
			googleRef = /** @type {any} */ (window).google;

			map = new googleRef.maps.Map(mapContainer, {
				center: { lat: 20.6597, lng: -103.3496 }, // Guadalajara default
				zoom: 12,
				mapTypeId: 'roadmap',
				disableDefaultUI: false,
				zoomControl: true,
				streetViewControl: false,
				fullscreenControl: true,
				styles: [
					{ elementType: 'geometry', stylers: [{ color: '#1d2535' }] },
					{ elementType: 'labels.text.stroke', stylers: [{ color: '#1d2535' }] },
					{ elementType: 'labels.text.fill', stylers: [{ color: '#8a9bb0' }] },
					{
						featureType: 'administrative.locality',
						elementType: 'labels.text.fill',
						stylers: [{ color: '#d4e0f0' }]
					},
					{ featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d3f5a' }] },
					{
						featureType: 'road',
						elementType: 'geometry.stroke',
						stylers: [{ color: '#1a2a40' }]
					},
					{
						featureType: 'road',
						elementType: 'labels.text.fill',
						stylers: [{ color: '#9ca5b3' }]
					},
					{
						featureType: 'road.highway',
						elementType: 'geometry',
						stylers: [{ color: '#3a5a7a' }]
					},
					{
						featureType: 'water',
						elementType: 'geometry',
						stylers: [{ color: '#0e1626' }]
					},
					{
						featureType: 'water',
						elementType: 'labels.text.fill',
						stylers: [{ color: '#515c6d' }]
					}
				]
			});

			if (selectedDeviceId && activeTab === 'communications') {
				loadDeviceDataAndConnectStream(selectedDeviceId);
			}
		} catch (e) {
			console.error('Failed to initialize Google Maps:', e);
			mapInitialized = false;
		}
	}

	// ──────────────────────────────────────────────
	// Stream / live data
	// ──────────────────────────────────────────────

	function cleanupStream() {
		if (socket) {
			socket.close();
			socket = null;
		}
	}

	/** @param {string} deviceId */
	async function loadDeviceDataAndConnectStream(deviceId) {
		cleanupStream();

		try {
			const data = await DevicesService.getLatestCommunication(deviceId);
			if (!data) return;

			if (data.received_at) {
				let dateStr = data.received_at;
				if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?$/.test(dateStr)) dateStr += 'Z';

				const dateObj = new Date(dateStr);
				selectedDate = dateObj.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
				lastCommunicationTime = dateObj.toLocaleTimeString('es-MX', {
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit',
					hour12: true,
					timeZone: 'America/Mexico_City'
				});
			}

			if (map) {
				const lat = Number(data.latitude);
				const lng = Number(data.longitude);

				upsertVehicleMarker({
					device_id: deviceId,
					latitude: lat,
					longitude: lng,
					bearing: Number(data.course || data.heading || 0),
					online: true
				});

				map.setCenter({ lat, lng });
				map.setZoom(15);

				// Connect WebSocket for live updates
				const streamUrl = DevicesService.getStreamUrl(deviceId);
				socket = new WebSocket(streamUrl);

				socket.onopen = () => console.log('[nexus] WebSocket connected');

				socket.onmessage = (/** @type {MessageEvent<string>} */ event) => {
					try {
						const message = JSON.parse(event.data);
						if (message.event === 'message' && message.data?.data) {
							const raw = message.data.data;
							const lat = Number(raw.LATITUD);
							const lng = Number(raw.LONGITUD);

							if (!isNaN(lat) && !isNaN(lng)) {
								upsertVehicleMarker({
									device_id: raw.DEVICE_ID || deviceId,
									latitude: lat,
									longitude: lng,
									bearing: Number(raw.COURSE || raw.HEADING || 0),
									online: true
								});
							}
						}
					} catch (err) {
						console.error('[nexus] WS parse error', err);
					}
				};

				socket.onerror = (e) => console.error('[nexus] WebSocket error', e);
			}
		} catch (error) {
			console.error('[nexus] loadDeviceDataAndConnectStream error', error);
		}
	}

	// ──────────────────────────────────────────────
	// Data loaders
	// ──────────────────────────────────────────────

	async function loadDevices() {
		isLoading = true;
		try {
			devices = await DevicesService.getAll();
		} catch (error) {
			console.error(error);
		} finally {
			isLoading = false;
		}
	}

	async function loadTrips() {
		if (!selectedDeviceId || !selectedDate) return;
		isLoadingTrips = true;
		try {
			const response = await TripsService.getTrips({
				device_id: selectedDeviceId,
				day: selectedDate,
				tz: 'America/Mexico_City'
			});
			trips = response.trips || [];
		} catch (error) {
			console.error(error);
			trips = [];
		} finally {
			isLoadingTrips = false;
		}
	}

	async function loadCommunications() {
		if (!selectedDeviceId || !selectedDate) return;
		isLoadingCommunications = true;
		try {
			const response = await DevicesService.getCommunications(
				selectedDeviceId,
				selectedDate,
				'America/Mexico_City'
			);
			communications = response || [];
		} catch (error) {
			console.error(error);
			communications = [];
		} finally {
			isLoadingCommunications = false;
		}
	}

	// ──────────────────────────────────────────────
	// Resize
	// ──────────────────────────────────────────────

	function startResize() {
		isDragging = true;
	}

	/** @param {MouseEvent} event */
	function handleResize(event) {
		if (!isDragging) return;
		const newWidth = event.clientX - 64;
		if (newWidth > 200 && newWidth < 1200) sidebarWidth = newWidth;
	}

	function stopResize() {
		isDragging = false;
	}

	/** @param {string} deviceId */
	function selectDevice(deviceId) {
		selectedDeviceId = deviceId;
		selectedDevicesForAssignment = [deviceId];
	}

	// ──────────────────────────────────────────────
	// Derived
	// ──────────────────────────────────────────────

	let filteredDevices = $derived(
		devices.filter((device) => {
			const term = searchTerm.toLowerCase();
			return (
				(device.device_id || '').toLowerCase().includes(term) ||
				(device.brand || '').toLowerCase().includes(term) ||
				(device.model || '').toLowerCase().includes(term) ||
				(device.status || '').toLowerCase().includes(term)
			);
		})
	);
</script>

<div class="flex h-screen flex-col overflow-hidden bg-app text-app">
	<Topbar title="Nexus / Dispositivos" backUrl="/products/nexus" />

	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- Device list (top 40%) -->
		<div
			class="flex h-[40%] flex-col"
			style="border-bottom: 1px solid var(--color-border); background: var(--color-bg-secondary)"
		>
			<div
				class="z-10 flex items-center justify-between p-4"
				style="border-bottom: 1px solid var(--color-border); background: var(--color-bg-secondary)"
			>
				<div class="w-full md:w-1/2">
					<Input placeholder="Buscar..." bind:value={searchTerm} />
				</div>

				<div class="flex gap-2">
					{#if selectedDeviceId}
						<Button
							variant="primary"
							size="sm"
							onclick={() => goto(`/products/nexus/devices/${selectedDeviceId}`)}
						>
							Editar Dispositivo
						</Button>
					{/if}
					<Button variant="ghost" size="sm" onclick={loadDevices} disabled={isLoading}>
						Actualizar
					</Button>
				</div>
			</div>

			<div class="flex-1 overflow-y-auto">
				<table class="gac-table">
					<thead class="sticky top-0">
						<tr>
							<th>ID</th>
							<th>Marca</th>
							<th>Estatus</th>
							<th>Última</th>
						</tr>
					</thead>
					<tbody>
						{#if isLoading}
							<tr>
								<td colspan="4" class="px-6 py-8 text-center text-app-muted">Cargando...</td>
							</tr>
						{:else if filteredDevices.length === 0}
							<tr>
								<td colspan="4" class="px-6 py-8 text-center text-app-muted"> Sin dispositivos </td>
							</tr>
						{:else}
							{#each filteredDevices as device (device.device_id)}
								<tr
									class="cursor-pointer"
									style={selectedDeviceId === device.device_id
										? 'background-color: var(--color-accent-soft)'
										: ''}
									onclick={() => selectDevice(device.device_id)}
								>
									<td>{device.device_id}</td>
									<td>{device.brand}</td>
									<td>{device.status}</td>
									<td>{device.last_comm_at}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Bottom split: sidebar + map -->
		<div class="flex flex-1 overflow-hidden">
			<!-- Sidebar -->
			<div
				class="flex flex-col"
				style="width: {sidebarWidth}px; background: var(--color-bg-secondary); border-right: 1px solid var(--color-border)"
			>
				<!-- Tabs -->
				<div
					class="flex shrink-0 gap-1 border-b px-4 pt-3"
					style="border-color: var(--color-border)"
				>
					{#each [['commands', 'Comandos'], ['communications', 'En vivo'], ['assignment', 'Asignación']] as [tab, label] (tab)}
						<button
							class="rounded-t px-3 py-1.5 text-sm transition-colors"
							style={activeTab === tab
								? 'background: var(--color-bg-primary); color: var(--color-accent-primary); border-bottom: 2px solid var(--color-accent-primary);'
								: 'color: var(--color-text-muted)'}
							onclick={() => (activeTab = tab)}
						>
							{label}
						</button>
					{/each}
				</div>

				{#if activeTab === 'commands'}
					<div class="flex-1 overflow-auto p-4">
						<CommandPanel deviceId={selectedDeviceId} />
					</div>
				{:else if activeTab === 'assignment'}
					<div class="flex-1 overflow-auto p-4">
						<AssignmentPanel
							bind:selectedDevices={selectedDevicesForAssignment}
							onClose={() => {
								activeTab = 'commands';
							}}
							onSuccess={() => {
								activeTab = 'commands';
								loadDevices();
							}}
						/>
					</div>
				{:else}
					<!-- Communications / live tab -->
					<div class="shrink-0 p-4">
						<input type="date" class="gac-input w-full" bind:value={selectedDate} />

						{#if lastCommunicationTime}
							<p class="mt-1 text-xs" style="color: var(--color-text-muted)">
								Última: {lastCommunicationTime}
							</p>
						{/if}
					</div>

					<!-- Sub-tabs: trips / history -->
					<div class="flex shrink-0 gap-1 border-b px-4" style="border-color: var(--color-border)">
						{#each [['trips', 'Trayectos'], ['history', 'Historial']] as [tab, label] (tab)}
							<button
								class="rounded-t px-3 py-1 text-xs transition-colors"
								style={sidebarTab === tab
									? 'color: var(--color-accent-primary); border-bottom: 2px solid var(--color-accent-primary);'
									: 'color: var(--color-text-muted)'}
								onclick={() => (sidebarTab = tab)}
							>
								{label}
							</button>
						{/each}
					</div>

					<div class="flex-1 overflow-auto p-4">
						{#if sidebarTab === 'trips'}
							{#if isLoadingTrips}
								<p class="text-xs" style="color: var(--color-text-muted)">Cargando trayectos...</p>
							{:else if trips.length === 0}
								<p class="text-xs" style="color: var(--color-text-muted)">
									Sin trayectos para esta fecha
								</p>
							{:else}
								{#each trips as trip (trip.trip_id)}
									<button
										type="button"
										class="mb-2 w-full rounded-lg p-3 text-left gac-panel-solid"
										class:ring-2={selectedTripId === trip.trip_id}
										class:ring-sky-500={selectedTripId === trip.trip_id}
										onclick={() => (selectedTripId = trip.trip_id)}
									>
										<span class="text-sm">{trip.trip_id}</span>
									</button>
								{/each}
							{/if}
						{:else}
							<!-- History table -->
							{#if isLoadingCommunications}
								<p class="text-xs" style="color: var(--color-text-muted)">Cargando historial...</p>
							{:else if communications.length === 0}
								<p class="text-xs" style="color: var(--color-text-muted)">
									Sin registros para esta fecha
								</p>
							{:else}
								<div class="overflow-x-auto">
									<table class="gac-table text-xs">
										<thead>
											<tr>
												{#each allColumns.filter((c) => !hiddenColumns.has(c)) as col (col)}
													<th>{col}</th>
												{/each}
											</tr>
										</thead>
										<tbody>
											{#each communications as row, rowIdx (row.id ?? row.received_at ?? `row-${rowIdx}`)}
												<tr>
													{#each allColumns.filter((c) => !hiddenColumns.has(c)) as col (col)}
														<td>{row[col] ?? ''}</td>
													{/each}
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							{/if}
						{/if}
					</div>
				{/if}
			</div>

			<!-- Drag handle -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div
				class="w-1 cursor-col-resize transition-colors hover:bg-sky-400"
				style="background: var(--color-border)"
				onmousedown={startResize}
				role="separator"
				aria-orientation="vertical"
				tabindex="-1"
			></div>

			<!-- Map -->
			<div class="relative min-h-full flex-1" bind:this={mapContainer}>
				{#if !mapInitialized}
					<div
						class="absolute inset-0 flex items-center justify-center"
						style="background: var(--color-bg-primary)"
					>
						<p class="text-sm" style="color: var(--color-text-muted)">Cargando mapa...</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	:global(html),
	:global(body),
	:global(#app) {
		height: 100%;
		margin: 0;
		padding: 0;
	}
</style>
