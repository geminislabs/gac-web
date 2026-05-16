import { api } from './api';

/**
 * @typedef {Object} ShipmentAddress
 * @property {string} [street]
 * @property {string} [city]
 * @property {string} [state]
 * @property {string} [postal_code]
 * @property {string} [country]
 */

/**
 * @typedef {Object} Shipment
 * @property {string} shipment_id
 * @property {string} order_id
 * @property {string} client_id
 * @property {string} [shipping_carrier]
 * @property {string} [tracking_number]
 * @property {ShipmentAddress | Record<string, any>} [address]
 * @property {string} [status]
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} ShipmentCreatePayload
 * @property {string} order_id
 * @property {string} client_id
 * @property {string} [shipping_carrier]
 * @property {string} [tracking_number]
 * @property {Record<string, any>} [address]
 */

/**
 * @typedef {Object} ShipmentListParams
 * @property {number} [skip]
 * @property {number} [limit]
 * @property {string} [status]
 */

/**
 * @template T
 * @typedef {{ message: string, data: T }} ApiEnvelope
 */

export const ShipmentsService = {
	/**
	 * Lista paginada de envíos (admin).
	 * @param {ShipmentListParams} [params]
	 * @returns {Promise<Shipment[]>}
	 */
	async list(params = {}) {
		const search = new URLSearchParams();
		if (params.skip != null) search.append('skip', String(params.skip));
		if (params.limit != null) search.append('limit', String(params.limit));
		if (params.status) search.append('status', params.status);

		const qs = search.toString() ? `?${search.toString()}` : '';
		/** @type {ApiEnvelope<Shipment[]>} */
		const response = await api(`/shipments${qs}`);
		return response?.data ?? [];
	},

	/**
	 * Obtiene un envío por su ID.
	 * @param {string} shipmentId
	 * @returns {Promise<Shipment>}
	 */
	async getById(shipmentId) {
		/** @type {ApiEnvelope<Shipment>} */
		const response = await api(`/shipments/${shipmentId}`);
		return response.data;
	},

	/**
	 * Crea un nuevo envío.
	 * @param {ShipmentCreatePayload} payload
	 * @returns {Promise<Shipment>}
	 */
	async create(payload) {
		/** @type {ApiEnvelope<Shipment>} */
		const response = await api('/shipments', {
			method: 'POST',
			body: JSON.stringify(payload)
		});
		return response.data;
	},

	/**
	 * Actualiza el estado de un envío.
	 * @param {string} shipmentId
	 * @param {string} status
	 * @returns {Promise<Shipment>}
	 */
	async updateStatus(shipmentId, status) {
		/** @type {ApiEnvelope<Shipment>} */
		const response = await api(`/shipments/${shipmentId}/status`, {
			method: 'PATCH',
			body: JSON.stringify({ status })
		});
		return response.data;
	},

	/**
	 * Lista envíos de un cliente específico.
	 * @param {string} clientId
	 * @returns {Promise<Shipment[]>}
	 */
	async getByClient(clientId) {
		/** @type {ApiEnvelope<Shipment[]>} */
		const response = await api(`/clients/${clientId}/shipments`);
		return response.data ?? [];
	}
};
