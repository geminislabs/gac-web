import { internalApi } from '$lib/services/api';

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {string} [description]
 * @property {boolean} is_active
 * @property {string} [created_at]
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
 * Normaliza el listado de siscom-admin-api (`{ products, total }`).
 * @param {Record<string, any>|null|undefined} res
 * @returns {{ products: Product[], data: Product[] }}
 */
function normalizeListResponse(res) {
	const raw = res ?? {};
	const list = Array.isArray(raw.products) ? raw.products : [];
	return { products: list, data: list };
}

export const ProductsService = {
	/**
	 * Lista productos del catálogo (siscom-admin-api PASETO, `/internal/products`).
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
		const res = await internalApi(`/internal/products${queryString}`);
		return normalizeListResponse(res);
	},

	/**
	 * Obtiene un producto por ID.
	 * @param {string} id
	 * @returns {Promise<Product>}
	 */
	async getById(id) {
		return /** @type {Product} */ (await internalApi(`/internal/products/${id}`));
	},

	/**
	 * Crea un nuevo producto.
	 * @param {ProductCreatePayload} data
	 * @returns {Promise<Product>}
	 */
	async create(data) {
		return /** @type {Product} */ (
			await internalApi('/internal/products', {
				method: 'POST',
				body: JSON.stringify(data)
			})
		);
	},

	/**
	 * Actualiza un producto existente.
	 * @param {string} id
	 * @param {ProductUpdatePayload} data
	 * @returns {Promise<Product>}
	 */
	async update(id, data) {
		return /** @type {Product} */ (
			await internalApi(`/internal/products/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(data)
			})
		);
	},

	/**
	 * Soft delete (is_active = false). Siscom responde 204 sin cuerpo.
	 * @param {string} id
	 * @returns {Promise<void>}
	 */
	async delete(id) {
		await internalApi(`/internal/products/${id}`, { method: 'DELETE' });
	}
};
