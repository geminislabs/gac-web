import { internalApi } from '$lib/services/api';

/**
 * Data token del plano de datos (siscom-api) para el mapa de dispositivos.
 *
 * GAC conoce los dispositivos por IMEI; siscom-api, cuando exige el data token
 * (`DATA_TOKEN_ENFORCED`), sólo acepta el `device_ref` opaco que viene con él.
 * admin-api (`POST /internal/data-token`) devuelve las dos cosas juntas.
 *
 * Se guarda en memoria, uno por dispositivo, hasta poco antes de caducar. Es el
 * mismo patrón que el panel de Nexus: un 401/403 de siscom-api fuerza una
 * emisión nueva y se reintenta una vez.
 *
 * @typedef {{ token: string, ref: string, expiresAt: number }} DeviceDataToken
 */

/** Se renueva un poco antes de caducar, para no mandar uno que muere en vuelo. */
const MARGEN_MS = 30 * 1000;

/** @type {Map<string, DeviceDataToken>} */
const cache = new Map();

/** @type {Map<string, Promise<DeviceDataToken>>} */
const enVuelo = new Map();

/**
 * @param {string} imei
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<DeviceDataToken>}
 */
export async function getDeviceDataToken(imei, { force = false } = {}) {
	const guardado = cache.get(imei);
	if (!force && guardado && Date.now() < guardado.expiresAt - MARGEN_MS) return guardado;

	const pendiente = enVuelo.get(imei);
	if (pendiente) return pendiente;

	const emision = (async () => {
		/** @type {any} */
		const respuesta = await internalApi('/internal/data-token', {
			method: 'POST',
			body: JSON.stringify({ device_ids: [imei] })
		});
		const dispositivo = respuesta?.devices?.find((/** @type {any} */ d) => d.device_id === imei);
		if (!respuesta?.token || !dispositivo?.device_ref) {
			throw new Error('admin-api no devolvió el data token del dispositivo');
		}
		/** @type {DeviceDataToken} */
		const entrada = {
			token: respuesta.token,
			ref: dispositivo.device_ref,
			expiresAt: Date.now() + Number(respuesta.expires_in || 0) * 1000
		};
		cache.set(imei, entrada);
		return entrada;
	})().finally(() => enVuelo.delete(imei));

	enVuelo.set(imei, emision);
	return emision;
}

/**
 * Corre `run` con el data token del dispositivo. Si siscom-api lo rechaza
 * (401/403: caducó o se revocó), pide otro y reintenta una vez.
 * @template T
 * @param {string} imei
 * @param {(credencial: DeviceDataToken) => Promise<T>} run
 * @returns {Promise<T>}
 */
export async function withDeviceDataToken(imei, run) {
	try {
		return await run(await getDeviceDataToken(imei));
	} catch (error) {
		const status = /** @type {any} */ (error)?.status;
		if (status !== 401 && status !== 403) throw error;
		return run(await getDeviceDataToken(imei, { force: true }));
	}
}

/** Olvida los tokens guardados (al cerrar sesión, o en tests). */
export function clearDeviceDataTokens() {
	cache.clear();
	enVuelo.clear();
}
