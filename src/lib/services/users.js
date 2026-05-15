import { api } from './api';

/**
 * @typedef {Object} ApiUser
 * @property {string} user_id
 * @property {string} email
 * @property {string|null} full_name
 * @property {boolean} is_active
 * @property {string[]} roles
 */

/**
 * @typedef {Object} ApiRole
 * @property {string} role_id
 * @property {string} name
 */

/**
 * Servicio de gestión de usuarios y roles internos (gac-api).
 * Mantiene una API estable para los componentes consumidores.
 */
export const userService = {
	/**
	 * Lista usuarios paginados.
	 * @param {number} skip
	 * @param {number} limit
	 * @returns {Promise<{ message: string, data: ApiUser[] }>}
	 */
	getUsers(skip = 0, limit = 100) {
		return api(`/users?skip=${skip}&limit=${limit}`);
	},

	/**
	 * Crea un usuario interno.
	 * @param {{ email: string, password: string, full_name?: string, is_active?: boolean, roles?: string[] }} userData
	 */
	createUser(userData) {
		return api('/users', {
			method: 'POST',
			body: JSON.stringify(userData)
		});
	},

	/**
	 * @param {string} userId
	 */
	getUser(userId) {
		return api(`/users/${userId}`);
	},

	/**
	 * Actualiza atributos no sensibles del usuario.
	 * @param {string} userId
	 * @param {{ full_name?: string, is_active?: boolean, roles?: string[] }} userData
	 */
	updateUser(userId, userData) {
		return api(`/users/${userId}`, {
			method: 'PATCH',
			body: JSON.stringify(userData)
		});
	},

	/**
	 * Soft delete (desactiva al usuario).
	 * @param {string} userId
	 */
	deleteUser(userId) {
		return api(`/users/${userId}`, { method: 'DELETE' });
	},

	/**
	 * Reset administrativo de contraseña.
	 * @param {string} userId
	 * @param {string} newPassword
	 */
	resetPassword(userId, newPassword) {
		return api(`/users/${userId}/password`, {
			method: 'PATCH',
			body: JSON.stringify({ new_password: newPassword })
		});
	},

	/**
	 * Cambio de contraseña del usuario autenticado.
	 * @param {string} newPassword
	 */
	changeMyPassword(newPassword) {
		return api('/auth/password', {
			method: 'PATCH',
			body: JSON.stringify({ new_password: newPassword })
		});
	},

	/**
	 * Lista roles disponibles.
	 * @returns {Promise<{ message: string, data: ApiRole[] }>}
	 */
	getRoles() {
		return api('/roles');
	},

	/**
	 * Crea un rol.
	 * @param {string} name
	 */
	createRole(name) {
		return api('/roles', {
			method: 'POST',
			body: JSON.stringify({ name })
		});
	},

	/**
	 * Asigna un rol a un usuario.
	 * @param {string} userId
	 * @param {string} roleId
	 */
	assignRole(userId, roleId) {
		return api(`/users/${userId}/roles/${roleId}`, { method: 'POST' });
	},

	/**
	 * Revoca un rol de un usuario.
	 * @param {string} userId
	 * @param {string} roleId
	 */
	revokeRole(userId, roleId) {
		return api(`/users/${userId}/roles/${roleId}`, { method: 'DELETE' });
	}
};
