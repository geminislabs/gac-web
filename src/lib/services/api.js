import { get } from 'svelte/store';
import { dev } from '$app/environment';
import { PUBLIC_GAC_API_URL, PUBLIC_SISCOM_ADMIN_API_URL } from '$env/static/public';
import { formatApiErrorMessage } from '$lib/utils/apiErrors';

/** @type {import('svelte/store').Writable<any>|null} */
let authStore = null;

/**
 * Initializes the API service with the auth store.
 * This helps break circular dependencies.
 * @param {import('svelte/store').Writable<any>} store
 */
export function initApi(store) {
	authStore = store;
}

/** @type {Promise<boolean>|null} */
let refreshPromise = null;

/**
 * Enhanced fetch wrapper with automatic token refresh
 * @param {string} endpoint
 * @param {RequestInit & { _skipRefresh?: boolean }} [options]
 * @returns {Promise<any>}
 */
export async function api(endpoint, options = {}) {
	if (!authStore) {
		throw new Error('API Service not initialized. Call initApi(auth) first.');
	}

	const skipRefresh = options._skipRefresh || false;
	const $auth = get(authStore);

	/** @type {any} */
	const headers = {
		'Content-Type': 'application/json',
		...options.headers
	};

	if (options.body instanceof FormData) {
		delete headers['Content-Type'];
	}

	if ($auth.token) {
		headers['Authorization'] = `Bearer ${$auth.token}`;
	}

	const config = {
		...options,
		headers
	};

	const safeEndpoint = endpoint.replace(/\/$/, '');
	const path = safeEndpoint.startsWith('/') ? safeEndpoint : `/${safeEndpoint}`;

	// In development: use Vite proxy (/api/gac)
	// In production: use environment variable (PUBLIC_GAC_API_URL)
	const url = dev ? `/api/gac${path}` : `${PUBLIC_GAC_API_URL}/api/v1${path}`;

	try {
		const response = await fetch(url, config);

		if (response.status === 401 && $auth.refreshToken && !skipRefresh) {
			if (!refreshPromise) {
				refreshPromise = performRefresh();
			}

			const isRefreshed = await refreshPromise;

			if (isRefreshed) {
				const refreshedAuth = get(authStore);
				return api(endpoint, {
					...options,
					headers: {
						...headers,
						Authorization: `Bearer ${refreshedAuth.token}`
					},
					_skipRefresh: true
				});
			} else {
				throw new Error('Sesión expirada');
			}
		}

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			const error = new Error(
				formatApiErrorMessage(errorData, `API Error: ${response.status} ${response.statusText}`)
			);
			error.status = response.status;
			error.field = errorData?.field;
			error.data = errorData;
			throw error;
		}

		if (response.status === 204) return null;
		return await response.json();
	} catch (error) {
		if (!skipRefresh) {
			console.error(`API Request Failed: ${endpoint}`, error);
		}
		throw error;
	}
}

/**
 * Enhanced fetch wrapper for internal APIs requiring PASETO tokens
 *
 * Sólo el plano de control (admin-api). El plano de datos va por
 * `dataPlaneApi`, con un data token: el PASETO interno no tiene por qué
 * llegar a siscom-api.
 * @param {string} endpoint
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
export async function internalApi(endpoint, options = {}) {
	let token;
	try {
		token = await getInternalToken('nexus');
	} catch (err) {
		console.error('Failed to satisfy internal authentication:', err);
		throw new Error('No se pudo autenticar con el servicio interno', { cause: err });
	}

	/** @type {any} */
	const headers = {
		Authorization: `Bearer ${token}`,
		...options.headers
	};

	if (!(options.body instanceof FormData) && !headers['Content-Type']) {
		headers['Content-Type'] = 'application/json';
	}

	const config = {
		...options,
		headers
	};

	const safeEndpoint = endpoint.replace(/\/$/, '');
	const path = safeEndpoint.startsWith('/') ? safeEndpoint : `/${safeEndpoint}`;

	const url = dev ? `/api/admin${path}` : `${PUBLIC_SISCOM_ADMIN_API_URL}/api/v1${path}`;

	try {
		const response = await fetch(url, config);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			const error = new Error(
				formatApiErrorMessage(
					errorData,
					`Internal API Error: ${response.status} ${response.statusText}`
				)
			);
			error.status = response.status;
			error.field = errorData?.field;
			error.data = errorData;
			throw error;
		}

		if (response.status === 204) return null;
		return await response.json();
	} catch (error) {
		console.error(`Internal API Request Failed: ${endpoint}`, error);
		throw error;
	}
}

