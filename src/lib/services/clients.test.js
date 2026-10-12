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

	it('setAccountType manda PATCH con el tipo', async () => {
		internalApiMock.mockResolvedValueOnce({ account_type: 'RESELLER' });
		await ClientsService.setAccountType('acc-1', 'RESELLER');
		expect(internalApiMock).toHaveBeenCalledWith('/internal/accounts/acc-1', {
			method: 'PATCH',
			body: JSON.stringify({ account_type: 'RESELLER' })
		});
	});

	it('getCapabilities devuelve la lista o vacío', async () => {
		internalApiMock.mockResolvedValueOnce([{ code: 'can_resell' }]);
		expect(await ClientsService.getCapabilities('acc-1')).toEqual([{ code: 'can_resell' }]);
		expect(internalApiMock).toHaveBeenCalledWith('/internal/accounts/acc-1/capabilities');

		internalApiMock.mockResolvedValueOnce(null);
		expect(await ClientsService.getCapabilities('acc-1')).toEqual([]);
	});

	it('setCapability y removeCapability usan PUT y DELETE sobre el código', async () => {
		internalApiMock.mockResolvedValue({});
		await ClientsService.setCapability('acc-1', 'white_label_enabled', {
			value: true,
			reason: 'Prueba'
		});
		expect(internalApiMock).toHaveBeenLastCalledWith(
			'/internal/accounts/acc-1/capabilities/white_label_enabled',
			{ method: 'PUT', body: JSON.stringify({ value: true, reason: 'Prueba' }) }
		);

		await ClientsService.removeCapability('acc-1', 'white_label_enabled');
		expect(internalApiMock).toHaveBeenLastCalledWith(
			'/internal/accounts/acc-1/capabilities/white_label_enabled',
			{ method: 'DELETE' }
		);
	});

	it('escapa el id y el código en la ruta', async () => {
		internalApiMock.mockResolvedValue({});
		await ClientsService.removeCapability('../x', 'a/b');
		expect(internalApiMock).toHaveBeenLastCalledWith(
			'/internal/accounts/..%2Fx/capabilities/a%2Fb',
			{ method: 'DELETE' }
		);
	});
});
