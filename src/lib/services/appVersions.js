import { internalApi } from '$lib/services/api';

/**
 * @typedef {'android' | 'ios'} Platform
 */

/**
 * @typedef {Object} ClientVersionPolicy
 * @property {Platform} platform
 * @property {string|null} min_supported_version
 * @property {string|null} latest_version
 * @property {string[]} blocked_versions
 * @property {string} store_url
 * @property {string|null} [updated_at]
 * @property {string|null} [updated_by]
 */

/**
 * @typedef {Object} PolicyPayload
 * @property {string|null} min_supported_version
 * @property {string|null} latest_version
 * @property {string[]} blocked_versions
 * @property {string} store_url
 */

/**
 * @typedef {Object} VersionInstallsItem
 * @property {string} app_version
 * @property {number} installs
 */

/**
 * @typedef {Object} VersionInstallsResponse
 * @property {Platform} platform
 * @property {number} days
 * @property {number} total
 * @property {VersionInstallsItem[]} versions
 */

/**
 * @typedef {Object} PreviewVersionItem
 * @property {string} app_version
 * @property {number} installs
 * @property {'required' | 'optional' | 'none'} update
 */

/**
 * @typedef {Object} PreviewResponse
 * @property {Platform} platform
 * @property {number} days
 * @property {number} total
 * @property {number} required
 * @property {number} optional
 * @property {PreviewVersionItem[]} versions
 */

const VERSION_REGEX = /^v?\d+(\.\d+)*$/;

/**
 * Valida localmente el formato y consistencia básica de la política para feedback temprano.
 * La fuente de verdad final es la validación 422 del backend.
 * @param {Platform} platform
 * @param {PolicyPayload} data
 * @returns {Record<string, string>} Mapa de errores por campo (vacío si todo es válido).
 */
export function validatePolicyClient(platform, data) {
	/** @type {Record<string, string>} */
	const errors = {};

	if (data.min_supported_version && !VERSION_REGEX.test(data.min_supported_version.trim())) {
		errors.min_supported_version = 'Formato de versión inválido (ej. 1.0.0)';
	}

	if (data.latest_version && !VERSION_REGEX.test(data.latest_version.trim())) {
		errors.latest_version = 'Formato de versión inválido (ej. 1.2.0)';
	}

	if (Array.isArray(data.blocked_versions)) {
		if (data.blocked_versions.length > 50) {
			errors.blocked_versions = 'No se pueden bloquear más de 50 versiones';
		} else {
			const set = new Set();
			for (const v of data.blocked_versions) {
				const trimmed = (v || '').trim();
				if (!trimmed || !VERSION_REGEX.test(trimmed)) {
					errors.blocked_versions = `Versión bloqueada inválida: "${v}"`;
					break;
				}
				if (set.has(trimmed)) {
					errors.blocked_versions = `Versión duplicada en lista de bloqueadas: "${trimmed}"`;
					break;
				}
				set.add(trimmed);
			}
		}
	}

	const storeUrl = (data.store_url || '').trim();
	if (data.min_supported_version && !storeUrl) {
		errors.store_url = 'No se puede fijar una versión mínima sin URL de la tienda';
	} else if (storeUrl) {
		try {
			const parsed = new URL(storeUrl);
			if (parsed.protocol !== 'https:') {
				errors.store_url = 'La URL de la tienda debe usar HTTPS';
			} else if (platform === 'ios' && parsed.hostname !== 'apps.apple.com') {
				errors.store_url = 'store_url debe ser de apps.apple.com';
			} else if (platform === 'android' && parsed.hostname !== 'play.google.com') {
				errors.store_url = 'store_url debe ser de play.google.com';
			}
		} catch {
			errors.store_url = 'URL de la tienda inválida';
		}
	}

	return errors;
}

export const AppVersionsService = {
	/**
	 * Obtiene la lista de políticas de versión (todas las plataformas).
	 * @returns {Promise<ClientVersionPolicy[]>}
	 */
	async getAll() {
		return /** @type {Promise<ClientVersionPolicy[]>} */ (internalApi('/client-version-policy'));
	},

	/**
	 * Actualiza la política para una plataforma específica.
	 * @param {Platform} platform
	 * @param {PolicyPayload} body
	 * @returns {Promise<ClientVersionPolicy>}
	 */
	async update(platform, body) {
		return /** @type {Promise<ClientVersionPolicy>} */ (
			internalApi(`/client-version-policy/${platform}`, {
				method: 'PUT',
				body: JSON.stringify(body)
			})
		);
	},

	/**
	 * Obtiene el conteo de instalaciones activas por versión en los últimos N días.
	 * @param {Platform} platform
	 * @param {number} [days=30]
	 * @returns {Promise<VersionInstallsResponse>}
	 */
	async getInstalls(platform, days = 30) {
		return /** @type {Promise<VersionInstallsResponse>} */ (
			internalApi(`/client-version-policy/${platform}/installs?days=${days}`)
		);
	},

	/**
	 * Simula el impacto de una política sin guardarla.
	 * @param {Platform} platform
	 * @param {PolicyPayload} body
	 * @param {number} [days=30]
	 * @returns {Promise<PreviewResponse>}
	 */
	async preview(platform, body, days = 30) {
		return /** @type {Promise<PreviewResponse>} */ (
			internalApi(`/client-version-policy/${platform}/preview?days=${days}`, {
				method: 'POST',
				body: JSON.stringify(body)
			})
		);
	}
};
