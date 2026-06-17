import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writable, get } from 'svelte/store';

const env = vi.hoisted(() => ({ dev: true }));

vi.mock('$app/environment', () => env);

vi.mock('$env/static/public', () => ({
	PUBLIC_GAC_API_URL: 'https://gac.example.com',
	PUBLIC_SISCOM_ADMIN_API_URL: 'https://admin.example.com',
	PUBLIC_SISCOM_API_URL: 'https://public.example.com'
}));

describe('api service', () => {
	/** @type {import('svelte/store').Writable<any>} */
	let authStore;
	/** @type {typeof import('./api.js').api} */
	let api;
	/** @type {typeof import('./api.js').internalApi} */
	let internalApi;
	/** @type {typeof import('./api.js').getInternalToken} */
	let getInternalToken;

	beforeEach(async () => {
		env.dev = true;
		vi.resetModules();
		vi.stubGlobal('fetch', vi.fn());
		authStore = writable({
			token: 'access-token',
			refreshToken: 'refresh-token',
			user: { id: '1' },
			isAuthenticated: true
		});
		const mod = await import('./api.js');
		api = mod.api;
		internalApi = mod.internalApi;
		getInternalToken = mod.getInternalToken;
		mod.initApi(authStore);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it('throws when initApi was not called', async () => {
		vi.resetModules();
		const mod = await import('./api.js');
		await expect(mod.api('/health')).rejects.toThrow('not initialized');
	});

	it('uses dev proxy URL with bearer token', async () => {
		fetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => ({ ok: true })
		});

		const data = await api('/auth/me');
		expect(data).toEqual({ ok: true });
		expect(fetch).toHaveBeenCalledWith(
			'/api/gac/auth/me',
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer access-token'
				})
			})
		);
	});

	it('normalizes trailing slashes', async () => {
		fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
		await api('/users/');
		expect(fetch).toHaveBeenCalledWith('/api/gac/users', expect.any(Object));
	});

	it('returns null for 204 responses', async () => {
		fetch.mockResolvedValueOnce({ ok: true, status: 204 });
		await expect(api('/resource')).resolves.toBeNull();
	});

	it('throws formatted API errors', async () => {
		fetch.mockResolvedValueOnce({
			ok: false,
			status: 400,
			statusText: 'Bad Request',
			json: async () => ({ detail: 'invalid' })
		});
		await expect(api('/bad')).rejects.toThrow('invalid');
	});

	it('omits Content-Type for FormData bodies', async () => {
		fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
		const formData = new FormData();
		formData.append('username', 'a@b.com');
		await api('/auth/login', { method: 'POST', body: formData });
		const [, config] = fetch.mock.calls[0];
		expect(config.headers['Content-Type']).toBeUndefined();
	});

	it('retries after successful token refresh on 401', async () => {
		fetch
			.mockResolvedValueOnce({
				ok: false,
				status: 401,
				statusText: 'Unauthorized',
				json: async () => ({})
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({
					data: { access_token: 'new-token', refresh_token: 'new-refresh' }
				})
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ data: 'success' })
			});

		const data = await api('/protected');
		expect(data).toEqual({ data: 'success' });
		expect(get(authStore).token).toBe('new-token');
		expect(fetch).toHaveBeenCalledTimes(3);
	});

	it('throws when refresh fails after 401', async () => {
		fetch
			.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
			.mockResolvedValueOnce({
				ok: false,
				status: 401,
				statusText: 'Unauthorized',
				json: async () => ({ detail: 'invalid refresh' })
			});

		await expect(api('/protected')).rejects.toThrow('Sesión expirada');
		expect(get(authStore).isAuthenticated).toBe(false);
	});

	it('internalApi uses admin proxy in dev', async () => {
		fetch
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ data: 'paseto-token' })
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ organizations: [] })
			});

		const result = await internalApi('/internal/organizations');
		expect(result).toEqual({ organizations: [] });
		expect(fetch.mock.calls[1][0]).toBe('/api/admin/internal/organizations');
	});

	it('internalApi uses public proxy when service is public', async () => {
		fetch
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ data: 'paseto-token' })
			})
			.mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] });

		await internalApi('/devices/1/communications/latest', { service: 'public' });
		expect(fetch.mock.calls[1][0]).toBe('/api/public/devices/1/communications/latest');
	});

	it('internalApi throws when internal auth fails', async () => {
		fetch.mockResolvedValueOnce({
			ok: false,
			status: 403,
			statusText: 'Forbidden',
			json: async () => ({})
		});
		await expect(internalApi('/internal/orgs')).rejects.toThrow('No se pudo autenticar');
	});

	it('getInternalToken caches tokens within TTL', async () => {
		fetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => ({ data: 'paseto-token' })
		});

		const first = await getInternalToken('nexus');
		const second = await getInternalToken('nexus');
		expect(first).toBe('paseto-token');
		expect(second).toBe('paseto-token');
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('getInternalToken requires an active session', async () => {
		authStore.set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
		await expect(getInternalToken()).rejects.toThrow('No hay sesión activa');
	});

	it('getInternalToken rejects invalid auth responses', async () => {
		fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
		await expect(getInternalToken()).rejects.toThrow('missing data');
	});

	it('internalApi returns null for 204 responses', async () => {
		fetch
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ data: 'paseto-token' })
			})
			.mockResolvedValueOnce({ ok: true, status: 204 });

		await expect(internalApi('/internal/resource', { method: 'DELETE' })).resolves.toBeNull();
	});

	it('uses production GAC URL when not in dev', async () => {
		env.dev = false;
		vi.resetModules();
		vi.stubGlobal('fetch', vi.fn());
		authStore = writable({
			token: 'access-token',
			refreshToken: null,
			user: null,
			isAuthenticated: true
		});
		const mod = await import('./api.js');
		mod.initApi(authStore);
		fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
		await mod.api('health');
		expect(fetch).toHaveBeenCalledWith('https://gac.example.com/api/v1/health', expect.any(Object));
	});
});
