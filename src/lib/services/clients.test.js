import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientsService } from './clients.js';

const internalApiMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/services/api', () => ({
	internalApi: (...args) => internalApiMock(...args)
}));

describe('ClientsService', () => {
	beforeEach(() => {
		internalApiMock.mockReset();
	});

	it('getAll builds filters and returns accounts', async () => {
		internalApiMock.mockResolvedValueOnce([{ id: 'acc-1' }]);
		const result = await ClientsService.getAll({ status: 'active' });
		expect(internalApiMock).toHaveBeenCalledWith('/internal/accounts?limit=50&status=active');
		expect(result).toEqual([{ id: 'acc-1' }]);
	});

	it('getOrganizations unwraps organizations array', async () => {
		internalApiMock.mockResolvedValueOnce({ organizations: [{ id: 'org-1' }] });
		const result = await ClientsService.getOrganizations('acc-1');
		expect(result).toEqual([{ id: 'org-1' }]);
	});
});
