import { describe, it, expect } from 'vitest';
import { formatApiErrorMessage } from './apiErrors.js';

describe('formatApiErrorMessage', () => {
	it('returns fallback for invalid input', () => {
		expect(formatApiErrorMessage(/** @type {any} */ (null), 'fallback')).toBe('fallback');
	});

	it('prefers message field', () => {
		expect(formatApiErrorMessage({ message: 'Error de negocio' })).toBe('Error de negocio');
	});

	it('uses string detail', () => {
		expect(formatApiErrorMessage({ detail: 'No autorizado' })).toBe('No autorizado');
	});

	it('formats validation detail array', () => {
		const result = formatApiErrorMessage({
			detail: [
				{ loc: ['body', 'email'], msg: 'correo inválido' },
				{ field: 'password', message: 'muy corta' }
			]
		});
		expect(result).toContain('email: correo inválido');
		expect(result).toContain('password: muy corta');
	});
});
