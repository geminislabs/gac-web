import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	AppVersionsService,
	validatePolicyClient,
	normalizePolicyPayload,
	isStrictCriticalChange,
	isConfirmationRequired,
	isSaveConfirmed
} from './appVersions.js';

const internalApiMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/services/api', () => ({
	internalApi: (...args) => internalApiMock(...args)
}));

describe('AppVersionsService', () => {
	beforeEach(() => {
		internalApiMock.mockReset();
		AppVersionsService.setDevMock(false);
	});

	it('getAll calls GET /client-version-policy', async () => {
		const mockData = [
			{ platform: 'android', latest_version: '1.2.0', store_url: null },
			{ platform: 'ios', latest_version: '1.3.0', store_url: null }
		];
		internalApiMock.mockResolvedValueOnce(mockData);

		const result = await AppVersionsService.getAll();
		expect(internalApiMock).toHaveBeenCalledWith('/client-version-policy');
		expect(result).toEqual(mockData);
	});

	it('getAll propagates backend error so caller can display retry UI', async () => {
		internalApiMock.mockRejectedValueOnce(new Error('Servicio no disponible'));
		await expect(AppVersionsService.getAll()).rejects.toThrow('Servicio no disponible');
	});

	it('update normalizes empty store_url to null and calls PUT /client-version-policy/{platform}', async () => {
		const body = {
			min_supported_version: '1.2.0',
			latest_version: '1.3.0',
			blocked_versions: ['1.2.1'],
			store_url: '' // vacío debe convertirse en null
		};
		const expectedPayload = {
			min_supported_version: '1.2.0',
			latest_version: '1.3.0',
			blocked_versions: ['1.2.1'],
			store_url: null
		};
		internalApiMock.mockResolvedValueOnce({ platform: 'ios', ...expectedPayload });

		const result = await AppVersionsService.update('ios', body);
		expect(internalApiMock).toHaveBeenCalledWith('/client-version-policy/ios', {
			method: 'PUT',
			body: JSON.stringify(expectedPayload)
		});
		expect(result.store_url).toBeNull();
	});

	it('getInstalls calls GET /client-version-policy/{platform}/installs with days default 30', async () => {
		const mockInstalls = {
			platform: 'android',
			days: 30,
			total: 500,
			versions: [{ app_version: '1.2.0', installs: 500 }]
		};
		internalApiMock.mockResolvedValueOnce(mockInstalls);

		const result = await AppVersionsService.getInstalls('android');
		expect(internalApiMock).toHaveBeenCalledWith('/client-version-policy/android/installs?days=30');
		expect(result).toEqual(mockInstalls);
	});

	it('getInstalls propagates error on failure without returning fake data', async () => {
		internalApiMock.mockRejectedValueOnce(new Error('Error de conexión con installs'));
		await expect(AppVersionsService.getInstalls('android')).rejects.toThrow(
			'Error de conexión con installs'
		);
	});

	it('preview calls POST /client-version-policy/{platform}/preview?days=30 with normalized payload', async () => {
		const body = {
			min_supported_version: '1.1.0',
			latest_version: '1.2.0',
			blocked_versions: [],
			store_url: '   '
		};
		const expectedPayload = {
			min_supported_version: '1.1.0',
			latest_version: '1.2.0',
			blocked_versions: [],
			store_url: null
		};
		const mockPreview = {
			platform: 'android',
			days: 30,
			total: 412,
			required: 100,
			optional: 300,
			versions: []
		};
		internalApiMock.mockResolvedValueOnce(mockPreview);

		const result = await AppVersionsService.preview('android', body);
		expect(internalApiMock).toHaveBeenCalledWith('/client-version-policy/android/preview?days=30', {
			method: 'POST',
			body: JSON.stringify(expectedPayload)
		});
		expect(result).toEqual(mockPreview);
	});

	it('preview propagates 422 or network errors preventing unauthorized saves', async () => {
		const error = new Error('store_url debe ser de apps.apple.com');
		// @ts-ignore
		error.field = 'store_url';
		// @ts-ignore
		error.status = 422;
		internalApiMock.mockRejectedValueOnce(error);

		await expect(
			AppVersionsService.preview('ios', {
				min_supported_version: '1.0.0',
				latest_version: '1.0.0',
				blocked_versions: [],
				store_url: 'https://otro.com'
			})
		).rejects.toThrow('store_url debe ser de apps.apple.com');
	});

	it('supports dev mock mode when explicitly enabled', async () => {
		AppVersionsService.setDevMock(true);
		expect(AppVersionsService.isDevMockActive()).toBe(true);

		const policies = await AppVersionsService.getAll();
		expect(Array.isArray(policies)).toBe(true);
		expect(policies.length).toBeGreaterThan(0);

		const installs = await AppVersionsService.getInstalls('ios');
		expect(installs.platform).toBe('ios');
		expect(installs.total).toBe(412);

		const preview = await AppVersionsService.preview('ios', {
			min_supported_version: '1.1.0',
			latest_version: '1.3.0',
			blocked_versions: [],
			store_url: 'https://apps.apple.com/app/id123'
		});
		expect(preview.platform).toBe('ios');
		expect(preview.required).toBe(100);

		const updated = await AppVersionsService.update('ios', {
			min_supported_version: '1.1.0',
			latest_version: '1.3.0',
			blocked_versions: [],
			store_url: 'https://apps.apple.com/app/id123'
		});
		expect(updated.min_supported_version).toBe('1.1.0');
	});
});

