import { test } from '@playwright/test';

test.describe('App Versions Screenshots', () => {
	test('capture all required screenshot states', async ({ page }) => {
		// Mock local authentication in localStorage
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

		// 1. Estado inicial con datos (iOS)
		await page.goto('/products/nexus/app-versions?mock=1');
		await page.waitForSelector('text=Política de IOS');
		await page.waitForTimeout(500);
		await page.screenshot({
			path: 'docs/screenshots/app-versions/01-estado-inicial-con-datos.png',
			fullPage: true
		});

		// 2. Error 422 junto a su campo (store_url)
		const storeUrlInput = page.locator('#store_url');
		await storeUrlInput.fill('https://tienda-no-autorizada.com/app/123');
		await page.getByRole('button', { name: 'Guardar cambios' }).click();
		await page.waitForSelector('text=store_url debe ser de apps.apple.com');
		await page.waitForTimeout(300);
		await page.screenshot({
			path: 'docs/screenshots/app-versions/02-error-422-campo.png',
			fullPage: true
		});

		// 3. Confirmación de impacto con required > 0
		// Corregimos store_url y elevamos min_supported_version a 1.1.0 para impactar a v1.0.1 (100 instalaciones)
		await storeUrlInput.fill('https://apps.apple.com/app/id123456789');
		const minInput = page.locator('#min_supported_version');
		await minInput.fill('1.1.0');
		await page.getByRole('button', { name: 'Guardar cambios' }).click();
		await page.waitForSelector('#impact-modal-title');
		await page.waitForSelector('text=quedarán bloqueadas');
		await page.waitForTimeout(400);
		await page.screenshot({
			path: 'docs/screenshots/app-versions/03-confirmacion-impacto-required.png',
			fullPage: true
		});

		// Cerramos el modal
		await page.getByRole('button', { name: 'Cancelar' }).click();
		await page.waitForTimeout(300);

		// 4. Plataforma Android con datos
		await page.getByRole('button', { name: 'Google Android' }).click();
		await page.waitForSelector('text=Política de ANDROID');
		await page.waitForTimeout(500);
		await page.screenshot({
			path: 'docs/screenshots/app-versions/04-plataforma-android.png',
			fullPage: true
		});
	});
});
