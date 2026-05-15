<script>
	import { CommandsService } from '$lib/services/commands';
	import Button from '$lib/components/ui/Button.svelte';
	// Input import removed

	/** @type {{ deviceId: string | null }} */
	let { deviceId = null } = $props();

	/** @type {any[]} */
	let commands = $state([]);
	let loading = $state(false);
	let sendLoading = $state(false);
	let newCommand = $state('');
	/** @type {string | null} */
	let error = $state(null);

	// New State
	/** @type {Record<string, boolean>} */
	let syncLoading = $state({}); // Track loading state by command_id
	let showMetadataModal = $state(false);
	/** @type {any} */
	let selectedMetadata = $state(null);
	let toast = $state({ show: false, message: '', type: 'info' });
	/** @type {any} */
	let toastTimeout;

	// Load commands when deviceId changes
	$effect(() => {
		if (deviceId) {
			loadCommands();
		} else {
			commands = [];
		}
	});

	async function loadCommands() {
		if (!deviceId) return;
		loading = true;
		error = null;
		try {
			// Fetch last 50 commands
			const response = await CommandsService.getByDevice(deviceId, { limit: 50 });
			// @ts-ignore
			commands = response.commands || [];
		} catch (e) {
			console.error('Error loading commands:', e);
			error = 'Error al cargar el historial de comandos';
		} finally {
			loading = false;
		}
	}

	async function handleSendCommand() {
		if (!deviceId || !newCommand.trim()) return;
		sendLoading = true;
		error = null;
		try {
			await CommandsService.create({
				device_id: deviceId,
				command: newCommand,
				media: 'KORE_SMS_API' // Explicitly requested media type
			});
			newCommand = '';
			showToast('Comando enviado exitosamente', 'success');
			// Refresh list after sending
			await loadCommands();
		} catch (e) {
			console.error('Error sending command:', e);
			error = 'Error al enviar el comando. Intente nuevamente.';
			showToast('Error al enviar el comando', 'error');
		} finally {
			sendLoading = false;
		}
	}

	/** @param {any} command */
	async function handleSync(command) {
		if (syncLoading[command.command_id]) return;

		syncLoading[command.command_id] = true;
		try {
			const updatedCommand = await CommandsService.sync(command.command_id);

			// Update local state
			const index = commands.findIndex((c) => c.command_id === command.command_id);
			if (index !== -1) {
				commands[index] = { ...commands[index], ...updatedCommand };
			}

			showToast('Sincronización exitosa', 'success');
		} catch (e) {
			console.error('Sync error:', e);

			// Update metadata with error if possible, or just toast
			const index = commands.findIndex((c) => c.command_id === command.command_id);
			if (index !== -1) {
				// Create a copy to trigger reactivity if needed, though $state array mutation should work
				const cmd = commands[index];
				commands[index] = {
					...cmd,
					metadata: {
						...cmd.metadata,
						sync_error: /** @type {any} */ (e).message
					}
				};
			}

			showToast('Error al sincronizar con KORE', 'error');
		} finally {
			syncLoading[command.command_id] = false;
		}
	}

	/** @param {string} text */
	function copyToClipboard(text) {
		navigator.clipboard
			.writeText(text)
			.then(() => {
				showToast('ID copiado al portapapeles', 'success');
			})
			.catch(() => {
				showToast('Error al copiar ID', 'error');
			});
	}

	/** @param {any} metadata */
	function openMetadata(metadata) {
		selectedMetadata = metadata;
		showMetadataModal = true;
	}

	function closeMetadata() {
		showMetadataModal = false;
		selectedMetadata = null;
	}

	/**
	 * @param {string} message
	 * @param {string} [type]
	 */
	function showToast(message, type = 'info') {
		if (toastTimeout) clearTimeout(toastTimeout);
		toast = { show: true, message, type };
		toastTimeout = setTimeout(() => {
			toast = { ...toast, show: false };
		}, 3000);
	}

	/** @param {string} dateString */
	function formatDate(dateString) {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleString();
	}
</script>

