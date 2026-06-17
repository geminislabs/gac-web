import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillingService } from './billing.js';
import { CommerceService } from './commerce.js';
import { SubscriptionsService } from './subscriptions.js';
import { SimsService } from './sims.js';
import { PlansService } from './plans.js';
import { PaymentsService } from './payments.js';
import { OrdersService } from './orders.js';
import { ShipmentsService } from './shipments.js';
import { TripsService } from './trips.js';
import { CommandsService } from './commands.js';
import { userService } from './users.js';

const internalApiMock = vi.hoisted(() => vi.fn());
const apiMock = vi.hoisted(() => vi.fn());

vi.mock('./api.js', () => ({
	internalApi: (...args) => internalApiMock(...args),
	api: (...args) => apiMock(...args),
	initApi: vi.fn()
}));

describe('service passthrough modules', () => {
	beforeEach(() => {
		internalApiMock.mockReset();
		apiMock.mockReset();
		internalApiMock.mockResolvedValue([]);
		apiMock.mockResolvedValue({});
	});

	it('BillingService delegates billing endpoints', async () => {
		await BillingService.getSummary('org-1');
		expect(internalApiMock).toHaveBeenCalledWith('/internal/organizations/org-1/billing/summary');

		internalApiMock.mockResolvedValueOnce([{ id: 'pm-1' }]);
		await expect(BillingService.listPaymentMethods('org-1')).resolves.toEqual([{ id: 'pm-1' }]);
	});

	it('CommerceService delegates to GAC client endpoint', async () => {
		apiMock.mockResolvedValueOnce({ data: { client_id: 'acc-1' } });
		await CommerceService.getSummary('acc-1');
		expect(apiMock).toHaveBeenCalledWith('/clients/acc-1');
	});

	it('SubscriptionsService delegates subscription endpoints', async () => {
		await SubscriptionsService.getById('org-1', 'sub-1');
		expect(internalApiMock).toHaveBeenCalledWith(
			'/internal/organizations/org-1/subscriptions/sub-1'
		);
	});

	it('SimsService normalizes list responses', async () => {
		internalApiMock.mockResolvedValueOnce({ sims: [{ id: 'sim-1' }] });
		await expect(SimsService.getAll()).resolves.toEqual([{ id: 'sim-1' }]);
	});

	it('PlansService unwraps available products', async () => {
		internalApiMock.mockResolvedValueOnce({ products: [{ id: 'prod-1' }] });
		await expect(PlansService.getAvailableProducts()).resolves.toEqual([{ id: 'prod-1' }]);
	});

	it('PaymentsService lists payments with query params', async () => {
		apiMock.mockResolvedValueOnce({ data: [] });
		await PaymentsService.list({ status: 'paid' });
		expect(apiMock).toHaveBeenCalledWith('/payments?status=paid');
	});

	it('OrdersService gets order by id', async () => {
		apiMock.mockResolvedValueOnce({ data: { order_id: 'order-1' } });
		await OrdersService.getById('order-1');
		expect(apiMock).toHaveBeenCalledWith('/orders/order-1');
	});

	it('ShipmentsService creates shipments', async () => {
		apiMock.mockResolvedValueOnce({ data: { shipment_id: 's1' } });
		await ShipmentsService.create({ order_id: 'o1', client_id: 'acc-1' });
		expect(apiMock).toHaveBeenCalledWith('/shipments', {
			method: 'POST',
			body: JSON.stringify({ order_id: 'o1', client_id: 'acc-1' })
		});
	});

	it('TripsService lists trips', async () => {
		await TripsService.getTrips({ device_id: 'd1' });
		expect(internalApiMock).toHaveBeenCalledWith('/trips?device_id=d1');
	});

	it('CommandsService syncs commands', async () => {
		await CommandsService.sync('cmd-1');
		expect(internalApiMock).toHaveBeenCalledWith('/commands/cmd-1/sync', { method: 'POST' });
	});

	it('userService delegates GAC user endpoints', async () => {
		await userService.getUsers(0, 50);
		expect(apiMock).toHaveBeenCalledWith('/users?skip=0&limit=50');
	});
});
