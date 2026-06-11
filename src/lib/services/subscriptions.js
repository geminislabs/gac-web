import { internalApi } from '$lib/services/api';

/**
 * @typedef {Object} Subscription
 * @property {string} id
 * @property {string} organization_id
 * @property {string} plan_id
 * @property {string} status
 * @property {string} [billing_cycle]
 * @property {string} [plan_name]
 * @property {string} [plan_code]
 * @property {number} [days_remaining]
 * @property {boolean} [is_active]
 * @property {string} [started_at]
 * @property {string} [expires_at]
 * @property {string} [cancelled_at]
 * @property {boolean} [auto_renew]
 */

export const SubscriptionsService = {
	/**
	 * @param {string} organizationId
	 * @param {{ include_history?: boolean, limit?: number }} [options]
	 */
	async listByOrganization(organizationId, options = {}) {
		const params = new URLSearchParams();
		if (options.include_history === false) params.append('include_history', 'false');
		if (options.limit) params.append('limit', String(options.limit));
		const qs = params.toString() ? `?${params.toString()}` : '';
		const response = await internalApi(
			`/internal/organizations/${organizationId}/subscriptions${qs}`
		);
		return response?.subscriptions ?? [];
	},

	/**
	 * @param {string} organizationId
	 * @param {string} subscriptionId
	 */
	async getById(organizationId, subscriptionId) {
		return internalApi(`/internal/organizations/${organizationId}/subscriptions/${subscriptionId}`);
	},

	/**
	 * @param {string} organizationId
	 * @param {string} subscriptionId
	 * @param {{ cancel_immediately?: boolean, reason?: string }} [options]
	 */
	async cancel(organizationId, subscriptionId, options = {}) {
		return internalApi(
			`/internal/organizations/${organizationId}/subscriptions/${subscriptionId}/cancel`,
			{
				method: 'POST',
				body: JSON.stringify({
					cancel_immediately: options.cancel_immediately ?? false,
					reason: options.reason
				})
			}
		);
	}
};
