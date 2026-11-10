import { test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

test.describe('Account Suspension Dialog Screenshots', () => {
	test.beforeAll(() => {
		mkdirSync(resolve(process.cwd(), 'docs/screenshots/account-suspension'), { recursive: true });
	});

	test('captures all 3 required modal states', async ({ page }) => {
		// Mock authentication in localStorage
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

		// Mock internal token endpoint
		await page.route('**/tokens/app', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					data: { token: 'mock-internal-paseto-token', expires_at: Date.now() + 3600000 }
				})
			});
		});

		// Mock devices and capabilities to empty arrays
		await page.route('**/devices*', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
		});
		await page.route('**/capabilities*', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
		});

		// ── 1. Cuenta normal suspendiendo ──────────────────────────────────
		await page.route('**/internal/accounts/acc-normal-1', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					id: 'acc-normal-1',
					account_name: 'Transportes Acuña',
					status: 'ACTIVE',
					account_type: 'CUSTOMER',
					total_organizations: 3,
					total_users: 12,
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
					{
						id: 'org-2',
						name: 'Acuña Logística Norte',
						status: 'ACTIVE',
						nexus_service_status: 'active'
					},
					{
						id: 'org-3',
						name: 'Acuña Distribución',
						status: 'ACTIVE',
						nexus_service_status: 'active'
					}
				])
			});
		});

		await page.goto('/products/nexus/accounts/acc-normal-1');
		await page.waitForSelector('text=Transportes Acuña');
		await page.getByRole('button', { name: 'Suspender cuenta' }).click();
		await page.waitForSelector('#status-modal-title:has-text("Suspender cuenta")');
		await page.waitForTimeout(400);

		await page.screenshot({
			path: 'docs/screenshots/account-suspension/01-cuenta-normal-suspender.png',
			fullPage: true
		});

		await page.getByRole('button', { name: 'Cancelar' }).click();
		await page.waitForTimeout(300);

		// ── 2. Marca (RESELLER) suspendiendo ───────────────────────────────
		await page.route('**/internal/accounts/acc-reseller-1', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					id: 'acc-reseller-1',
					account_name: 'Logística Global (Marca)',
					status: 'ACTIVE',
					account_type: 'RESELLER',
					total_organizations: 1,
					total_users: 5,
					created_at: '2024-11-01T12:00:00Z',
					nexus_service_status: 'active'
				})
			});
		});
		await page.route('**/internal/accounts/acc-reseller-1/organizations', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([
					{
						id: 'org-res-1',
						name: 'Logística Global Matriz',
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
					{
						id: 'sub-1',
						account_name: 'Flota Norte S.A.',
						status: 'ACTIVE',
						account_type: 'CUSTOMER'
					},
					{ id: 'sub-2', account_name: 'Rutas del Sur', status: 'ACTIVE', account_type: 'CUSTOMER' }
				])
			});
		});

		await page.goto('/products/nexus/accounts/acc-reseller-1');
		await page.waitForSelector('text=Logística Global (Marca)');
		await page.getByRole('button', { name: 'Suspender cuenta' }).click();
		await page.waitForSelector('#status-modal-title:has-text("Suspender cuenta")');
		await page.waitForSelector('text=Aplicar también a sus 2 subcuentas');

		// Marcamos la casilla para mostrar las subcuentas
		await page.locator('input[type="checkbox"]').check();
		await page.waitForSelector('text=Flota Norte S.A.');
		await page.waitForTimeout(400);

		await page.screenshot({
			path: 'docs/screenshots/account-suspension/02-marca-suspendiendo.png',
			fullPage: true
		});

		await page.getByRole('button', { name: 'Cancelar' }).click();
		await page.waitForTimeout(300);

		// ── 3. Marca reactivando con subcuentas suspendidas ────────────────
		await page.route('**/internal/accounts/acc-reseller-suspended', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					id: 'acc-reseller-suspended',
					account_name: 'Logística Global (Marca)',
					status: 'SUSPENDED',
					account_type: 'RESELLER',
					total_organizations: 1,
					total_users: 5,
					created_at: '2024-11-01T12:00:00Z',
					nexus_service_status: 'inactive'
				})
			});
		});
		await page.route('**/internal/accounts/acc-reseller-suspended/organizations', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([
					{
						id: 'org-res-1',
						name: 'Logística Global Matriz',
						status: 'ACTIVE',
						nexus_service_status: 'active'
					}
				])
			});
		});
		await page.route('**/internal/accounts/acc-reseller-suspended/subaccounts', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([
					{
						id: 'sub-1',
						account_name: 'Flota Norte S.A.',
						status: 'ACTIVE',
						account_type: 'CUSTOMER'
					},
					{
						id: 'sub-2',
						account_name: 'Distribuidora del Centro',
						status: 'SUSPENDED',
						account_type: 'CUSTOMER'
					},
					{
						id: 'sub-3',
						account_name: 'Transportes Bajío',
						status: 'SUSPENDED',
						account_type: 'CUSTOMER'
					}
				])
			});
		});

		await page.goto('/products/nexus/accounts/acc-reseller-suspended');
		await page.waitForSelector('text=Logística Global (Marca)');
		// Debe aparecer «Suspendida (por la cuenta)» en la tabla de organizaciones
		await page.waitForSelector('text=Suspendida (por la cuenta)');

		// Abrir diálogo de reactivación
		await page.getByRole('button', { name: 'Reactivar cuenta' }).click();
		await page.waitForSelector('#status-modal-title:has-text("Reactivar cuenta")');
		await page.waitForSelector('text=Aplicar también a sus 3 subcuentas');

		// Marcamos la casilla
		await page.locator('input[type="checkbox"]').check();
		await page.waitForSelector(
			'text=También se reactivarán las subcuentas que estén suspendidas por su propia cuenta'
		);
		await page.waitForSelector('text=Distribuidora del Centro');
		await page.waitForTimeout(400);

		await page.screenshot({
			path: 'docs/screenshots/account-suspension/03-marca-reactivando-subcuentas-suspendidas.png',
			fullPage: true
		});
	});
});
