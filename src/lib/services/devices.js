import { PUBLIC_SISCOM_API_URL } from '$env/static/public';
import { dev } from '$app/environment';
import { internalApi, dataPlaneApi } from '$lib/services/api';
import { withDeviceDataToken, getDeviceDataToken } from '$lib/services/dataToken';

/** Marcador de subprotocolo con el que siscom-api recibe el data token en el WebSocket. */
export const WS_TOKEN_PROTOCOL = 'siscom.data-token.v1';

/**
 * siscom-api contesta en el espacio en el que se le preguntó: con `device_ref`.
 * La consola trabaja con IMEI, así que se devuelve a IMEI.
 * @template T
 * @param {T} datos
 * @param {string} ref
 * @param {string} imei
 * @returns {T}
 */
function aImei(datos, ref, imei) {
	/** @param {any} fila */
	const traducir = (fila) =>
		fila && typeof fila === 'object' && fila.device_id === ref
			? { ...fila, device_id: imei }
			: fila;
	return /** @type {T} */ (Array.isArray(datos) ? datos.map(traducir) : traducir(datos));
}

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
 * @property {string} [last_assignment_at]
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
	 * Asigna un dispositivo a una organización (estado `preparado`).
	 * Pasa por PATCH /devices/{id}/status: valida la transición, deja rastro y
	 * no deja una fila activa en unit_devices contradiciendo el estado.
	 * @param {string} id
	 * @param {string} organizationId
	 * @returns {Promise<Device>}
	 */
	async assignOrganization(id, organizationId) {
		return this.updateStatus(id, {
			new_status: 'preparado',
			client_id: organizationId
		});
	},

	/**
	 * Última comunicación del dispositivo.
	 * @param {string} id
	 * @returns {Promise<DeviceCommunication | null>}
	 */
	async getLatestCommunication(id) {
		return withDeviceDataToken(id, async ({ token, ref }) =>
			aImei(
				/** @type {DeviceCommunication | null} */ (
					await dataPlaneApi(`/devices/${ref}/communications/latest`, token)
				),
				ref,
				id
			)
		);
	},

	/**
	 * URL de WebSocket para streaming. Recibe `device_ref`, no IMEI: es lo que
	 * acepta siscom-api con el data token.
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

		return withDeviceDataToken(deviceId, async ({ token, ref }) =>
			aImei(
				/** @type {DeviceCommunication[]} */ (
					await dataPlaneApi(`/devices/${ref}/communications${queryString}`, token)
				),
				ref,
				deviceId
			)
		);
	},

	/**
	 * Abre el WebSocket en vivo de un dispositivo, con el data token en el
	 * subprotocolo (`Sec-WebSocket-Protocol: siscom.data-token.v1, <token>`).
	 * siscom-api sólo lo valida al conectar, así que no hace falta renovarlo
	 * mientras siga abierto.
	 * @param {string} imei
	 * @returns {Promise<WebSocket>}
	 */
	async openStream(imei) {
		const { token, ref } = await getDeviceDataToken(imei);
		return new WebSocket(this.getStreamUrl(ref), [WS_TOKEN_PROTOCOL, token]);
	}
};
