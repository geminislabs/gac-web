/**
 * Utilidades de roles GAC (JWT /auth/me → user.roles: string[]).
 */

/** @typedef {{ roles?: string[] }} GacUser */

/** @param {GacUser | null | undefined} user */
export function getUserRoles(user) {
	if (!user) return [];
	if (Array.isArray(user.roles)) return user.roles.map(String);
	return [];
}

/** @param {GacUser | null | undefined} user */
export function isAdmin(user) {
	return getUserRoles(user).includes('admin');
}

/** Nexus, catálogo y planes requieren token PASETO (solo rol admin en GAC). */
/** @param {GacUser | null | undefined} user */
export function canAccessNexus(user) {
	return isAdmin(user);
}

/** @param {GacUser | null | undefined} user */
export function canManageInternalUsers(user) {
	return isAdmin(user);
}

/** Órdenes, pagos y envíos: cualquier usuario autenticado. */
/** @param {GacUser | null | undefined} user */
export function canAccessCommerce(user) {
	return Boolean(user);
}

/** @param {GacUser | null | undefined} user */
export function canWriteNexus(user) {
	return isAdmin(user);
}

/** @param {GacUser | null | undefined} user */
export function isViewerOnly(user) {
	const roles = getUserRoles(user);
	return roles.includes('viewer') && !roles.includes('admin') && !roles.includes('user');
}

/**
 * @param {string} pathname
 * @returns {boolean}
 */
export function pathRequiresNexusAccess(pathname) {
	return (
		pathname.startsWith('/products/nexus') ||
		pathname.startsWith('/products/plans') ||
		pathname.startsWith('/products/catalog')
	);
}

/**
 * @param {string} pathname
 * @returns {boolean}
 */
export function pathRequiresAdmin(pathname) {
	return pathname.startsWith('/admin/internal-users');
}
