/**
 * Puente comercial Nexus (Siscom Account) ↔ GAC (client_id).
 *
 * Convención: el client_id en gac-api (órdenes, pagos, envíos) es el mismo UUID
 * que accounts.id en siscom-admin-api.
 */

/**
 * @param {string} accountId UUID de la cuenta Nexus (siscom accounts.id)
 * @returns {string}
 */
export function toCommercialClientId(accountId) {
	return accountId;
}

/**
 * @param {string} commercialClientId UUID usado en gac-api
 * @returns {string}
 */
export function toNexusAccountId(commercialClientId) {
	return commercialClientId;
}
