import { internalApi } from '$lib/services/api';

/**
 * @typedef {Object} SimKoreProfile
 * @property {string} kore_sim_id
 * @property {string} [kore_account_id]
 */

/**
 * @typedef {Object} Sim
 * @property {string} sim_id
 * @property {string} [device_id]
 * @property {string} carrier
 * @property {string} iccid
 * @property {string} [imsi]
 * @property {string} [msisdn]
 * @property {string} status
 * @property {SimKoreProfile} [kore_profile]
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} SimFilters
 * @property {boolean} [unassigned]
 * @property {string} [carrier]
 * @property {string} [status]
 */

/**
 * @typedef {Object} SimAssignResponse
 * @property {string} sim_id
 * @property {string} device_id
 * @property {string} message
 */

export const SimsService = {
	/**
	 * Lista SIMs con filtros opcionales.
	 * @param {SimFilters} [filters]
	 * @returns {Promise<Sim[]>}
	 */
	async getAll(filters = {}) {
		const params = new URLSearchParams();
		Object.entries(filters).forEach(([key, value]) => {
			if (value !== null && value !== undefined && value !== '') {
				params.append(key, String(value));
			}
		});

		const queryString = params.toString() ? `?${params.toString()}` : '';
		/** @type {any} */
		const response = await internalApi(`/sims${queryString}`);
		if (Array.isArray(response)) return response;
		return response?.sims || response?.data?.sims || [];
	},

	/**
	 * Lista SIMs disponibles (sin dispositivo asignado).
	 * @returns {Promise<Sim[]>}
	 */
	async getUnassigned() {
		return this.getAll({ unassigned: true });
	},

	/**
	 * Obtiene una SIM por ID.
	 * @param {string} simId
	 * @returns {Promise<Sim>}
	 */
	async getById(simId) {
		return /** @type {Promise<Sim>} */ (internalApi(`/sims/${simId}`));
	},

	/**
	 * Asigna una SIM a un dispositivo.
	 * @param {string} simId
	 * @param {string} deviceId
	 * @returns {Promise<SimAssignResponse>}
	 */
	async assignToDevice(simId, deviceId) {
		return /** @type {Promise<SimAssignResponse>} */ (
			internalApi(`/sims/${simId}/assign`, {
				method: 'POST',
				body: JSON.stringify({ device_id: deviceId })
			})
		);
	},

	/**
	 * Desasigna una SIM de su dispositivo actual.
	 * @param {string} simId
	 * @returns {Promise<SimAssignResponse>}
	 */
	async unassignFromDevice(simId) {
		return /** @type {Promise<SimAssignResponse>} */ (
			internalApi(`/sims/${simId}/unassign`, {
				method: 'POST'
			})
		);
	},

	/**
	 * Sincroniza SIMs desde KORE.
	 * @returns {Promise<any>}
	 */
	async syncFromKore() {
		return internalApi('/sims/sync/kore', {
			method: 'POST'
		});
	}
};
