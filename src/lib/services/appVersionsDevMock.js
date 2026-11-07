/**
 * Mock data y simulación de endpoints §3.2 para desarrollo y pruebas e2e.
 * Solo activo en entorno de desarrollo (import.meta.env.DEV).
 */

/** @type {Record<'ios' | 'android', import('./appVersions.js').ClientVersionPolicy>} */
export const MOCK_POLICIES = {
	ios: {
		platform: 'ios',
		min_supported_version: '1.0.0',
		latest_version: '1.3.0',
		blocked_versions: [],
		store_url: 'https://apps.apple.com/app/id123456789',
		updated_at: '2026-11-05T14:20:00Z',
		updated_by: 'migracion 047'
	},
	android: {
		platform: 'android',
		min_supported_version: null,
		latest_version: '1.2.0',
		blocked_versions: ['1.1.3'],
		store_url: 'https://play.google.com/store/apps/details?id=com.geminislabs.nexus',
		updated_at: '2026-11-07T02:16:30Z',
		updated_by: 'gac:5b1f8c12-3456-4789-a012-3456789abcde'
	}
};

/** @type {Record<'ios' | 'android', import('./appVersions.js').VersionInstallsResponse>} */
export const MOCK_INSTALLS = {
	ios: {
		platform: 'ios',
		days: 30,
		total: 412,
		versions: [
			{ app_version: '1.1.0', installs: 300 },
			{ app_version: '1.0.1', installs: 100 },
			{ app_version: 'desconocida', installs: 12 }
		]
	},
	android: {
		platform: 'android',
		days: 30,
		total: 520,
		versions: [
			{ app_version: '1.2.0', installs: 350 },
			{ app_version: '1.1.3', installs: 20 },
			{ app_version: '1.1.0', installs: 130 },
			{ app_version: 'desconocida', installs: 20 }
		]
	}
};

/**
 * Simula la respuesta de POST /client-version-policy/{platform}/preview
 * @param {'ios' | 'android'} platform
 * @param {import('./appVersions.js').PolicyPayload} payload
 * @param {number} [days=30]
 * @returns {import('./appVersions.js').PreviewResponse}
 */
export function simulatePreview(platform, payload, days = 30) {
	const installs = MOCK_INSTALLS[platform];
	const total = installs.total || 412;
	let required = 0;
	let optional = 0;

	/** @type {import('./appVersions.js').PreviewVersionItem[]} */
	const versions = (installs.versions || []).map((v) => {
		let updateStatus = /** @type {'required' | 'optional' | 'none'} */ ('none');
		if (payload.blocked_versions.includes(v.app_version)) {
			updateStatus = 'required';
			required += v.installs;
		} else if (payload.min_supported_version && v.app_version === '1.0.1') {
			updateStatus = 'required';
			required += v.installs;
		} else if (payload.latest_version && v.app_version === '1.1.0') {
			updateStatus = 'optional';
			optional += v.installs;
		}
		return {
			app_version: v.app_version,
			installs: v.installs,
			update: updateStatus
		};
	});

	return {
		platform,
		days,
		total,
		required,
		optional,
		versions
	};
}

/**
 * Simula la respuesta de PUT /client-version-policy/{platform}
 * @param {'ios' | 'android'} platform
 * @param {import('./appVersions.js').PolicyPayload} payload
 * @returns {import('./appVersions.js').ClientVersionPolicy}
 */
export function simulateUpdate(platform, payload) {
	const updated = {
		platform,
		min_supported_version: payload.min_supported_version,
		latest_version: payload.latest_version,
		blocked_versions: [...payload.blocked_versions],
		store_url: payload.store_url,
		updated_at: new Date().toISOString(),
		updated_by: 'gac:5b1f8c12-3456-4789-a012-3456789abcde'
	};
	MOCK_POLICIES[platform] = updated;
	return updated;
}
