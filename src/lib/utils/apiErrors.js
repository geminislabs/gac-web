/**
 * Formatea errores JSON de FastAPI / GAC API para mostrar al usuario.
 * @param {Record<string, unknown>} errorData
 * @param {string} [fallback]
 * @returns {string}
 */
export function formatApiErrorMessage(errorData, fallback = 'Error en la solicitud') {
	if (!errorData || typeof errorData !== 'object') {
		return fallback;
	}

	if (typeof errorData.message === 'string' && errorData.message.trim()) {
		return errorData.message;
	}

	const detail = errorData.detail;
	if (typeof detail === 'string' && detail.trim()) {
		return detail;
	}

	if (Array.isArray(detail) && detail.length > 0) {
		const parts = detail.slice(0, 5).map((item) => {
			if (typeof item === 'string') return item;
			if (item && typeof item === 'object') {
				const field =
					/** @type {{ field?: string, loc?: unknown[], msg?: string, message?: string }} */ (item);
				const name =
					field.field ||
					(Array.isArray(field.loc) ? field.loc.filter((p) => p !== 'body').join('.') : '');
				const msg = field.message || field.msg || 'valor inválido';
				return name ? `${name}: ${msg}` : msg;
			}
			return String(item);
		});
		return parts.join('; ');
	}

	return fallback;
}