{#if deviceId}
	<div
		class="gac-panel-solid mt-6 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300"
	>
		<div
			class="flex items-center justify-between p-4"
			style="background: var(--color-bg-tertiary); border-bottom: 1px solid var(--color-border)"
		>
			<h3 class="font-semibold text-app">
				Comandos del Dispositivo:
				<span class="font-mono" style="color: var(--color-accent)">{deviceId}</span>
			</h3>
			<Button variant="ghost" size="sm" onclick={loadCommands} disabled={loading}>
				Recargar
			</Button>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3">
			<div
				class="p-4 md:col-span-1"
				style="background: var(--color-bg-tertiary); border-right: 1px solid var(--color-border)"
			>
				<h4 class="mb-3 text-sm font-medium text-app">Enviar Nuevo Comando</h4>
				<div class="space-y-3">
					<div>
						<label for="command-input" class="sr-only">Comando</label>
						<textarea
							id="command-input"
							bind:value={newCommand}
							class="gac-input min-h-[100px] w-full font-mono"
							placeholder="Escriba el comando aquí (ej. AT+LOCATION)..."
						></textarea>
						<p class="mt-1 text-xs text-app-muted">
							Medio de envío:
							<span class="font-mono font-medium text-app">KORE_SMS_API</span>
						</p>
					</div>

					{#if error}
						<div
							class="rounded p-2 text-xs"
							style="background: var(--color-danger-bg); color: var(--color-danger)"
						>
							{error}
						</div>
					{/if}

					<Button
						variant="primary"
						class="w-full"
						onclick={handleSendCommand}
						disabled={sendLoading || !newCommand.trim()}
					>
						{sendLoading ? 'Enviando...' : 'Enviar Comando'}
					</Button>
				</div>
			</div>

			<div class="flex h-[400px] flex-col md:col-span-2">
				<div
					class="sticky top-0 z-10 p-3"
					style="background: var(--color-bg-secondary); border-bottom: 1px solid var(--color-border)"
				>
					<h4 class="text-sm font-medium text-app">Historial Reciente</h4>
				</div>
				<div class="flex-1 overflow-y-auto p-0">
					{#if loading && commands.length === 0}
						<div class="flex h-full items-center justify-center text-app-muted">
							Cargando historial...
						</div>
					{:else if commands.length === 0}
						<div
							class="flex h-full items-center justify-center p-4 text-center text-sm text-app-muted"
						>
							No hay comandos registrados para este dispositivo.
						</div>
					{:else}
						<table class="gac-table">
							<thead class="sticky top-0">
								<tr>
									<th class="w-16">ID</th>
									<th>Estado</th>
									<th>Comando</th>
									<th>Metadata</th>
									<th>Fecha Envío</th>
									<th>Actualizado</th>
									<th class="text-right">Acciones</th>
								</tr>
							</thead>
							<tbody>
								{#each commands as cmd (cmd.command_id)}
									<tr>
										<td>
											<button
												class="rounded p-1 transition-colors"
												style="color: var(--color-text-muted)"
												onclick={() => copyToClipboard(cmd.command_id)}
												title="Copiar ID: {cmd.command_id}"
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
												>
													<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
													<path
														d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
													></path>
												</svg>
												<span class="sr-only">Copiar ID</span>
											</button>
										</td>
										<td>
											<span
												class={`gac-badge ${
													cmd.status === 'delivered'
														? 'gac-badge-success'
														: cmd.status === 'pending'
															? 'gac-badge-warning'
															: cmd.status === 'sent'
																? 'gac-badge-info'
																: cmd.status === 'failed'
																	? 'gac-badge-danger'
																	: 'gac-badge-neutral'
												}`}
											>
												{cmd.status}
											</span>
										</td>
										<td class="max-w-[200px] break-all font-mono text-xs">
											{cmd.command}
										</td>
										<td>
											{#if cmd.command_metadata && Object.keys(cmd.command_metadata).length > 0}
												<button
													class="rounded p-1 transition-colors"
													style="color: var(--color-text-muted)"
													onclick={() => openMetadata(cmd.command_metadata)}
													title="Ver Metadata"
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
														<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
														<circle cx="12" cy="12" r="3"></circle>
													</svg>
												</button>
											{:else}
												<span class="text-app-muted">-</span>
											{/if}
										</td>
										<td class="text-xs text-app-muted">{formatDate(cmd.requested_at)}</td>
										<td class="text-xs text-app-muted">{formatDate(cmd.updated_at)}</td>
										<td class="text-right">
											<button
												class="rounded p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
												style="color: var(--color-text-muted)"
												onclick={() => handleSync(cmd)}
												disabled={syncLoading[cmd.command_id]}
												title="Sincronizar con KORE"
											>
												{#if syncLoading[cmd.command_id]}
													<svg
														class="animate-spin"
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
														<path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
													</svg>
												{:else}
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
														<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
														<path d="M3 3v5h5"></path>
														<path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
														<path d="M16 21h5v-5"></path>
													</svg>
												{/if}
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}
				</div>
			</div>
		</div>
	</div>

	{#if showMetadataModal}
		<div class="gac-modal-backdrop" onclick={closeMetadata} role="presentation">
			<div
				class="gac-modal flex max-h-[80vh] max-w-2xl flex-col overflow-hidden"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.key === 'Escape' && closeMetadata()}
				role="dialog"
				tabindex="-1"
				aria-modal="true"
			>
				<div
					class="flex items-center justify-between p-4"
					style="border-bottom: 1px solid var(--color-border)"
				>
					<h3 class="text-lg font-semibold text-app">Metadata del Comando</h3>
					<button
						onclick={closeMetadata}
						class="transition-colors"
						style="color: var(--color-text-muted)"
						aria-label="Cerrar metadata"
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
						>
							<path d="M18 6 6 18"></path>
							<path d="m6 6 12 12"></path>
						</svg>
					</button>
				</div>
				<div
					class="overflow-y-auto p-4 font-mono text-sm"
					style="background: var(--color-bg-tertiary)"
				>
					<pre
						class="overflow-x-auto rounded p-4 text-xs leading-relaxed"
						style="background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border)">{JSON.stringify(
							selectedMetadata,
							null,
							2
						)}</pre>
				</div>
				<div
					class="flex justify-end p-4"
					style="background: var(--color-bg-tertiary); border-top: 1px solid var(--color-border)"
				>
					<Button variant="outline" size="sm" onclick={closeMetadata}>Cerrar</Button>
				</div>
			</div>
		</div>
	{/if}

	{#if toast.show}
		<div
			class="fixed bottom-4 right-4 z-toast animate-in slide-in-from-bottom-5 fade-in duration-300"
		>
			<div
				class="gac-panel-solid flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium"
				style={toast.type === 'success'
					? 'background: var(--color-success-bg); color: var(--color-success); border-color: var(--color-success)'
					: toast.type === 'error'
						? 'background: var(--color-danger-bg); color: var(--color-danger); border-color: var(--color-danger)'
						: ''}
			>
				{#if toast.type === 'success'}
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
						><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path
							d="m9 11 3 3L22 4"
						></path></svg
					>
				{:else if toast.type === 'error'}
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
						><circle cx="12" cy="12" r="10"></circle><line
							x1="12"
							x2="12"
							y1="8"
							y2="12"
						></line><line x1="12" x2="12.01" y1="16" y2="16"></line></svg
					>
				{/if}
				{toast.message}
			</div>
		</div>
	{/if}
{/if}
