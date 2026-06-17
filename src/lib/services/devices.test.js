import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DevicesService } from './devices.js';

const env = vi.hoisted(() => ({ dev: true }));

vi.mock('$app/environment', () => env);

vi.mock('$env/static/public', () => ({
	PUBLIC_SISCOM_API_URL: 'https://public.example.com'
}));

const internalApiMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/services/api', () => ({
	internalApi: (...args) => internalApiMock(...args)
}));

describe('DevicesService', () => {
	beforeEach(() => {
		internalApiMock.mockReset();
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

	it('getLatestCommunication uses public service', async () => {
		internalApiMock.mockResolvedValueOnce({ device_id: 'd1' });
		await DevicesService.getLatestCommunication('d1');
		expect(internalApiMock).toHaveBeenCalledWith('/devices/d1/communications/latest', {
			service: 'public'
		});
	});
});
