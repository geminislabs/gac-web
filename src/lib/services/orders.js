import { api } from './api';

/**
 * @typedef {Object} OrderItem
 * @property {string} item_id
 * @property {string} order_id
 * @property {string} [device_id]
 * @property {string} [product_key]
 * @property {number} quantity
 * @property {string} unit_price
 * @property {string} created_at
 */

/**
 * @typedef {Object} Order
 * @property {string} order_id
 * @property {string} client_id
 * @property {string} [created_by]
 * @property {string} status
 * @property {string} total_amount
 * @property {string} [notes]
 * @property {OrderItem[]} items
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} OrderItemCreatePayload
 * @property {string} [device_id]
 * @property {string} [product_key]
 * @property {number} quantity
 * @property {string|number} unit_price
 */

/**
 * @typedef {Object} OrderCreatePayload
 * @property {string} client_id
 * @property {string} [notes]
 * @property {OrderItemCreatePayload[]} items
 */

/**
 * @typedef {Object} OrderListParams
 * @property {number} [skip]
 * @property {number} [limit]
 * @property {string} [status]
 */

/**
 * @template T
 * @typedef {{ message: string, data: T }} ApiEnvelope
 */

export const OrdersService = {
	/**
	 * Lista paginada de órdenes (admin).
	 * @param {OrderListParams} [params]
	 * @returns {Promise<Order[]>}
	 */
	async list(params = {}) {
		const search = new URLSearchParams();
		if (params.skip != null) search.append('skip', String(params.skip));
		if (params.limit != null) search.append('limit', String(params.limit));
		if (params.status) search.append('status', params.status);

		const qs = search.toString() ? `?${search.toString()}` : '';
		/** @type {ApiEnvelope<Order[]>} */
		const response = await api(`/orders${qs}`);
		return response?.data ?? [];
	},

	/**
	 * Obtiene una orden por su ID.
	 * @param {string} orderId
	 * @returns {Promise<Order>}
	 */
	async getById(orderId) {
		/** @type {ApiEnvelope<Order>} */
		const response = await api(`/orders/${orderId}`);
		return response.data;
	},

	/**
	 * Crea una nueva orden.
	 * @param {OrderCreatePayload} payload
	 * @returns {Promise<Order>}
	 */
	async create(payload) {
		/** @type {ApiEnvelope<Order>} */
		const response = await api('/orders', {
			method: 'POST',
			body: JSON.stringify(payload)
		});
		return response.data;
	},

	/**
	 * Lista órdenes de un cliente específico.
	 * @param {string} clientId
	 * @returns {Promise<Order[]>}
	 */
	async getByClient(clientId) {
		/** @type {ApiEnvelope<Order[]>} */
		const response = await api(`/clients/${clientId}/orders`);
		return response.data ?? [];
	}
};
