import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrganizationsService } from './organizations.js';

const internalApiMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/services/api', () => ({
	internalApi: (...args) => internalApiMock(...args)
}));

describe('OrganizationsService', () => {
	beforeEach(() => {
		internalApiMock.mockReset();
	});

	it('list builds query string and normalizes array response', async () => {
		internalApiMock.mockResolvedValueOnce([{ id: 'org-1' }]);
		const result = await OrganizationsService.list({ status: 'active', search: 'acme' });
		expect(internalApiMock).toHaveBeenCalledWith(
			'/internal/organizations?status=active&search=acme'
		);
		expect(result).toEqual([{ id: 'org-1' }]);
	});

	it('list unwraps organizations property', async () => {
		internalApiMock.mockResolvedValueOnce({ organizations: [{ id: 'org-2' }] });
		const result = await OrganizationsService.list();
		expect(result).toEqual([{ id: 'org-2' }]);
	});

	it('getUsers normalizes array response', async () => {
		internalApiMock.mockResolvedValueOnce([{ id: 'user-1' }]);
		await expect(OrganizationsService.getUsers('org-1')).resolves.toEqual([{ id: 'user-1' }]);
	});

	it('create posts organization payload', async () => {
		internalApiMock.mockResolvedValueOnce({ id: 'org-3' });
		await OrganizationsService.create({ account_id: 'acc-1', name: 'Org' });
		expect(internalApiMock).toHaveBeenCalledWith('/internal/organizations', {
			method: 'POST',
			body: JSON.stringify({ account_id: 'acc-1', name: 'Org' })
		});
	});
});
