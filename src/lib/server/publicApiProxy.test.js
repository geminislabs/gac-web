import { describe, it, expect, vi } from 'vitest';
import {
	filtrarCabeceras,
	publicBackendUrl,
	proxyPublicApi,
	rutaPermitida
} from './publicApiProxy.js';

const BACKEND = 'http://10.8.0.1:8000';
const RUTA = 'devices/1/communications/latest';

describe('publicApiProxy', () => {
	it('builds the backend URL under /api/v1', () => {
		expect(publicBackendUrl(BACKEND, RUTA)).toBe(`${BACKEND}/api/v1/${RUTA}`);
	});

	it('preserves the query string', () => {
		expect(
			publicBackendUrl(`${BACKEND}/`, '/devices/1/communications', '?received_at=2026-01-01')
		).toBe(`${BACKEND}/api/v1/devices/1/communications?received_at=2026-01-01`);
	});

	it('rejects an empty backend origin', () => {
		expect(() => publicBackendUrl('', 'devices/1')).toThrow('PUBLIC_SISCOM_API_URL');
	});

	// El proxy no tiene autenticación delante: la sesión de GAC es de cliente.
	// Esto es lo único que acota lo que se puede alcanzar detrás.
	describe('superficie', () => {
		it.each([
			['devices/1/communications', true],
			['devices/1/communications/latest', true],
			['devices/eq-01_A.2/communications', true],
			['/devices/1/communications', true],
			['devices/1', false],
			['devices/1/communications/otra', false],
			['organizations', false],
			['', false],
			['stream', false]
		])('rutaPermitida(%s) === %s', (path, esperado) => {
			expect(rutaPermitida(path)).toBe(esperado);
		});

		it('no deja escapar de /api/v1 con segmentos ..', () => {
			// `fetch` normalizaría esto a http://10.8.0.1:8000/health sin avisar.
			expect(() => publicBackendUrl(BACKEND, 'devices/../../health')).toThrow('fuera de /api/v1');
		});

		it('responde 404 a una ruta que no está en la lista', async () => {
			const fetchFn = vi.fn();
			const response = await proxyPublicApi(
				new Request('http://gac.local/api/public/organizations'),
				'organizations',
				'',
				BACKEND,
				fetchFn
			);
			expect(response.status).toBe(404);
			expect(fetchFn).not.toHaveBeenCalled();
		});

		it('responde 405 a un método de escritura', async () => {
			const fetchFn = vi.fn();
			const response = await proxyPublicApi(
				new Request(`http://gac.local/api/public/${RUTA}`, {
					method: 'POST',
					body: '{}',
					headers: { 'Content-Type': 'application/json' }
				}),
				RUTA,
				'',
				BACKEND,
				fetchFn
			);
			expect(response.status).toBe(405);
			expect(response.headers.get('Allow')).toBe('GET, HEAD');
			expect(fetchFn).not.toHaveBeenCalled();
		});
	});

	describe('cabeceras', () => {
		it('no reenvía el token interno de GAC al plano de datos', async () => {
			// `internalApi` adjunta el PASETO interno a TODAS sus llamadas. Es del
			// plano de control y siscom-api no tiene por qué verlo: la separación
			// de claves de la Fase 1 depende de esto.
			const fetchFn = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
			await proxyPublicApi(
				new Request(`http://gac.local/api/public/${RUTA}`, {
					headers: {
						Authorization: 'Bearer v4.local.tokeninterno',
						Cookie: 'gac_session=abc',
						Accept: 'application/json'
					}
				}),
				RUTA,
				'',
				BACKEND,
				fetchFn
			);
			const enviadas = fetchFn.mock.calls[0][1].headers;
			expect(enviadas.get('Authorization')).toBeNull();
			expect(enviadas.get('Cookie')).toBeNull();
			expect(enviadas.get('Accept')).toBe('application/json');
		});

		it('deja pasar el data token (v4.public) hacia siscom-api', async () => {
			const fetchFn = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
			await proxyPublicApi(
				new Request(`http://gac.local/api/public/${RUTA}`, {
					headers: { Authorization: 'Bearer v4.public.eyJkYXRhIjoxfQ.firma-_' }
				}),
				RUTA,
				'',
				BACKEND,
				fetchFn
			);
			const enviadas = fetchFn.mock.calls[0][1].headers;
			expect(enviadas.get('Authorization')).toBe('Bearer v4.public.eyJkYXRhIjoxfQ.firma-_');
		});

		it('no reenvía otra cosa en Authorization aunque se parezca', async () => {
			const fetchFn = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
			await proxyPublicApi(
				new Request(`http://gac.local/api/public/${RUTA}`, {
					headers: { Authorization: 'Basic v4.public.algo' }
				}),
				RUTA,
				'',
				BACKEND,
				fetchFn
			);
			expect(fetchFn.mock.calls[0][1].headers.get('Authorization')).toBeNull();
		});

		it('no deja que el backend ponga cookies en el dominio de GAC', async () => {
			// El proxy es same-origin: un Set-Cookie de siscom-api se instalaría
			// en el dominio de la consola.
			const fetchFn = vi.fn().mockResolvedValue(
				new Response('{}', {
					status: 200,
					headers: {
						'Content-Type': 'application/json',
						'Set-Cookie': 'sesion=x; Path=/',
						Connection: 'close'
					}
				})
			);
			const response = await proxyPublicApi(
				new Request(`http://gac.local/api/public/${RUTA}`),
				RUTA,
				'',
				BACKEND,
				fetchFn
			);
			expect(response.headers.get('Set-Cookie')).toBeNull();
			expect(response.headers.get('Connection')).toBeNull();
			expect(response.headers.get('Content-Type')).toContain('application/json');
		});

		it('filtra por lista blanca en las dos direcciones', () => {
			const filtradas = filtrarCabeceras(
				new Headers({ Accept: 'application/json', Host: 'gac.local', 'X-Lo-Que-Sea': '1' }),
				new Set(['accept'])
			);
			expect(filtradas.get('Accept')).toBe('application/json');
			expect(filtradas.get('Host')).toBeNull();
			expect(filtradas.get('X-Lo-Que-Sea')).toBeNull();
		});
	});

	it('forwards GET to the backend and returns its status', async () => {
		const fetchFn = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		const response = await proxyPublicApi(
			new Request(`http://gac.local/api/public/${RUTA}`, {
				headers: { Accept: 'application/json' }
			}),
			RUTA,
			'',
			BACKEND,
			fetchFn
		);
		expect(fetchFn).toHaveBeenCalledWith(
			`${BACKEND}/api/v1/${RUTA}`,
			expect.objectContaining({ method: 'GET' })
		);
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ ok: true });
	});

	it('propaga el estado de error del backend', async () => {
		const fetchFn = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
		const response = await proxyPublicApi(
			new Request(`http://gac.local/api/public/${RUTA}`),
			RUTA,
			'',
			BACKEND,
			fetchFn
		);
		expect(response.status).toBe(503);
	});
});
