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
 * @property {'PLATFORM' | 'RESELLER' | 'CUSTOMER'} [account_type] Desde siscom-admin-api#154
 * @property {string | null} [parent_account_id]
 */

/**
 * Capability comercial de una cuenta: la fila propia y el valor que rige
 * después del techo de los ancestros (`GET /internal/accounts/{id}/capabilities`).
 * @typedef {Object} AccountCapability
 * @property {string} code
 * @property {'bool' | 'int' | 'text'} value_type
 * @property {string} [description]
 * @property {boolean | number | string | null} own_value
 * @property {string | null} [reason]
 * @property {string | null} [expires_at]
 * @property {boolean} expired
 * @property {boolean | number | string | null} effective_value
 * @property {'cuenta' | 'ancestro' | 'default'} source
 * @property {string | null} [limited_by]
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
	},

	// ── Marca y reventa (B4) ────────────────────────────────────────────────
	// Solo con el token PASETO de GAC. Cambiar el tipo no concede nada: la
	// marca propia la da `white_label_enabled` y la reventa `can_resell`.

	/**
	 * Convierte la cuenta en marca (`RESELLER`) o la regresa a cliente final.
	 * @param {string} id
	 * @param {'RESELLER' | 'CUSTOMER'} accountType
	 */
	async setAccountType(id, accountType) {
		return internalApi(`/internal/accounts/${encodeURIComponent(id)}`, {
			method: 'PATCH',
			body: JSON.stringify({ account_type: accountType })
		});
	},

	/**
	 * Las capabilities comerciales de la cuenta, propias y efectivas.
	 * @param {string} id
	 * @returns {Promise<AccountCapability[]>}
	 */
	async getCapabilities(id) {
		const response = await internalApi(`/internal/accounts/${encodeURIComponent(id)}/capabilities`);
		return Array.isArray(response) ? response : [];
	},

	/**
	 * Fija el valor propio de una capability (crea o reemplaza la fila).
	 * @param {string} id
	 * @param {string} code
	 * @param {{ value: boolean | number | string, reason?: string | null, expires_at?: string | null }} body
	 * @returns {Promise<AccountCapability>}
	 */
	async setCapability(id, code, body) {
		return /** @type {Promise<AccountCapability>} */ (
			internalApi(
				`/internal/accounts/${encodeURIComponent(id)}/capabilities/${encodeURIComponent(code)}`,
				{ method: 'PUT', body: JSON.stringify(body) }
			)
		);
	},

	/**
	 * Quita la fila: la cuenta vuelve a heredar de sus ancestros.
	 * @param {string} id
	 * @param {string} code
	 */
	async removeCapability(id, code) {
		return internalApi(
			`/internal/accounts/${encodeURIComponent(id)}/capabilities/${encodeURIComponent(code)}`,
			{ method: 'DELETE' }
		);
	}
};
