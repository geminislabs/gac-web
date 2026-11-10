import { test, expect } from '@playwright/test';

test.describe('Account Suspension and Reactivation', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem(
				'gac_auth',
				JSON.stringify({
					token: 'mock-paseto-token',
					refreshToken: 'mock-refresh-token',
					user: {
						id: '5b1f8c12-3456-4789-a012-3456789abcde',
						email: 'admin@geminislabs.com',
						full_name: 'Administrador Nexus',
						roles: ['admin']
					},
					isAuthenticated: true
				})
			);
		});

		await page.route('**/tokens/app', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					data: { token: 'mock-internal-paseto-token', expires_at: Date.now() + 3600000 }
				})
			});
		});

		await page.route('**/devices*', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
		});
		await page.route('**/capabilities*', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
		});
	});

	test('customer account shows suspension dialog without subaccounts checkbox', async ({
		page
	}) => {
		await page.route('**/internal/accounts/acc-normal-1', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					id: 'acc-normal-1',
					account_name: 'Transportes Acuña',
					status: 'ACTIVE',
					account_type: 'CUSTOMER',
					total_organizations: 2,
					created_at: '2025-01-15T10:00:00Z',
					nexus_service_status: 'active'
				})
			});
		});
		await page.route('**/internal/accounts/acc-normal-1/organizations', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([
					{ id: 'org-1', name: 'Acuña Matriz', status: 'ACTIVE', nexus_service_status: 'active' },
					{ id: 'org-2', name: 'Acuña Norte', status: 'ACTIVE', nexus_service_status: 'active' }
				])
			});
		});

		await page.goto('/products/nexus/accounts/acc-normal-1');
		await expect(page.getByRole('button', { name: 'Suspender cuenta' })).toBeVisible();

		await page.getByRole('button', { name: 'Suspender cuenta' }).click();
		await expect(page.locator('#status-modal-title')).toHaveText('Suspender cuenta');
		await expect(page.locator('#status-modal-description')).toContainText(
			'Todas las organizaciones de esta cuenta (2) dejarán de tener servicio'
		);
		await expect(page.locator('input[type="checkbox"]')).toHaveCount(0);
	});

	test('reseller account shows subaccounts checkbox and warns when reactivating with suspended subaccounts', async ({
		page
	}) => {
		await page.route('**/internal/accounts/acc-reseller-1', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					id: 'acc-reseller-1',
					account_name: 'Logística Global',
					status: 'SUSPENDED',
					account_type: 'RESELLER',
					total_organizations: 1,
					created_at: '2024-11-01T12:00:00Z',
					nexus_service_status: 'inactive'
				})
			});
		});
		await page.route('**/internal/accounts/acc-reseller-1/organizations', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([
					{
						id: 'org-1',
						name: 'Logística Matriz',
						status: 'ACTIVE',
						nexus_service_status: 'active'
					}
				])
			});
		});
		await page.route('**/internal/accounts/acc-reseller-1/subaccounts', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([
					{ id: 'sub-1', account_name: 'Flota Norte', status: 'ACTIVE', account_type: 'CUSTOMER' },
					{
						id: 'sub-2',
						account_name: 'Distribuidora Centro',
						status: 'SUSPENDED',
						account_type: 'CUSTOMER'
					}
				])
			});
		});

		await page.goto('/products/nexus/accounts/acc-reseller-1');
		await expect(page.getByText('Suspendida (por la cuenta)')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Reactivar cuenta' })).toBeVisible();

		await page.getByRole('button', { name: 'Reactivar cuenta' }).click();
		await expect(page.locator('#status-modal-title')).toHaveText('Reactivar cuenta');
		await expect(page.locator('text=Aplicar también a sus 2 subcuentas')).toBeVisible();

		await page.locator('input[type="checkbox"]').check();
		await expect(
			page.getByText(
				'También se reactivarán las subcuentas que estén suspendidas por su propia cuenta'
			)
		).toBeVisible();
		await expect(page.getByText('Distribuidora Centro')).toBeVisible();
	});
});
