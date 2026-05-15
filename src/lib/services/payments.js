import { api } from './api';

/**
 * @typedef {Object} Payment
 * @property {string} payment_id
 * @property {string} client_id
 * @property {string} [order_id]
 * @property {string} amount
 * @property {string} method
 * @property {string} [transaction_ref]
 * @property {string} status
 * @property {string} [paid_at]
 * @property {string} created_at
 */

/**
 * @typedef {Object} PaymentCreatePayload
 * @property {string} client_id
 * @property {string} [order_id]
 * @property {string|number} amount
 * @property {string} method
 * @property {string} [transaction_ref]
 */

/**
 * @typedef {Object} PaymentListParams
 * @property {number} [skip]
 * @property {number} [limit]
 * @property {string} [status]
 */

/**
 * @template T
 * @typedef {{ message: string, data: T }} ApiEnvelope
 */

export const PaymentsService = {
	/**
	 * Lista paginada de pagos (admin).
	 * @param {PaymentListParams} [params]
	 * @returns {Promise<Payment[]>}
	 */
	async list(params = {}) {
		const search = new URLSearchParams();
		if (params.skip != null) search.append('skip', String(params.skip));
		if (params.limit != null) search.append('limit', String(params.limit));
		if (params.status) search.append('status', params.status);

		const qs = search.toString() ? `?${search.toString()}` : '';
		/** @type {ApiEnvelope<Payment[]>} */
		const response = await api(`/payments${qs}`);
		return response?.data ?? [];
	},

	/**
	 * Obtiene un pago por su ID.
	 * @param {string} paymentId
	 * @returns {Promise<Payment>}
	 */
	async getById(paymentId) {
		/** @type {ApiEnvelope<Payment>} */
		const response = await api(`/payments/${paymentId}`);
		return response.data;
	},

	/**
	 * Crea un nuevo pago.
	 * @param {PaymentCreatePayload} payload
	 * @returns {Promise<Payment>}
	 */
	async create(payload) {
		/** @type {ApiEnvelope<Payment>} */
		const response = await api('/payments', {
			method: 'POST',
			body: JSON.stringify(payload)
		});
		return response.data;
	},

	/**
	 * Lista pagos de un cliente específico.
	 * @param {string} clientId
	 * @returns {Promise<Payment[]>}
	 */
	async getByClient(clientId) {
		/** @type {ApiEnvelope<Payment[]>} */
		const response = await api(`/clients/${clientId}/payments`);
		return response.data ?? [];
	}
};
