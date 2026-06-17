import { defineConfig, devices } from '@playwright/test';

const port = 4173;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'list',
	use: {
		...devices['Desktop Chrome'],
		baseURL,
		trace: 'on-first-retry'
	},
	webServer: {
		command: `npm run build && npm run preview -- --port ${port} --host 127.0.0.1`,
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 180000,
		env: {
			PUBLIC_GAC_API_URL: process.env.PUBLIC_GAC_API_URL || 'http://127.0.0.1:8000',
			PUBLIC_SISCOM_ADMIN_API_URL:
				process.env.PUBLIC_SISCOM_ADMIN_API_URL || 'http://127.0.0.1:8001',
			PUBLIC_SISCOM_API_URL: process.env.PUBLIC_SISCOM_API_URL || 'http://127.0.0.1:8080',
			VITE_GOOGLE_MAPS_API_KEY: process.env.VITE_GOOGLE_MAPS_API_KEY || ''
		}
	}
});
