import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillingService } from './billing.js';
import { ClientsService } from './clients.js';
import { CommandsService } from './commands.js';
import { CommerceService } from './commerce.js';
import { DevicesService } from './devices.js';
import { OrdersService } from './orders.js';
import { OrganizationsService } from './organizations.js';
import { PaymentsService } from './payments.js';
import { PlansService } from './plans.js';
import { ProductsService } from './products.js';
import { ShipmentsService } from './shipments.js';
import { SimsService } from './sims.js';
import { SubscriptionsService } from './subscriptions.js';
import { TripsService } from './trips.js';
import { userService } from './users.js';

const internalApiMock = vi.hoisted(() => vi.fn());
const apiMock = vi.hoisted(() => vi.fn());

vi.mock('./api.js', () => ({
	internalApi: (...args) => internalApiMock(...args),
	api: (...args) => apiMock(...args),
	initApi: vi.fn()
}));

describe('service method coverage', () => {
	beforeEach(() => {
		internalApiMock.mockReset();
		apiMock.mockReset();
		internalApiMock.mockResolvedValue({});
		apiMock.mockResolvedValue({ data: {} });
	});

	it('covers billing service methods', async () => {
		internalApiMock.mockResolvedValueOnce({ payments: [{ id: 'p1' }] });
		await BillingService.registerManualPayment({
			account_id: 'a',
			organization_id: 'o',
			plan_id: 'p'
		});
		await BillingService.getSummary('org-1');
		await BillingService.listPayments('org-1', { status: 'paid' });
		await BillingService.listInvoices('org-1', { limit: 10 });
		await BillingService.getInvoice('org-1', 'inv-1');
		await BillingService.listPaymentMethods('org-1', 'stripe');
		expect(internalApiMock).toHaveBeenCalled();
	});

	it('covers client and organization service methods', async () => {
		internalApiMock.mockResolvedValueOnce({ organizations: [] });
		await ClientsService.getStats();
		await ClientsService.getById('acc-1');
		await ClientsService.getOrganizations('acc-1');

		await OrganizationsService.getStats();
		await OrganizationsService.getById('org-1');
		await OrganizationsService.getNexusStatus('org-1');
		await OrganizationsService.update('org-1', { name: 'Updated' });
		await OrganizationsService.updateStatus('org-1', 'active');
	});

	it('covers device, sim, and command service methods', async () => {
		await DevicesService.getById('d1');
		await DevicesService.create({ device_id: 'd1' });
		await DevicesService.update('d1', { notes: 'x' });
		await DevicesService.updateStatus('d1', { new_status: 'active' });
		await DevicesService.getEvents('d1');
		await DevicesService.assignOrganization('d1', 'org-1');
		await DevicesService.getCommunications('d1', '2026-01-01', 'UTC');

		internalApiMock.mockResolvedValueOnce({ sims: [{ sim_id: 's1' }] });
		await SimsService.getUnassigned();
		await SimsService.getById('s1');
		await SimsService.assignToDevice('s1', 'd1');
		await SimsService.unassignFromDevice('s1');
		await SimsService.syncFromKore();

		await CommandsService.create({ device_id: 'd1', command: 'reboot', media: 'sms' });
		await CommandsService.getByDevice('d1', { limit: 10 });
	});

	it('covers commerce bundle and catalog services', async () => {
		apiMock
			.mockResolvedValueOnce({ data: { client_id: 'acc-1' } })
			.mockResolvedValueOnce({ data: [] })
			.mockResolvedValueOnce({ data: [] })
			.mockResolvedValueOnce({ data: [] })
			.mockResolvedValueOnce({ data: { client_id: 'acc-1' } });

		await CommerceService.getByAccount('acc-1');

		internalApiMock.mockResolvedValueOnce({ products: [{ id: 'p1' }] });
		await ProductsService.getById('p1');
		await ProductsService.create({ code: 'c', name: 'Product' });
		await ProductsService.update('p1', { name: 'New' });

		await PlansService.getAll(false);
		await PlansService.getById('plan-1');
		await PlansService.create({ name: 'Plan' });
		await PlansService.update('plan-1', { name: 'Updated' });
		await PlansService.delete('plan-1');
		internalApiMock.mockResolvedValueOnce({ capabilities: [{ id: 'cap-1' }] });
		await PlansService.getAvailableCapabilities();
	});

	it('covers commerce admin services and users', async () => {
		apiMock.mockResolvedValue({ data: [] });
		await OrdersService.list({ status: 'open' });
		await OrdersService.create({ client_id: 'acc-1', items: [] });
		await OrdersService.getByClient('acc-1');

		await PaymentsService.getById('pay-1');
		await PaymentsService.create({ client_id: 'acc-1', amount: 10, method: 'cash' });
		await PaymentsService.getByClient('acc-1');

		await ShipmentsService.list({ status: 'pending' });
		await ShipmentsService.getById('ship-1');
		await ShipmentsService.updateStatus('ship-1', 'delivered');
		await ShipmentsService.getByClient('acc-1');

		await TripsService.getTripById('trip-1', { include_alerts: true });

		internalApiMock.mockResolvedValueOnce({ subscriptions: [] });
		await SubscriptionsService.listByOrganization('org-1', { limit: 5 });
		await SubscriptionsService.cancel('org-1', 'sub-1', { reason: 'test' });

		await userService.createUser({ email: 'a@b.com', password: 'secret' });
		await userService.getUser('u1');
		await userService.updateUser('u1', { full_name: 'User' });
		await userService.deleteUser('u1');
		await userService.resetPassword('u1', 'new-pass');
		await userService.changeMyPassword('new-pass');
		await userService.getRoles();
		await userService.createRole('viewer');
		await userService.assignRole('u1', 'r1');
		await userService.revokeRole('u1', 'r1');
	});
});
