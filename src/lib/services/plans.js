import { internalApi } from '$lib/services/api';

/**
 * @typedef {Object} PlanCapability
 * @property {string} [id]
 * @property {string} [capability_id]
 * @property {string} capability_code
 * @property {any} [value]
 * @property {number} [value_int]
 * @property {boolean} [value_bool]
 * @property {string} [value_type]
 * @property {string} [description]
 */

/**
 * @typedef {Object} PlanProduct
 * @property {string} product_id
 * @property {string} code
 * @property {string} name
 */

/**
 * @typedef {Object} Plan
 * @property {string} [id]
 * @property {string} name
 * @property {string} code
 * @property {string} [description]
 * @property {string} price_monthly
 * @property {string} price_yearly
 * @property {boolean} is_active
 * @property {PlanCapability[]} [capabilities]
 * @property {PlanProduct[]} [products]
 * @property {string[]} [product_codes]
 * @property {number} [subscriptions_count]
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/**
 * @typedef {Object} AvailableProduct
 * @property {string} code
 * @property {string} name
 */

/**
 * @typedef {Object} AvailableCapability
 * @property {string} code
 * @property {string} value_type
 * @property {string} [description]
 */

export const PlansService = {
	/**
	 * Lista planes disponibles.
	 * @param {boolean} [includeInactive=true]
	 * @returns {Promise<{ plans: Plan[], data?: { plans: Plan[] } } | Plan[]>}
	 */
	getAll: async (includeInactive = true) => {
		return /** @type {Promise<any>} */ (
			internalApi(`/internal/plans?include_inactive=${includeInactive}`)
		);
	},

	/**
	 * Obtiene un plan por ID.
	 * @param {string} id
	 * @returns {Promise<Plan>}
	 */
	getById: async (id) => {
		return /** @type {Promise<Plan>} */ (internalApi(`/internal/plans/${id}`));
	},

	/**
	 * Crea un plan compuesto.
	 * @param {Partial<Plan>} data
	 * @returns {Promise<Plan>}
	 */
	create: async (data) => {
		return /** @type {Promise<Plan>} */ (
			internalApi('/internal/plans', {
				method: 'POST',
				body: JSON.stringify(data)
			})
		);
	},

	/**
	 * Actualiza un plan existente.
	 * @param {string} id
	 * @param {Partial<Plan>} data
	 * @returns {Promise<Plan>}
	 */
	update: async (id, data) => {
		return /** @type {Promise<Plan>} */ (
			internalApi(`/internal/plans/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(data)
			})
		);
	},

	/**
	 * Elimina un plan.
	 * @param {string} id
	 * @returns {Promise<void>}
	 */
	delete: async (id) => {
		await internalApi(`/internal/plans/${id}`, { method: 'DELETE' });
	},

	/**
	 * Catálogo de productos disponibles para asociar al plan.
	 * @returns {Promise<AvailableProduct[]>}
	 */
	getAvailableProducts: async () => {
		/** @type {any} */
		const response = await internalApi('/internal/plans/products');
		if (Array.isArray(response)) return response;
		return response?.products || response?.data?.products || [];
	},

	/**
	 * Catálogo de capabilities disponibles.
	 * @returns {Promise<AvailableCapability[]>}
	 */
	getAvailableCapabilities: async () => {
		/** @type {any} */
		const response = await internalApi('/internal/plans/capabilities');
		if (Array.isArray(response)) return response;
		return response?.capabilities || response?.data?.capabilities || [];
	}
};
