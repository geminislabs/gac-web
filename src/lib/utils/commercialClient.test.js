import { describe, it, expect } from 'vitest';
import { toCommercialClientId, toNexusAccountId } from './commercialClient.js';

describe('commercialClient', () => {
	const accountId = '550e8400-e29b-41d4-a716-446655440000';

	it('toCommercialClientId returns the same UUID', () => {
		expect(toCommercialClientId(accountId)).toBe(accountId);
	});

	it('toNexusAccountId returns the same UUID', () => {
		expect(toNexusAccountId(accountId)).toBe(accountId);
	});
});
