import { internalApi } from '$lib/services/api';

/**
 * @typedef {Object} Organization
 * @property {string} id
 * @property {string} [account_id]
 * @property {string} name
 * @property {string} status
 * @property {string} [billing_email]
 * @property {string} [country]
 * @property {string} [timezone]
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/**
 * @typedef {Object} OrganizationUser
 * @property {string} id
 * @property {string} email
 * @property {string} [full_name]
 * @property {boolean} [is_master]
 * @property {boolean} [email_verified]
 * @property {boolean} [has_cognito]
 * @property {string} [created_at]
 */

/**
 * @typedef {Object} OrganizationFilters
 * @property {string} [status]
 * @property {string} [search]
 * @property {string} [account_id]
 * @property {number} [limit]
 * @property {number} [offset]
 */

/**
 * @typedef {Object} OrganizationCreatePayload
 * @property {string} account_id
 * @property {string} name
 * @property {string} [billing_email]
 * @property {string} [country]
 * @property {string} [timezone]
 */

/**
 * @typedef {Object} OrganizationUpdatePayload
 * @property {string} [name]
 * @property {string} [billing_email]
 * @property {string} [country]
 * @property {string} [timezone]
 */

export const OrganizationsService = {
	/**
	 * @param {OrganizationFilters} [filters]
	 * @returns {Promise<Organization[]>}
	 */
	async list(filters = {}) {
		const params = new URLSearchParams();
		Object.entries(filters).forEach(([key, value]) => {
			if (value !== null && value !== undefined && value !== '') {
				params.append(key, String(value));
			}
		});
		const qs = params.toString() ? `?${params.toString()}` : '';
		const response = await internalApi(`/internal/organizations${qs}`);
		return Array.isArray(response) ? response : response?.organizations || [];
	},

	/** @returns {Promise<{ total: number, by_status: Record<string, number> }>} */
	async getStats() {
		return /** @type {Promise<any>} */ (internalApi('/internal/organizations/stats'));
	},

	/**
	 * @param {string} id
	 * @returns {Promise<Organization>}
	 */
	async getById(id) {
		return /** @type {Promise<Organization>} */ (internalApi(`/internal/organizations/${id}`));
	},

	/**
	 * @param {string} id
	 * @returns {Promise<Record<string, unknown>>}
	 */
	async getNexusStatus(id) {
		return internalApi(`/internal/organizations/${id}/nexus-status`);
	},

	/**
	 * @param {string} id
	 * @returns {Promise<OrganizationUser[]>}
	 */
	async getUsers(id) {
		const response = await internalApi(`/internal/organizations/${id}/users`);
		return Array.isArray(response) ? response : [];
	},

	/**
	 * @param {OrganizationCreatePayload} payload
	 * @returns {Promise<Organization>}
	 */
	async create(payload) {
		return /** @type {Promise<Organization>} */ (
			internalApi('/internal/organizations', {
				method: 'POST',
				body: JSON.stringify(payload)
			})
		);
	},

	/**
	 * @param {string} id
	 * @param {OrganizationUpdatePayload} payload
	 * @returns {Promise<Organization>}
	 */
	async update(id, payload) {
		return /** @type {Promise<Organization>} */ (
			internalApi(`/internal/organizations/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(payload)
			})
		);
	},

	/**
	 * @param {string} id
	 * @param {string} newStatus
	 */
	async updateStatus(id, newStatus) {
		return internalApi(
			`/internal/organizations/${id}/status?new_status=${encodeURIComponent(newStatus)}`,
			{ method: 'PATCH' }
		);
	}
};