describe('normalizePolicyPayload', () => {
	it('converts empty strings to null for version fields and store_url', () => {
		const result = normalizePolicyPayload({
			min_supported_version: '   ',
			latest_version: '',
			blocked_versions: [' 1.0.1 ', ''],
			store_url: '   '
		});

		expect(result).toEqual({
			min_supported_version: null,
			latest_version: null,
			blocked_versions: ['1.0.1'],
			store_url: null
		});
	});

	it('preserves valid values and trims strings', () => {
		const result = normalizePolicyPayload({
			min_supported_version: ' 1.0.0 ',
			latest_version: ' 1.2.0 ',
			blocked_versions: [' 1.0.1 '],
			store_url: ' https://apps.apple.com/app/id123 '
		});

		expect(result).toEqual({
			min_supported_version: '1.0.0',
			latest_version: '1.2.0',
			blocked_versions: ['1.0.1'],
			store_url: 'https://apps.apple.com/app/id123'
		});
	});
});

describe('isStrictCriticalChange', () => {
	const basePolicy = {
		platform: /** @type {const} */ ('ios'),
		min_supported_version: '1.0.0',
		latest_version: '1.3.0',
		blocked_versions: ['1.0.1'],
		store_url: 'https://apps.apple.com/app/id123'
	};

	it('returns true when originalPolicy is null or undefined (sin fila original)', () => {
		expect(isStrictCriticalChange(null, { min_supported_version: '1.0.0' })).toBe(true);
		expect(isStrictCriticalChange(undefined, { min_supported_version: null })).toBe(true);
	});

	it('returns true when min_supported_version is set for the first time', () => {
		const policyWithoutMin = { ...basePolicy, min_supported_version: null };
		expect(isStrictCriticalChange(policyWithoutMin, { min_supported_version: '1.0.0' })).toBe(true);
	});

	it('returns true when min_supported_version increases or changes', () => {
		expect(isStrictCriticalChange(basePolicy, { min_supported_version: '1.1.0' })).toBe(true);
	});

	it('returns false when min_supported_version and blocked_versions remain unchanged', () => {
		expect(
			isStrictCriticalChange(basePolicy, {
				min_supported_version: '1.0.0',
				blocked_versions: ['1.0.1']
			})
		).toBe(false);
	});

	it('returns true when a new blocked version is added', () => {
		expect(
			isStrictCriticalChange(basePolicy, {
				min_supported_version: '1.0.0',
				blocked_versions: ['1.0.1', '1.0.2']
			})
		).toBe(true);
	});

	it('returns false when blocked versions are removed without adding new ones', () => {
		expect(
			isStrictCriticalChange(basePolicy, {
				min_supported_version: '1.0.0',
				blocked_versions: []
			})
		).toBe(false);
	});
});

describe('isConfirmationRequired', () => {
	const basePolicy = {
		platform: /** @type {const} */ ('ios'),
		min_supported_version: '1.0.0',
		latest_version: '1.3.0',
		blocked_versions: ['1.0.1'],
		store_url: 'https://apps.apple.com/app/id123'
	};

	it('returns false when required = 0 (no installations blocked)', () => {
		const preview = {
			platform: /** @type {const} */ ('ios'),
			days: 30,
			total: 400,
			required: 0,
			optional: 300,
			versions: []
		};
		// Aunque cambie el mínimo, si required es 0 no pide nada
		expect(
			isConfirmationRequired({
				originalPolicy: basePolicy,
				payload: { min_supported_version: '1.2.0' },
				preview
			})
		).toBe(false);
	});

	it('returns true when required > 0 and min_supported_version increases', () => {
		const preview = {
			platform: /** @type {const} */ ('ios'),
			days: 30,
			total: 400,
			required: 50,
			optional: 300,
			versions: []
		};
		expect(
			isConfirmationRequired({
				originalPolicy: basePolicy,
				payload: { min_supported_version: '1.1.0' },
				preview
			})
		).toBe(true);
	});

	it('returns true when required > 0 and a new blocked version is added', () => {
		const preview = {
			platform: /** @type {const} */ ('ios'),
			days: 30,
			total: 400,
			required: 15,
			optional: 300,
			versions: []
		};
		expect(
			isConfirmationRequired({
				originalPolicy: basePolicy,
				payload: { min_supported_version: '1.0.0', blocked_versions: ['1.0.1', '1.0.3'] },
				preview
			})
		).toBe(true);
	});

	it('returns true when required > 0 and originalPolicy is missing', () => {
		const preview = {
			platform: /** @type {const} */ ('ios'),
			days: 30,
			total: 100,
			required: 10,
			optional: 50,
			versions: []
		};
		expect(
			isConfirmationRequired({
				originalPolicy: null,
				payload: { min_supported_version: '1.0.0' },
				preview
			})
		).toBe(true);
	});
});

