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
	}
};
