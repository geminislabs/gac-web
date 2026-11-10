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

	it('getSubaccounts llama a GET /internal/accounts/{id}/subaccounts escapando id', async () => {
		internalApiMock.mockResolvedValueOnce([
			{ id: 'sub-1', account_name: 'Subcuenta A', status: 'ACTIVE' }
		]);
		const res = await ClientsService.getSubaccounts('acc/1');
		expect(internalApiMock).toHaveBeenCalledWith('/internal/accounts/acc%2F1/subaccounts');
		expect(res).toEqual([{ id: 'sub-1', account_name: 'Subcuenta A', status: 'ACTIVE' }]);

		internalApiMock.mockResolvedValueOnce(null);
		expect(await ClientsService.getSubaccounts('acc-2')).toEqual([]);
	});

	it('setStatus envía PATCH con status y escapa el id', async () => {
		internalApiMock.mockResolvedValueOnce({
			changed: true,
			account: { id: 'acc/1', status: 'SUSPENDED' },
			subaccounts: []
		});

		await ClientsService.setStatus('acc/1', { status: 'SUSPENDED' });
		expect(internalApiMock).toHaveBeenCalledWith('/internal/accounts/acc%2F1/status', {
			method: 'PATCH',
			body: JSON.stringify({ status: 'SUSPENDED' })
		});
	});

	it('setStatus mapea includeSubaccounts a include_subaccounts solo si es true', async () => {
		internalApiMock.mockResolvedValue({ changed: true });

		// includeSubaccounts es true -> se envía include_subaccounts: true
		await ClientsService.setStatus('acc-1', {
			status: 'SUSPENDED',
			includeSubaccounts: true
		});
		expect(internalApiMock).toHaveBeenLastCalledWith('/internal/accounts/acc-1/status', {
			method: 'PATCH',
			body: JSON.stringify({ status: 'SUSPENDED', include_subaccounts: true })
		});

		// includeSubaccounts es false -> NO se envía include_subaccounts
		await ClientsService.setStatus('acc-1', {
			status: 'ACTIVE',
			includeSubaccounts: false
		});
		expect(internalApiMock).toHaveBeenLastCalledWith('/internal/accounts/acc-1/status', {
			method: 'PATCH',
			body: JSON.stringify({ status: 'ACTIVE' })
		});

		// includeSubaccounts es undefined -> NO se envía include_subaccounts
		await ClientsService.setStatus('acc-1', { status: 'ACTIVE' });
		expect(internalApiMock).toHaveBeenLastCalledWith('/internal/accounts/acc-1/status', {
			method: 'PATCH',
			body: JSON.stringify({ status: 'ACTIVE' })
		});
	});

	it('setStatus incluye reason recortado si fue proporcionado', async () => {
		internalApiMock.mockResolvedValue({ changed: true });

		await ClientsService.setStatus('acc-1', {
			status: 'SUSPENDED',
			reason: '   Falta de pago de octubre   '
		});
		expect(internalApiMock).toHaveBeenLastCalledWith('/internal/accounts/acc-1/status', {
			method: 'PATCH',
			body: JSON.stringify({ status: 'SUSPENDED', reason: 'Falta de pago de octubre' })
		});

		// string vacío o solo espacios -> no se incluye reason
		await ClientsService.setStatus('acc-1', {
			status: 'SUSPENDED',
			reason: '   '
		});
		expect(internalApiMock).toHaveBeenLastCalledWith('/internal/accounts/acc-1/status', {
			method: 'PATCH',
			body: JSON.stringify({ status: 'SUSPENDED' })
		});
	});

	it('setStatus incluye cause si fue proporcionado', async () => {
		internalApiMock.mockResolvedValue({ changed: true });

		await ClientsService.setStatus('acc-1', {
			status: 'SUSPENDED',
			cause: 'non_payment'
		});
		expect(internalApiMock).toHaveBeenLastCalledWith('/internal/accounts/acc-1/status', {
			method: 'PATCH',
			body: JSON.stringify({ status: 'SUSPENDED', cause: 'non_payment' })
		});

		await ClientsService.setStatus('acc-1', {
			status: 'SUSPENDED',
			cause: 'other'
		});
		expect(internalApiMock).toHaveBeenLastCalledWith('/internal/accounts/acc-1/status', {
			method: 'PATCH',
			body: JSON.stringify({ status: 'SUSPENDED', cause: 'other' })
		});

		await ClientsService.setStatus('acc-1', {
			status: 'ACTIVE'
		});
		expect(internalApiMock).toHaveBeenLastCalledWith('/internal/accounts/acc-1/status', {
			method: 'PATCH',
			body: JSON.stringify({ status: 'ACTIVE' })
		});
	});
});
