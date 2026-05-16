import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

/**
 * Origen HTTP desde PUBLIC_* (sin path) para alinear proxy de desarrollo con producción.
 * @param {string | undefined} publicUrl
 * @returns {string | null}
 */
function proxyOriginFromPublicUrl(publicUrl) {
	if (!publicUrl) return null;
	try {
		return new URL(publicUrl).origin;
	} catch {
		return null;
	}
}

/**
 * En desarrollo:
 * - `/api/gac/*` → gac-api (por defecto puerto 8000, o GAC_API_PROXY_TARGET).
 * - `/api/admin/*` → siscom-admin-api: usa SISCOM_ADMIN_PROXY_TARGET, si no el origen de
 *   PUBLIC_SISCOM_ADMIN_API_URL, si no http://127.0.0.1:8001.
 * - `/api/public/*` → siscom-public-api: análogo con PUBLIC_SISCOM_API_URL / 8080.
 */
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');

	const gacTarget = env.GAC_API_PROXY_TARGET || 'http://127.0.0.1:8000';

	const adminTarget =
		env.SISCOM_ADMIN_PROXY_TARGET ||
		proxyOriginFromPublicUrl(env.PUBLIC_SISCOM_ADMIN_API_URL) ||
		'http://127.0.0.1:8001';

	const publicTarget =
		env.SISCOM_PUBLIC_PROXY_TARGET ||
		proxyOriginFromPublicUrl(env.PUBLIC_SISCOM_API_URL) ||
		'http://127.0.0.1:8080';

	return {
		plugins: [tailwindcss(), sveltekit()],
		build: {
			rollupOptions: {
				external: ['@jesusCabrera84/map-engine']
			}
		},
		ssr: {
			noExternal: []
		},
		server: {
			watch: {
				ignored: ['**/node_modules/**', '**/.git/**']
			},
			proxy: {
				'/api/gac': {
					target: gacTarget,
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/api\/gac/, '/api/v1')
				},
				'/api/admin': {
					target: adminTarget,
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/api\/admin/, '/api/v1')
				},
				'/api/public': {
					target: publicTarget,
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/api\/public/, '/api/v1'),
					ws: true
				}
			}
		}
	};
});
