import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

const apiMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/services/api', () => ({
	api: (...args) => apiMock(...args),
	initApi: vi.fn()
}));

vi.mock('$app/environment', () => ({ browser: true }));

describe('auth store', () => {
	/** @type {typeof import('./auth.js').auth} */
	let auth;
	/** @type {typeof import('./auth.js').login} */
	let login;
	/** @type {typeof import('./auth.js').logout} */
	let logout;
	/** @type {typeof import('./auth.js').refreshSession} */
	let refreshSession;

	beforeEach(async () => {
		vi.resetModules();
		apiMock.mockReset();
		localStorage.getItem.mockReturnValue(null);
		localStorage.setItem.mockClear();
		localStorage.removeItem.mockClear();

		const mod = await import('./auth.js');
		auth = mod.auth;
		login = mod.login;
		logout = mod.logout;
		refreshSession = mod.refreshSession;
		auth.set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
	});

	it('hydrates from localStorage on import', async () => {
		vi.resetModules();
		localStorage.getItem.mockReturnValue(
			JSON.stringify({
				token: 'stored-token',
				refreshToken: 'stored-refresh',
				user: { id: 'u1' },
				isAuthenticated: true
			})
		);
		const mod = await import('./auth.js');
		expect(get(mod.auth)).toMatchObject({
			token: 'stored-token',
			isAuthenticated: true
		});
	});

	it('login stores user profile after token exchange', async () => {
		apiMock
			.mockResolvedValueOnce({
				data: { access_token: 'access-token', refresh_token: 'refresh-token' }
			})
			.mockResolvedValueOnce({ data: { id: 'u1', email: 'a@b.com' } });

		await login('a@b.com', 'secret');

		expect(get(auth)).toMatchObject({
			token: 'access-token',
			refreshToken: 'refresh-token',
			isAuthenticated: true,
			user: { id: 'u1', email: 'a@b.com' }
		});
		expect(localStorage.setItem).toHaveBeenCalled();
	});

	it('login fails when access token is missing', async () => {
		apiMock.mockResolvedValueOnce({ data: {} });
		await expect(login('a@b.com', 'secret')).rejects.toThrow('No access token');
	});

	it('refreshSession updates tokens on success', async () => {
		auth.set({
			token: 'old',
			refreshToken: 'refresh-token',
			user: null,
			isAuthenticated: true
		});
		apiMock.mockResolvedValueOnce({
			data: { access_token: 'new-access', refresh_token: 'new-refresh' }
		});

		const ok = await refreshSession();
		expect(ok).toBe(true);
		expect(get(auth).token).toBe('new-access');
	});

	it('refreshSession logs out on failure', async () => {
		auth.set({
			token: 'old',
			refreshToken: 'refresh-token',
			user: { id: 'u1' },
			isAuthenticated: true
		});
		apiMock.mockRejectedValueOnce(new Error('refresh failed'));

		const ok = await refreshSession();
		expect(ok).toBe(false);
		expect(get(auth).isAuthenticated).toBe(false);
		expect(localStorage.removeItem).toHaveBeenCalledWith('gac_auth');
	});

	it('logout clears auth state and storage', () => {
		auth.set({
			token: 't',
			refreshToken: 'r',
			user: { id: 'u1' },
			isAuthenticated: true
		});

		logout();

		expect(get(auth)).toEqual({
			token: null,
			refreshToken: null,
			user: null,
			isAuthenticated: false
		});
		expect(localStorage.removeItem).toHaveBeenCalledWith('gac_auth');
	});
});
