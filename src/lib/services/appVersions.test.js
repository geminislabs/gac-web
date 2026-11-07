import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppVersionsService, validatePolicyClient } from './appVersions.js';

const internalApiMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/services/api', () => ({
	internalApi: (...args) => internalApiMock(...args)
}));

describe('AppVersionsService', () => {
	beforeEach(() => {
		internalApiMock.mockReset();
	});

	it('getAll calls GET /client-version-policy', async () => {
		const mockData = [
			{ platform: 'android', latest_version: '1.2.0' },
			{ platform: 'ios', latest_version: '1.3.0' }
		];
		internalApiMock.mockResolvedValueOnce(mockData);

		const result = await AppVersionsService.getAll();
		expect(internalApiMock).toHaveBeenCalledWith('/client-version-policy');
		expect(result).toEqual(mockData);
	});

	it('update calls PUT /client-version-policy/{platform} with body', async () => {
		const body = {
			min_supported_version: '1.2.0',
			latest_version: '1.3.0',
			blocked_versions: ['1.2.1'],
			store_url: 'https://apps.apple.com/app/id123456789'
		};
		internalApiMock.mockResolvedValueOnce({ platform: 'ios', ...body });

		const result = await AppVersionsService.update('ios', body);
		expect(internalApiMock).toHaveBeenCalledWith('/client-version-policy/ios', {
			method: 'PUT',
			body: JSON.stringify(body)
		});
		expect(result.platform).toBe('ios');
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

	it('getInstalls supports custom days parameter', async () => {
		internalApiMock.mockResolvedValueOnce({ platform: 'ios', days: 60, total: 10, versions: [] });
		await AppVersionsService.getInstalls('ios', 60);
		expect(internalApiMock).toHaveBeenCalledWith('/client-version-policy/ios/installs?days=60');
	});

	it('preview calls POST /client-version-policy/{platform}/preview?days=30', async () => {
		const body = {
			min_supported_version: '1.1.0',
			latest_version: '1.2.0',
			blocked_versions: [],
			store_url: 'https://play.google.com/store/apps/details?id=com.geminislabs.nexus'
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
			body: JSON.stringify(body)
		});
		expect(result).toEqual(mockPreview);
	});

	it('preview supports custom days parameter', async () => {
		const body = {
			min_supported_version: null,
			latest_version: null,
			blocked_versions: [],
			store_url: ''
		};
		internalApiMock.mockResolvedValueOnce({
			platform: 'ios',
			days: 90,
			total: 0,
			required: 0,
			optional: 0,
			versions: []
		});
		await AppVersionsService.preview('ios', body, 90);
		expect(internalApiMock).toHaveBeenCalledWith('/client-version-policy/ios/preview?days=90', {
			method: 'POST',
			body: JSON.stringify(body)
		});
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

	it('returns no errors for valid android policy with null versions', () => {
		const errors = validatePolicyClient('android', {
			min_supported_version: null,
			latest_version: null,
			blocked_versions: [],
			store_url: 'https://play.google.com/store/apps/details?id=com.geminislabs.nexus'
		});
		expect(errors).toEqual({});
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

	it('requires store_url if min_supported_version is set', () => {
		const errors = validatePolicyClient('ios', {
			min_supported_version: '1.0.0',
			latest_version: '1.0.0',
			blocked_versions: [],
			store_url: ''
		});
		expect(errors.store_url).toContain('sin URL de la tienda');
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
