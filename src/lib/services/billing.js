import { internalApi } from '$lib/services/api';

/**
 * @typedef {Object} ManualPaymentPayload
 * @property {string} account_id
 * @property {string} organization_id
 * @property {string} plan_id
 * @property {'MONTHLY' | 'YEARLY'} [billing_cycle]
 * @property {number} [active_units]
 * @property {string} [transaction_ref]
 * @property {string} [registration_notes]
 * @property {string} [operator_email]
 */

/**
 * @typedef {Object} ManualPaymentResult
 * @property {string} payment_id
 * @property {string} invoice_id
 * @property {string} subscription_id
 * @property {string} amount
 * @property {string} currency
 * @property {string} billing_cycle
 * @property {number} active_units
 */

export const BillingService = {
	/**
	 * Registra un pago en efectivo y activa la suscripción Nexus.
	 * @param {ManualPaymentPayload} payload
	 * @returns {Promise<ManualPaymentResult>}
	 */
	registerManualPayment: async (payload) => {
		return /** @type {Promise<ManualPaymentResult>} */ (
			internalApi('/internal/billing/manual-payments', {
				method: 'POST',
				body: JSON.stringify(payload)
			})
		);
	},

	/**
	 * @param {string} organizationId
	 */
	async getSummary(organizationId) {
		return internalApi(`/internal/organizations/${organizationId}/billing/summary`);
	},

	/**
	 * @param {string} organizationId
	 * @param {{ limit?: number, offset?: number, status?: string }} [filters]
	 */
	async listPayments(organizationId, filters = {}) {
		const params = new URLSearchParams();
		Object.entries(filters).forEach(([key, value]) => {
			if (value != null && String(value) !== '') params.append(key, String(value));
		});
		const qs = params.toString() ? `?${params.toString()}` : '';
		const response = await internalApi(
			`/internal/organizations/${organizationId}/billing/payments${qs}`
		);
		return response?.payments ?? [];
	},

	/**
	 * @param {string} organizationId
	 * @param {{ limit?: number, offset?: number }} [filters]
	 */
	async listInvoices(organizationId, filters = {}) {
		const params = new URLSearchParams();
		Object.entries(filters).forEach(([key, value]) => {
			if (value != null && String(value) !== '') params.append(key, String(value));
		});
		const qs = params.toString() ? `?${params.toString()}` : '';
		const response = await internalApi(
			`/internal/organizations/${organizationId}/billing/invoices${qs}`
		);
		return response?.invoices ?? [];
	},

	/**
	 * @param {string} organizationId
	 * @param {string} invoiceId
	 */
	async getInvoice(organizationId, invoiceId) {
		return internalApi(`/internal/organizations/${organizationId}/billing/invoices/${invoiceId}`);
	},

	/**
	 * Métodos de pago guardados (solo lectura).
	 * @param {string} organizationId
	 * @param {string} [gateway]
	 */
	async listPaymentMethods(organizationId, gateway = 'stripe') {
		const response = await internalApi(
			`/internal/organizations/${organizationId}/billing/payment-methods?gateway=${encodeURIComponent(gateway)}`
		);
		return Array.isArray(response) ? response : [];
	}
};