describe('isSaveConfirmed', () => {
	it('returns true immediately when not critical', () => {
		expect(
			isSaveConfirmed({
				isCritical: false,
				minSupportedVersion: '1.2.0',
				confirmedCheckbox: false,
				typedVersion: ''
			})
		).toBe(true);
	});

	it('requires checkbox AND typed version matching minSupportedVersion when min is present', () => {
		// Falta checkbox
		expect(
			isSaveConfirmed({
				isCritical: true,
				minSupportedVersion: '1.2.0',
				confirmedCheckbox: false,
				typedVersion: '1.2.0'
			})
		).toBe(false);

		// Checkbox marcado pero versión incorrecta
		expect(
			isSaveConfirmed({
				isCritical: true,
				minSupportedVersion: '1.2.0',
				confirmedCheckbox: true,
				typedVersion: '1.1.0'
			})
		).toBe(false);

		// Checkbox marcado y versión coincide
		expect(
			isSaveConfirmed({
				isCritical: true,
				minSupportedVersion: '1.2.0',
				confirmedCheckbox: true,
				typedVersion: ' 1.2.0 '
			})
		).toBe(true);
	});

	it('requires only checkbox when critical due to blocked_versions without minSupportedVersion', () => {
		expect(
			isSaveConfirmed({
				isCritical: true,
				minSupportedVersion: null,
				confirmedCheckbox: false,
				typedVersion: ''
			})
		).toBe(false);

		expect(
			isSaveConfirmed({
				isCritical: true,
				minSupportedVersion: null,
				confirmedCheckbox: true,
				typedVersion: ''
			})
		).toBe(true);
	});
});

describe('validatePolicyClient', () => {
	it('returns no errors for valid ios policy', () => {
		const errors = validatePolicyClient('ios', {
			min_supported_version: '1.0.0',
			latest_version: '1.3.0',
			blocked_versions: ['1.1.0'],
			store_url: 'https://apps.apple.com/app/id123456789'
		});
		expect(errors).toEqual({});
	});

	it('allows empty store_url when min_supported_version is null', () => {
		const errors = validatePolicyClient('android', {
			min_supported_version: null,
			latest_version: '1.2.0',
			blocked_versions: [],
			store_url: ''
		});
		expect(errors).toEqual({});
	});

	it('requires store_url if min_supported_version is set', () => {
		const errors = validatePolicyClient('ios', {
			min_supported_version: '1.0.0',
			latest_version: '1.0.0',
			blocked_versions: [],
			store_url: ''
		});
		expect(errors.store_url).toContain('sin URL de la tienda');
	});

	it('validates version format for min and latest', () => {
		const errors = validatePolicyClient('android', {
			min_supported_version: 'abc',
			latest_version: '1.0.beta',
			blocked_versions: [],
			store_url: 'https://play.google.com/store/apps/details?id=com.geminislabs.nexus'
		});
		expect(errors.min_supported_version).toBeDefined();
		expect(errors.latest_version).toBeDefined();
	});

	it('validates store_url domain for ios and android', () => {
		const iosErrors = validatePolicyClient('ios', {
			min_supported_version: null,
			latest_version: null,
			blocked_versions: [],
			store_url: 'https://play.google.com/store/apps/details?id=test'
		});
		expect(iosErrors.store_url).toContain('apps.apple.com');

		const androidErrors = validatePolicyClient('android', {
			min_supported_version: null,
			latest_version: null,
			blocked_versions: [],
			store_url: 'https://apps.apple.com/app/id123'
		});
		expect(androidErrors.store_url).toContain('play.google.com');

		const nonHttps = validatePolicyClient('ios', {
			min_supported_version: null,
			latest_version: null,
			blocked_versions: [],
			store_url: 'http://apps.apple.com/app/id123'
		});
		expect(nonHttps.store_url).toContain('HTTPS');
	});

	it('validates blocked_versions duplicates and formats', () => {
		const dupErrors = validatePolicyClient('ios', {
			min_supported_version: null,
			latest_version: null,
			blocked_versions: ['1.0.0', '1.0.0'],
			store_url: 'https://apps.apple.com/app/id123'
		});
		expect(dupErrors.blocked_versions).toContain('duplicada');

		const formatErrors = validatePolicyClient('ios', {
			min_supported_version: null,
			latest_version: null,
			blocked_versions: ['invalid-version'],
			store_url: 'https://apps.apple.com/app/id123'
		});
		expect(formatErrors.blocked_versions).toContain('inválida');
	});
});
