import { api } from '$lib/services/api';

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {string} [description]
 * @property {boolean} is_active
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/**
 * @typedef {Object} ProductFilters
 * @property {string} [search]
 * @property {boolean} [is_active]
 * @property {number} [limit]
 * @property {number} [offset]
 */

/**
 * @typedef {Object} ProductCreatePayload
 * @property {string} code
 * @property {string} name
 * @property {string} [description]
 * @property {boolean} [is_active]
 */

/**
 * @typedef {Object} ProductUpdatePayload
 * @property {string} [name]
 * @property {string} [description]
 * @property {boolean} [is_active]
 */

/**
 * Normaliza la respuesta del listado (`ResponseModel` con `data` array o formato legado).
 * @param {Record<string, any>|null|undefined} res
 * @returns {{ products: Product[], data: Product[] }}
 */
function normalizeListResponse(res) {
	const raw = res ?? {};
	const list = (Array.isArray(raw.data) && raw.data) || raw.data?.products || raw.products || [];
	return { products: list, data: list };
}

/**
 * @param {Record<string, any>|null|undefined} res
 * @returns {any}
 */
function unwrapData(res) {
	if (res && typeof res === 'object' && 'data' in res && res.data !== undefined) {
		return res.data;
	}
	return res;
}

export const ProductsService = {
	/**
	 * Lista productos del catálogo (gac-api JWT admin, vía `/api/gac`).
	 * @param {ProductFilters} [filters]
	 * @returns {Promise<{ products: Product[], data?: Product[] }>}
	 */
	async getAll(filters = {}) {
		const params = new URLSearchParams();
		if (!filters.limit) params.append('limit', '50');

		Object.entries(filters).forEach(([key, value]) => {
			if (value !== null && value !== undefined && value !== '') {
				params.append(key, String(value));
			}
		});

		const queryString = params.toString() ? `?${params.toString()}` : '';
		const res = await api(`/internal/products${queryString}`);
		return /** @type {Promise<{ products: Product[], data?: Product[] }>} */ (
			normalizeListResponse(res)
		);
	},

	/**
	 * Obtiene un producto por ID.
	 * @param {string} id
	 * @returns {Promise<Product>}
	 */
	async getById(id) {
		const res = await api(`/internal/products/${id}`);
		return /** @type {Promise<Product>} */ (unwrapData(res));
	},

	/**
	 * Crea un nuevo producto.
	 * @param {ProductCreatePayload} data
	 * @returns {Promise<Product>}
	 */
	async create(data) {
		const res = await api('/internal/products', {
			method: 'POST',
			body: JSON.stringify(data)
		});
		return /** @type {Promise<Product>} */ (unwrapData(res));
	},

	/**
	 * Actualiza un producto existente.
	 * @param {string} id
	 * @param {ProductUpdatePayload} data
	 * @returns {Promise<Product>}
	 */
	async update(id, data) {
		const res = await api(`/internal/products/${id}`, {
			method: 'PATCH',
			body: JSON.stringify(data)
		});
		return /** @type {Promise<Product>} */ (unwrapData(res));
	},

	/**
	 * Soft delete (is_active = false).
	 * @param {string} id
	 * @returns {Promise<void>}
	 */
	async delete(id) {
		await api(`/internal/products/${id}`, { method: 'DELETE' });
	}
};
