import { PUBLIC_SISCOM_API_URL } from '$env/static/public';
import { dev } from '$app/environment';
import { internalApi } from '$lib/services/api';

/**
 * @typedef {Object} SimProfile
 * @property {string} [kore_sim_id]
 * @property {string} [kore_account_id]
 */

/**
 * @typedef {Object} Device
 * @property {string} device_id
 * @property {string} [brand]
 * @property {string} [model]
 * @property {string} [firmware_version]
 * @property {string} [notes]
 * @property {string} [iccid]
 * @property {string} [carrier]
 * @property {SimProfile} [sim_profile]
 * @property {string} [status]
 * @property {string} [client_id]
 * @property {string} [organization_id]
 * @property {string} [last_comm_at]
 */

/**
 * @typedef {Object} DeviceCommunication
 * @property {string} device_id
 * @property {string|number} [latitude]
 * @property {string|number} [longitude]
 * @property {number} [speed]
 * @property {number} [course]
 * @property {number} [heading]
 * @property {string} [received_at]
 */

/**
 * @typedef {Object} DeviceFilters
 * @property {string} [status]
 * @property {string} [client_id]
 * @property {string} [organization_id]
 * @property {string} [search]
 * @property {number} [limit]
 * @property {number} [offset]
 */

export const DevicesService = {
	/**
	 * Lista dispositivos con filtros opcionales.
	 * @param {DeviceFilters} [filters]
	 * @returns {Promise<Device[]>}
	 */
	async getAll(filters = {}) {
		const params = new URLSearchParams();
		Object.entries(filters).forEach(([key, value]) => {
			if (value !== null && value !== undefined && value !== '') {
				params.append(key, String(value));
			}
		});

		const queryString = params.toString() ? `?${params.toString()}` : '';
		/** @type {any} */
		const response = await internalApi(`/devices${queryString}`);
		if (Array.isArray(response)) return response;
		return response?.devices || response?.data?.devices || [];
	},

	/**
	 * Obtiene un dispositivo por ID.
	 * @param {string} id
	 * @returns {Promise<Device>}
	 */
	async getById(id) {
		return /** @type {Promise<Device>} */ (internalApi(`/devices/${id}`));
	},

	/**
	 * Crea un nuevo dispositivo.
	 * @param {Partial<Device>} data
	 * @returns {Promise<Device>}
	 */
	async create(data) {
		return /** @type {Promise<Device>} */ (
			internalApi('/devices/', {
				method: 'POST',
				body: JSON.stringify(data)
			})
		);
	},

	/**
	 * Actualiza un dispositivo.
	 * @param {string} id
	 * @param {Partial<Device>} data
	 * @returns {Promise<Device>}
	 */
	async update(id, data) {
		return /** @type {Promise<Device>} */ (
			internalApi(`/devices/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(data)
			})
		);
	},

	/**
	 * Cambia el estado de un dispositivo.
	 * @param {string} id
	 * @param {{ new_status: string, client_id?: string, unit_id?: string, notes?: string }} data
	 * @returns {Promise<Device>}
	 */
	async updateStatus(id, data) {
		return /** @type {Promise<Device>} */ (
			internalApi(`/devices/${id}/status`, {
				method: 'PATCH',
				body: JSON.stringify(data)
			})
		);
	},

	/**
	 * Historial de eventos de un dispositivo.
	 * @param {string} id
	 * @returns {Promise<any[]>}
	 */
	async getEvents(id) {
		return /** @type {Promise<any[]>} */ (internalApi(`/devices/${id}/events`));
	},

	/**
	 * Asigna un dispositivo a una organización.
	 * @param {string} id
	 * @param {string} organizationId
	 * @param {string} [status]
	 * @returns {Promise<Device>}
	 */
	async assignOrganization(id, organizationId, status = 'preparado') {
		/** @type {Record<string, string>} */
		const payload = { organization_id: organizationId };
		if (status) payload.status = status;

		return /** @type {Promise<Device>} */ (
			internalApi(`/devices/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(payload)
			})
		);
	},

	/**
	 * Última comunicación del dispositivo.
	 * @param {string} id
	 * @returns {Promise<DeviceCommunication | null>}
	 */
	async getLatestCommunication(id) {
		return /** @type {Promise<DeviceCommunication | null>} */ (
			internalApi(`/devices/${id}/communications/latest`, { service: 'public' })
		);
	},

	/**
	 * URL de WebSocket para streaming de un dispositivo.
	 * @param {string|string[]} deviceIds
	 * @returns {string}
	 */
	getStreamUrl(deviceIds) {
		const ids = Array.isArray(deviceIds) ? deviceIds.join(',') : deviceIds;

		if (dev) {
			const protocol =
				typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
			const host = typeof window !== 'undefined' ? window.location.host : 'localhost:5173';
			return `${protocol}//${host}/api/public/stream?device_ids=${ids}`;
		}

		const baseUrl = (PUBLIC_SISCOM_API_URL || '').replace(/\/$/, '');
		const wsUrl = baseUrl.replace(/^http/, 'ws');
		return `${wsUrl}/api/v1/stream?device_ids=${ids}`;
	},

	/**
	 * Historial de comunicaciones para un día específico.
	 * @param {string} deviceId
	 * @param {string} date - YYYY-MM-DD
	 * @param {string} [tz]
	 * @returns {Promise<DeviceCommunication[]>}
	 */
	async getCommunications(deviceId, date, tz) {
		const params = new URLSearchParams();
		if (date) params.append('received_at', date);
		if (tz) params.append('tz', tz);
		const queryString = params.toString() ? `?${params.toString()}` : '';

		return /** @type {Promise<DeviceCommunication[]>} */ (
			internalApi(`/devices/${deviceId}/communications${queryString}`, {
				service: 'public'
			})
		);
	}
};
