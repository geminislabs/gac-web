import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DevicesService, WS_TOKEN_PROTOCOL } from './devices.js';

const env = vi.hoisted(() => ({ dev: true }));

vi.mock('$app/environment', () => env);

vi.mock('$env/static/public', () => ({
	PUBLIC_SISCOM_API_URL: 'https://public.example.com'
}));

const internalApiMock = vi.hoisted(() => vi.fn());
const dataPlaneApiMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/services/api', () => ({
	internalApi: (...args) => internalApiMock(...args),
	dataPlaneApi: (...args) => dataPlaneApiMock(...args)
}));

const credencial = { token: 'v4.public.tok', ref: 'ref-1', expiresAt: Date.now() + 600_000 };
const getDeviceDataTokenMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/services/dataToken', () => ({
	getDeviceDataToken: (...args) => getDeviceDataTokenMock(...args),
	withDeviceDataToken: async (imei, run) => run(await getDeviceDataTokenMock(imei))
}));

describe('DevicesService', () => {
	beforeEach(() => {
		internalApiMock.mockReset();
		dataPlaneApiMock.mockReset();
		getDeviceDataTokenMock.mockReset().mockResolvedValue(credencial);
		env.dev = true;
	});

	it('getAll normalizes devices array from wrapped response', async () => {
		internalApiMock.mockResolvedValueOnce({ devices: [{ device_id: 'd1' }] });
		const result = await DevicesService.getAll({ status: 'active' });
		expect(internalApiMock).toHaveBeenCalledWith('/devices?status=active');
		expect(result).toEqual([{ device_id: 'd1' }]);
	});

	it('getStreamUrl uses dev websocket proxy', () => {
		const url = DevicesService.getStreamUrl(['d1', 'd2']);
		expect(url).toContain('/api/public/stream?device_ids=d1,d2');
	});

	it('getStreamUrl uses production websocket URL', () => {
		env.dev = false;
		const url = DevicesService.getStreamUrl('d1');
		expect(url).toBe('wss://public.example.com/api/v1/stream?device_ids=d1');
	});

	it('assignOrganization uses PATCH /status with preparado', async () => {
		internalApiMock.mockResolvedValueOnce({ device_id: 'd1', status: 'preparado' });
		await DevicesService.assignOrganization('d1', 'org-1');
		expect(internalApiMock).toHaveBeenCalledWith('/devices/d1/status', {
			method: 'PATCH',
			body: JSON.stringify({ new_status: 'preparado', client_id: 'org-1' })
		});
	});

	it('getLatestCommunication pide por device_ref con el data token y devuelve IMEI', async () => {
		dataPlaneApiMock.mockResolvedValueOnce({ device_id: 'ref-1', latitude: 19.4 });
		const result = await DevicesService.getLatestCommunication('d1');
		expect(getDeviceDataTokenMock).toHaveBeenCalledWith('d1');
		expect(dataPlaneApiMock).toHaveBeenCalledWith(
			'/devices/ref-1/communications/latest',
			'v4.public.tok'
		);
		expect(result).toEqual({ device_id: 'd1', latitude: 19.4 });
		expect(internalApiMock).not.toHaveBeenCalled();
	});

	it('getLatestCommunication deja pasar null', async () => {
		dataPlaneApiMock.mockResolvedValueOnce(null);
		expect(await DevicesService.getLatestCommunication('d1')).toBeNull();
	});

	it('getCommunications traduce cada fila de device_ref a IMEI', async () => {
		dataPlaneApiMock.mockResolvedValueOnce([
			{ device_id: 'ref-1', speed: 10 },
			{ device_id: 'ref-1', speed: 20 }
		]);
		const result = await DevicesService.getCommunications(
			'd1',
			'2026-11-13',
			'America/Mexico_City'
		);
		expect(dataPlaneApiMock).toHaveBeenCalledWith(
			'/devices/ref-1/communications?received_at=2026-11-13&tz=America%2FMexico_City',
			'v4.public.tok'
		);
		expect(result.map((r) => r.device_id)).toEqual(['d1', 'd1']);
	});

	it('openStream abre el WebSocket por device_ref con el token en el subprotocolo', async () => {
		const WebSocketMock = vi.fn();
		vi.stubGlobal('WebSocket', WebSocketMock);
		await DevicesService.openStream('d1');
		expect(WebSocketMock).toHaveBeenCalledWith(expect.stringContaining('device_ids=ref-1'), [
			WS_TOKEN_PROTOCOL,
			'v4.public.tok'
		]);
		vi.unstubAllGlobals();
	});
});
