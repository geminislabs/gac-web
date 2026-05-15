import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { api } from '$lib/services/api';

const STORE_KEY = 'gac_auth';

/**
 * @typedef {Object} AuthState
 * @property {string|null} token
 * @property {string|null} refreshToken
 * @property {Object|null} user
 * @property {boolean} isAuthenticated
 */

/** @type {AuthState} */
const initialState = {
	token: null,
	refreshToken: null,
	user: null,
	isAuthenticated: false
};

// Load from localStorage if available
const storedAuth = browser ? localStorage.getItem(STORE_KEY) : null;
const startState = storedAuth ? JSON.parse(storedAuth) : initialState;

export const auth = writable(startState);

// BREAK CIRCULAR DEPENDENCY: Initialize API with the store
import { initApi } from '$lib/services/api';
initApi(auth);

auth.subscribe((value) => {
	if (browser) {
		localStorage.setItem(STORE_KEY, JSON.stringify(value));
	}
});

/**
 * @param {string} email
 * @param {string} password
 */
export const login = async (email, password) => {
	try {
		// Call the login API
		// Based on api_reference.md: POST /auth/login with username (email) and password
		// User requested FormData

		const formData = new FormData();
		formData.append('username', email);
		formData.append('password', password);

		const response = await api('/auth/login', {
			method: 'POST',
			body: formData
		});

		// Response structure: { data: { access_token, refresh_token, ... } }

		const { data } = response;
		const token = data?.access_token;
		const refreshToken = data?.refresh_token;

		if (!token) {
			throw new Error('Login failed: No access token received');
		}

		// Temporarily set token to fetch user profile
		auth.update((s) => ({ ...s, token }));

		const userProfile = await api('/auth/me', {
			method: 'GET'
		});

		auth.set({
			token,
			refreshToken,
			user: userProfile.data || userProfile,
			isAuthenticated: true
		});

		return true;
	} catch (error) {
		console.error('Login failed:', error);
		throw error;
	}
};

export const refreshSession = async () => {
	const currentAuth = get(auth);
	if (!currentAuth.refreshToken) return false;

	try {
		const response = await api('/auth/refresh', {
			method: 'POST',
			body: JSON.stringify({ refresh_token: currentAuth.refreshToken })
		});

		const newAccess = response?.data?.access_token;
		const newRefresh = response?.data?.refresh_token;

		if (newAccess) {
			auth.update((s) => ({
				...s,
				token: newAccess,
				refreshToken: newRefresh ?? s.refreshToken
			}));
			return true;
		}
	} catch (error) {
		console.error('Session refresh failed:', error);
		logout();
	}
	return false;
};

export const logout = () => {
	auth.set(initialState);
	if (browser) {
		localStorage.removeItem(STORE_KEY);
	}
};
