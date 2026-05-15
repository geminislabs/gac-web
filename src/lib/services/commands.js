import { internalApi } from '$lib/services/api';

/**
 * @typedef {Object} DeviceCommand
 * @property {string} command_id
 * @property {string} device_id
 * @property {string} command
 * @property {string} status
 * @property {string} [media]
 * @property {Record<string, any>} [command_metadata]
 * @property {string} [requested_at]
 * @property {string} [updated_at]
 */

/**
 * @typedef {Object} CommandQueryParams
 * @property {number} [limit]
 * @property {number} [offset]
 * @property {string} [status_filter]
 */

/**
 * @typedef {Object} CommandCreatePayload
 * @property {string} device_id
 * @property {string} command
 * @property {string} media
 */

export const CommandsService = {
	/**
	 * Crea un nuevo comando para un dispositivo.
	 * @param {CommandCreatePayload} data
	 * @returns {Promise<DeviceCommand>}
	 */
	async create(data) {
		return /** @type {Promise<DeviceCommand>} */ (
			internalApi('/commands', {
				method: 'POST',
				body: JSON.stringify(data)
			})
		);
	},

	/**
	 * Obtiene comandos enviados a un dispositivo.
	 * @param {string} deviceId
	 * @param {CommandQueryParams} [params]
	 * @returns {Promise<{ commands: DeviceCommand[], total: number }>}
	 */
	async getByDevice(deviceId, params = {}) {
		const searchParams = new URLSearchParams();
		Object.entries(params).forEach(([key, value]) => {
			if (value !== null && value !== undefined && value !== '') {
				searchParams.append(key, String(value));
			}
		});

		const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
		return /** @type {Promise<{ commands: DeviceCommand[], total: number }>} */ (
			internalApi(`/commands/device/${deviceId}${queryString}`)
		);
	},

	/**
	 * Sincroniza un comando con el proveedor (KORE).
	 * @param {string} commandId
	 * @returns {Promise<DeviceCommand>}
	 */
	async sync(commandId) {
		return /** @type {Promise<DeviceCommand>} */ (
			internalApi(`/commands/${commandId}/sync`, { method: 'POST' })
		);
	}
};