/**
 * Internal function to handle the refresh process and prevent race conditions
 * @returns {Promise<boolean>}
 */
async function performRefresh() {
	if (!authStore) return false;
	const currentAuth = get(authStore);
	if (!currentAuth.refreshToken) return false;

	try {
		const response = await api('auth/refresh', {
			method: 'POST',
			body: JSON.stringify({ refresh_token: currentAuth.refreshToken }),
			_skipRefresh: true
		});

		const newAccess = response?.data?.access_token;
		const newRefresh = response?.data?.refresh_token;

		if (newAccess) {
			authStore.update((s) => ({
				...s,
				token: newAccess,
				refreshToken: newRefresh ?? s.refreshToken
			}));
			return true;
		}
	} catch (error) {
		console.error('Session refresh failed:', error);
		authStore.set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
	} finally {
		refreshPromise = null;
	}
	return false;
}

/**
 * El plano de datos (siscom-api) con un data token (`$lib/services/dataToken`).
 *
 * Siempre same-origin: en dev lo cubre el proxy de Vite; en producción,
 * `src/routes/api/public`. Pegarle al PUBLIC_SISCOM_API_URL desde el navegador
 * lo bloquea CORS — ese origen no está en ALLOWED_ORIGINS.
 * @param {string} endpoint
 * @param {string} dataToken
 * @returns {Promise<any>}
 */
export async function dataPlaneApi(endpoint, dataToken) {
	const safeEndpoint = endpoint.replace(/\/$/, '');
	const path = safeEndpoint.startsWith('/') ? safeEndpoint : `/${safeEndpoint}`;

	const response = await fetch(`/api/public${path}`, {
		headers: { Accept: 'application/json', Authorization: `Bearer ${dataToken}` }
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		const error = new Error(
			formatApiErrorMessage(errorData, `Data API Error: ${response.status} ${response.statusText}`)
		);
		error.status = response.status;
		throw error;
	}

	if (response.status === 204) return null;
	return response.json();
}

// Cache for internal tokens: serviceKey -> { token, expiration }
const internalTokenCache = new Map();

/**
 * Retrieves a valid internal token (PASETO) for a specific service/role context.
 * @param {string} [serviceContext='nexus']
 * @returns {Promise<string>}
 */
export async function getInternalToken(serviceContext = 'nexus') {
	const now = Date.now();
	const cacheKey = serviceContext;
	const cached = internalTokenCache.get(cacheKey);

	if (cached && now < cached.expiration - 30 * 1000) {
		return cached.token;
	}

	try {
		if (!authStore) throw new Error('API Service not initialized');
		const $auth = get(authStore);

		if (!$auth.token) {
			throw new Error('No es posible obtener el token interno: No hay sesión activa.');
		}

		// In development: use Vite proxy (/api/gac)
		// In production: use environment variable (PUBLIC_GAC_API_URL)
		const url = dev
			? `/api/gac/internal/tokens/app`
			: `${PUBLIC_GAC_API_URL}/api/v1/internal/tokens/app`;

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${$auth.token}`
			}
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(formatApiErrorMessage(errorData, `Auth API Error: ${response.statusText}`));
		}

		const json = await response.json();

		if (json && json.data) {
			const token = json.data;
			const expiresAt = now + 5 * 60 * 1000;

			internalTokenCache.set(cacheKey, {
				token,
				expiration: expiresAt
			});

			return token;
		} else {
			throw new Error(`Invalid response from internal auth endpoint: missing data`);
		}
	} catch (error) {
		console.error(`Failed to get internal token for ${serviceContext}:`, error);
		throw error;
	}
}
