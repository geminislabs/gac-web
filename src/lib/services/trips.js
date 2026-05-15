import { internalApi } from '$lib/services/api';

/**
 * @typedef {Object} Trip
 * @property {string} trip_id
 * @property {string} device_id
 * @property {string} [start_at]
 * @property {string} [end_at]
 * @property {number} [distance_km]
 * @property {number} [duration_seconds]
 * @property {number} [max_speed]
 * @property {number} [avg_speed]
 */

/**
 * @typedef {Object} TripFilters
 * @property {string} [device_id]
 * @property {string} [day]
 * @property {string} [tz]
 */

/**
 * @typedef {Object} TripDetailOptions
 * @property {boolean} [include_alerts]
 * @property {boolean} [include_points]
 * @property {boolean} [include_events]
 */

export const TripsService = {
	/**
	 * Lista trayectos de un dispositivo.
	 * @param {TripFilters} [filters]
	 * @returns {Promise<{ trips: Trip[] }>}
	 */
	async getTrips(filters = {}) {
		const params = new URLSearchParams();
		Object.entries(filters).forEach(([key, value]) => {
			if (value !== null && value !== undefined && value !== '') {
				params.append(key, String(value));
			}
		});

		const queryString = params.toString() ? `?${params.toString()}` : '';
		return /** @type {Promise<{ trips: Trip[] }>} */ (
			internalApi(`/trips${queryString}`)
		);
	},

	/**
	 * Detalle de un trayecto.
	 * @param {string} tripId
	 * @param {TripDetailOptions} [options]
	 * @returns {Promise<Trip>}
	 */
	async getTripById(tripId, options = {}) {
		const params = new URLSearchParams();
		if (options.include_alerts) params.append('include_alerts', 'true');
		if (options.include_points) params.append('include_points', 'true');
		if (options.include_events) params.append('include_events', 'true');

		const queryString = params.toString() ? `?${params.toString()}` : '';
		return /** @type {Promise<Trip>} */ (
			internalApi(`/trips/${tripId}${queryString}`)
		);
	}
};
