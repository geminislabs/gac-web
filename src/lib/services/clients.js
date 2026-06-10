import { internalApi } from '$lib/services/api';

/**
 * @typedef {Object} ClientAccount
 * @property {string} id
 * @property {string} [commercial_client_id] Mismo UUID que id; client_id en gac-api
 * @property {string} account_name
 * @property {string} [billing_email]
 * @property {string} [owner_email]
 * @property {string} status
 * @property {number} [total_users]
 * @property {number} [total_organizations]
 * @property {string} [active_subscription_id]
 * @property {'active' | 'inactive'} [nexus_service_status]
 * @property {string} [active_plan_name]
 * @property {string} [active_plan_code]
 * @property {string} [active_organization_id]
 * @property {string} [active_organization_name]
 * @property {string} [billing_cycle]
 * @property {number} [active_units]
 * @property {string} [expires_at]
 * @property {string} created_at
 * @property {string} [updated_at]
 */

/**
 * @typedef {Object} ClientStats
 * @property {{ total: number }} accounts
 * @property {{ total: number }} devices
 * @property {{ total: number }} users
 */

/**
 * @typedef {Object} ClientOrganization
 * @property {string} id
 * @property {string} name
 * @property {string} [billing_email]
 */

/**
 * @typedef {Object} ClientFilters
 * @property {number} [limit]
 * @property {number} [offset]
 * @property {string} [status]
 * @property {string} [search]
 * @property {string} [client_id]
 */

export const ClientsService = {
	/**
	 * Lista cuentas/clientes (admin interno).
	 * @param {ClientFilters} [filters]
	 * @returns {Promise<ClientAccount[]>}
	 */
	async getAll(filters = {}) {
		const params = new URLSearchParams();
		if (!filters.limit) {
			params.append('limit', '50');
		}

		Object.entries(filters).forEach(([key, value]) => {
			if (value !== null && value !== undefined && value !== '') {
				params.append(key, String(value));
			}
		});

		const queryString = params.toString() ? `?${params.toString()}` : '';
		return /** @type {Promise<ClientAccount[]>} */ (
			internalApi(`/internal/accounts${queryString}`)
		);
	},

	/**
	 * Estadísticas agregadas para el dashboard administrativo.
	 * @returns {Promise<ClientStats>}
	 */
	async getStats() {
		return /** @type {Promise<ClientStats>} */ (internalApi('/internal/accounts/stats'));
	},

	/**
	 * Obtiene una cuenta/cliente por ID.
	 * @param {string} id
	 * @returns {Promise<ClientAccount>}
	 */
	async getById(id) {
		return /** @type {Promise<ClientAccount>} */ (internalApi(`/internal/accounts/${id}`));
	},

	/**
	 * Lista organizaciones asociadas a una cuenta.
	 * @param {string} id
	 * @returns {Promise<ClientOrganization[]>}
	 */
	async getOrganizations(id) {
		/** @type {any} */
		const response = await internalApi(`/internal/accounts/${id}/organizations`);
		return Array.isArray(response) ? response : response?.organizations || [];
	}
};
