import { api } from './api';
import { OrdersService } from './orders';
import { PaymentsService } from './payments';
import { ShipmentsService } from './shipments';
import { toCommercialClientId } from '$lib/utils/commercialClient';

/**
 * @typedef {Object} CommercialClientSummary
 * @property {string} client_id
 * @property {string} account_id
 * @property {number} orders_count
 * @property {number} payments_count
 * @property {number} shipments_count
 */

/**
 * @typedef {Object} AccountCommerceBundle
 * @property {string} clientId
 * @property {import('./orders').Order[]} orders
 * @property {import('./payments').Payment[]} payments
 * @property {import('./shipments').Shipment[]} shipments
 * @property {CommercialClientSummary | null} summary
 */

export const CommerceService = {
	/**
	 * Resumen de actividad comercial (gac-api).
	 * @param {string} accountId
	 * @returns {Promise<CommercialClientSummary>}
	 */
	async getSummary(accountId) {
		const clientId = toCommercialClientId(accountId);
		/** @type {{ data?: CommercialClientSummary } & CommercialClientSummary} */
		const response = await api(`/clients/${clientId}`);
		return /** @type {CommercialClientSummary} */ (response?.data ?? response);
	},

	/**
	 * Órdenes, pagos y envíos del cliente comercial vinculado a la cuenta Nexus.
	 * @param {string} accountId
	 * @returns {Promise<AccountCommerceBundle>}
	 */
	async getByAccount(accountId) {
		const clientId = toCommercialClientId(accountId);

		const [orders, payments, shipments, summary] = await Promise.all([
			OrdersService.getByClient(clientId),
			PaymentsService.getByClient(clientId),
			ShipmentsService.getByClient(clientId),
			CommerceService.getSummary(accountId).catch(() => null)
		]);

		return {
			clientId,
			orders,
			payments,
			shipments,
			summary
		};
	}
};
