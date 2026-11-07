import { internalApi } from '$lib/services/api';
import {
	MOCK_POLICIES,
	MOCK_INSTALLS,
	simulatePreview,
	simulateUpdate
} from './appVersionsDevMock.js';

/**
 * @typedef {'android' | 'ios'} Platform
 */

/**
 * @typedef {Object} ClientVersionPolicy
 * @property {Platform} platform
 * @property {string|null} min_supported_version
 * @property {string|null} latest_version
 * @property {string[]} blocked_versions
 * @property {string|null} store_url
 * @property {string|null} [updated_at]
 * @property {string|null} [updated_by]
 */

/**
 * @typedef {Object} PolicyPayload
 * @property {string|null} min_supported_version
 * @property {string|null} latest_version
 * @property {string[]} blocked_versions
 * @property {string|null} store_url
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
 * Normaliza y sanea el payload de la política antes de enviarlo a la API o validarlo.
 * Convierte strings vacíos en `null` (incluyendo `store_url`).
 * @param {Partial<PolicyPayload>} data
 * @returns {PolicyPayload}
 */
export function normalizePolicyPayload(data) {
	const min = (data.min_supported_version || '').trim();
	const latest = (data.latest_version || '').trim();
	const store = (data.store_url || '').trim();

	return {
		min_supported_version: min ? min : null,
		latest_version: latest ? latest : null,
		blocked_versions: Array.isArray(data.blocked_versions)
			? data.blocked_versions.map((v) => (v || '').trim()).filter(Boolean)
			: [],
		store_url: store ? store : null
	};
}

/**
 * Valida localmente el formato y consistencia básica de la política para feedback temprano.
 * La fuente de verdad final es la validación 422 del backend.
 * @param {Platform} platform
 * @param {Partial<PolicyPayload>} rawData
 * @returns {Record<string, string>} Mapa de errores por campo (vacío si todo es válido).
 */
