import { test, expect } from '@playwright/test';

test.describe('smoke', () => {
	test('unauthenticated root redirects to login', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveURL(/\/login$/);
	});

	test('login page shows sign-in UI', async ({ page }) => {
		await page.goto('/login');
		await expect(page).toHaveTitle(/Geminislabs Admin/i);
		await expect(page.getByRole('heading', { name: /Geminislabs Admin/i })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Iniciar sesión', exact: true })).toBeVisible();
	});
});
