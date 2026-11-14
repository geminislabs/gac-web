import { describe, it, expect, vi, beforeEach } from 'vitest';

const internalApiMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/services/api', () => ({
	internalApi: (...args) => internalApiMock(...args)
}));

import { getDeviceDataToken, withDeviceDataToken, clearDeviceDataTokens } from './dataToken.js';

/** @param {string} token */
function emision(token, imei = 'd1', ref = 'ref-1') {
	return { token, expires_in: 600, devices: [{ device_id: imei, device_ref: ref }] };
}

describe('dataToken', () => {
	beforeEach(() => {
		internalApiMock.mockReset();
		clearDeviceDataTokens();
	});

	it('pide a admin-api el token del IMEI y devuelve su device_ref', async () => {
		internalApiMock.mockResolvedValueOnce(emision('v4.public.a'));

		const credencial = await getDeviceDataToken('d1');

		expect(internalApiMock).toHaveBeenCalledWith('/internal/data-token', {
			method: 'POST',
			body: JSON.stringify({ device_ids: ['d1'] })
		});
		expect(credencial).toMatchObject({ token: 'v4.public.a', ref: 'ref-1' });
	});

	it('reutiliza el token mientras no esté por caducar', async () => {
		internalApiMock.mockResolvedValueOnce(emision('v4.public.a'));

		await getDeviceDataToken('d1');
		await getDeviceDataToken('d1');

		expect(internalApiMock).toHaveBeenCalledTimes(1);
	});

	it('una sola emisión aunque se pida dos veces a la vez', async () => {
		internalApiMock.mockResolvedValueOnce(emision('v4.public.a'));

		await Promise.all([getDeviceDataToken('d1'), getDeviceDataToken('d1')]);

		expect(internalApiMock).toHaveBeenCalledTimes(1);
	});

	it('pide otro si el guardado está por caducar', async () => {
		internalApiMock
			.mockResolvedValueOnce({ ...emision('v4.public.a'), expires_in: 10 })
			.mockResolvedValueOnce(emision('v4.public.b'));

		await getDeviceDataToken('d1');
		const segundo = await getDeviceDataToken('d1');

		expect(segundo.token).toBe('v4.public.b');
	});

	it('falla si admin-api no devuelve el ref del dispositivo', async () => {
		internalApiMock.mockResolvedValueOnce({ token: 'v4.public.a', expires_in: 600, devices: [] });

		await expect(getDeviceDataToken('d1')).rejects.toThrow(/data token/);
	});

	it('un 403 de siscom-api reemite y reintenta una vez', async () => {
		internalApiMock
			.mockResolvedValueOnce(emision('v4.public.viejo'))
			.mockResolvedValueOnce(emision('v4.public.nuevo'));
		const run = vi
			.fn()
			.mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { status: 403 }))
			.mockResolvedValueOnce('ok');

		expect(await withDeviceDataToken('d1', run)).toBe('ok');
		expect(run.mock.calls.map(([c]) => c.token)).toEqual(['v4.public.viejo', 'v4.public.nuevo']);
	});

	it('otros errores no reemiten', async () => {
		internalApiMock.mockResolvedValueOnce(emision('v4.public.a'));
		const run = vi.fn().mockRejectedValue(Object.assign(new Error('boom'), { status: 500 }));

		await expect(withDeviceDataToken('d1', run)).rejects.toThrow('boom');
		expect(internalApiMock).toHaveBeenCalledTimes(1);
	});
});
