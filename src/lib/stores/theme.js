import { writable } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Temas soportados por GAC. Cada tema declara su set completo de
 * variables CSS en src/lib/styles/themes.css.
 *
 * @typedef {'default' | 'matrix' | 'dgray' | 'classic'} ThemeName
 */

/** @type {ReadonlyArray<{ id: ThemeName, label: string, mode: 'dark' | 'light' }>} */
export const AVAILABLE_THEMES = Object.freeze([
	{ id: 'default', label: 'Geminis (oscuro)', mode: 'dark' },
	{ id: 'matrix', label: 'Matrix', mode: 'dark' },
	{ id: 'dgray', label: 'Grafito', mode: 'dark' },
	{ id: 'classic', label: 'Clásico (claro)', mode: 'light' }
]);

const STORAGE_KEY = 'gac:theme';
const DEFAULT_THEME = /** @type {ThemeName} */ ('default');

/** @type {ThemeName} */
const initial = (() => {
	if (!browser) return DEFAULT_THEME;
	const stored = /** @type {ThemeName | null} */ (localStorage.getItem(STORAGE_KEY));
	if (stored && AVAILABLE_THEMES.some((t) => t.id === stored)) return stored;
	return DEFAULT_THEME;
})();

export const theme = writable(initial);

/**
 * Aplica el tema al <html>. La fuente de verdad es siempre el store.
 * @param {ThemeName} value
 */
function applyTheme(value) {
	if (!browser) return;
	const root = document.documentElement;
	root.setAttribute('data-theme', value);
	const mode = AVAILABLE_THEMES.find((t) => t.id === value)?.mode ?? 'dark';
	root.classList.toggle('dark', mode === 'dark');
}

if (browser) {
	applyTheme(initial);
	theme.subscribe((value) => {
		applyTheme(value);
		try {
			localStorage.setItem(STORAGE_KEY, value);
		} catch (err) {
			console.warn('No se pudo persistir el tema en localStorage', err);
		}
	});
}

/**
 * Cambia el tema activo.
 * @param {ThemeName} value
 */
export function setTheme(value) {
	if (!AVAILABLE_THEMES.some((t) => t.id === value)) return;
	theme.set(value);
}