export function validatePolicyClient(platform, rawData) {
	/** @type {Record<string, string>} */
	const errors = {};
	const data = normalizePolicyPayload(rawData);

	if (data.min_supported_version && !VERSION_REGEX.test(data.min_supported_version)) {
		errors.min_supported_version = 'Formato de versión inválido (ej. 1.0.0)';
	}

	if (data.latest_version && !VERSION_REGEX.test(data.latest_version)) {
		errors.latest_version = 'Formato de versión inválido (ej. 1.2.0)';
	}

	if (Array.isArray(data.blocked_versions)) {
		if (data.blocked_versions.length > 50) {
			errors.blocked_versions = 'No se pueden bloquear más de 50 versiones';
		} else {
			const set = new Set();
			for (const v of data.blocked_versions) {
				if (!VERSION_REGEX.test(v)) {
					errors.blocked_versions = `Versión bloqueada inválida: "${v}"`;
					break;
				}
				if (set.has(v)) {
					errors.blocked_versions = `Versión duplicada en lista de bloqueadas: "${v}"`;
					break;
				}
				set.add(v);
			}
		}
	}

	if (data.min_supported_version && !data.store_url) {
		errors.store_url = 'No se puede fijar una versión mínima sin URL de la tienda';
	} else if (data.store_url) {
		try {
			const parsed = new URL(data.store_url);
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

/**
 * Determina si un cambio propuesto es crítico:
 * - Si no existe política previa conocida (fila original vacía/null), se asume crítico.
 * - Si se incrementa o se fija por primera vez `min_supported_version`.
 * - Si se añade alguna versión a `blocked_versions` que antes no estaba.
 * @param {ClientVersionPolicy | null | undefined} originalPolicy
 * @param {Partial<PolicyPayload>} newPayload
 * @returns {boolean}
 */
export function isStrictCriticalChange(originalPolicy, newPayload) {
	if (!originalPolicy) {
		return true;
	}

	const normalized = normalizePolicyPayload(newPayload);
	const oldMin = originalPolicy.min_supported_version || null;
	const newMin = normalized.min_supported_version || null;

	// Si antes no había mínimo y ahora sí, o cambió
	if (newMin !== oldMin && Boolean(newMin)) {
		return true;
	}

	// Si se agregaron nuevas versiones bloqueadas que antes no estaban
	const oldBlocked = new Set(originalPolicy.blocked_versions || []);
	const addedBlocked = normalized.blocked_versions.some((v) => !oldBlocked.has(v));
	if (addedBlocked) {
		return true;
	}

	return false;
}

/**
 * Evalúa si la confirmación explícita (checkbox y/o tipeo) es obligatoria:
 * Requiere que existan instalaciones que quedarán bloqueadas (`required > 0`)
 * Y que el cambio sea crítico según `isStrictCriticalChange`.
 * @param {{
 * 	originalPolicy: ClientVersionPolicy | null | undefined,
 * 	payload: Partial<PolicyPayload>,
 * 	preview: PreviewResponse | null | undefined
 * }} params
 * @returns {boolean}
 */
export function isConfirmationRequired({ originalPolicy, payload, preview }) {
	if (!preview || typeof preview.required !== 'number' || preview.required <= 0) {
		return false;
	}
	return isStrictCriticalChange(originalPolicy, payload);
}

/**
 * Verifica si los requisitos de confirmación explícita han sido satisfechos por el usuario.
 * @param {{
 * 	isCritical: boolean,
 * 	minSupportedVersion: string | null | undefined,
 * 	confirmedCheckbox: boolean,
 * 	typedVersion: string
 * }} params
 * @returns {boolean}
 */
export function isSaveConfirmed({
	isCritical,
	minSupportedVersion,
	confirmedCheckbox,
	typedVersion
}) {
	if (!isCritical) {
		return true;
	}

	if (!confirmedCheckbox) {
		return false;
	}

	const min = (minSupportedVersion || '').trim();
	if (min) {
		return (typedVersion || '').trim() === min;
	}

	return true;
}

let devMockActiveOverride = false;

export const AppVersionsService = {
	/**
	 * Indica si el modo mock está activo.
	 * Solo puede ser `true` en entorno de desarrollo (`import.meta.env.DEV`).
	 * En producción siempre es `false`.
	 * @returns {boolean}
	 */
	isDevMockActive() {
		if (!import.meta.env.DEV) return false;
		if (devMockActiveOverride) return true;
		if (typeof window !== 'undefined') {
			const param = new URLSearchParams(window.location.search).get('mock');
			return param === '1' || param === 'true';
		}
		return false;
	},

	/**
	 * Permite activar/desactivar mock programáticamente en desarrollo y tests.
	 * @param {boolean} active
	 */
	setDevMock(active) {
		if (import.meta.env.DEV) {
			devMockActiveOverride = active;
		}
	},

	/**
	 * Obtiene la lista de políticas de versión (todas las plataformas).
	 * @returns {Promise<ClientVersionPolicy[]>}
	 */
	async getAll() {
		if (this.isDevMockActive()) {
			return Object.values(MOCK_POLICIES);
		}
		return /** @type {Promise<ClientVersionPolicy[]>} */ (internalApi('/client-version-policy'));
	},

	/**
	 * Actualiza la política para una plataforma específica.
	 * @param {Platform} platform
	 * @param {Partial<PolicyPayload>} body
	 * @returns {Promise<ClientVersionPolicy>}
	 */
	async update(platform, body) {
		const payload = normalizePolicyPayload(body);
		if (this.isDevMockActive()) {
			return simulateUpdate(platform, payload);
		}
		return /** @type {Promise<ClientVersionPolicy>} */ (
			internalApi(`/client-version-policy/${platform}`, {
				method: 'PUT',
				body: JSON.stringify(payload)
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
		if (this.isDevMockActive()) {
			return MOCK_INSTALLS[platform];
		}
		return /** @type {Promise<VersionInstallsResponse>} */ (
			internalApi(`/client-version-policy/${platform}/installs?days=${days}`)
		);
	},

	/**
	 * Simula el impacto de una política sin guardarla.
	 * @param {Platform} platform
	 * @param {Partial<PolicyPayload>} body
	 * @param {number} [days=30]
	 * @returns {Promise<PreviewResponse>}
	 */
	async preview(platform, body, days = 30) {
		const payload = normalizePolicyPayload(body);
		if (this.isDevMockActive()) {
			return simulatePreview(platform, payload, days);
		}
		return /** @type {Promise<PreviewResponse>} */ (
			internalApi(`/client-version-policy/${platform}/preview?days=${days}`, {
				method: 'POST',
				body: JSON.stringify(payload)
			})
		);
	}
};
