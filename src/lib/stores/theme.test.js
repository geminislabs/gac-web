import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

vi.mock('$app/environment', () => ({ browser: true }));

describe('theme store', () => {
	beforeEach(async () => {
		vi.resetModules();
		localStorage.getItem.mockReturnValue(null);
		localStorage.setItem.mockClear();
	});

	it('exports available themes', async () => {
		const { AVAILABLE_THEMES } = await import('./theme.js');
		expect(AVAILABLE_THEMES.map((t) => t.id)).toEqual(['default', 'matrix', 'dgray', 'classic']);
	});

	it('setTheme ignores unknown values', async () => {
		const { theme, setTheme } = await import('./theme.js');
		const initial = get(theme);
		setTheme(/** @type {any} */ ('unknown'));
		expect(get(theme)).toBe(initial);
	});

	it('setTheme updates the store for valid themes', async () => {
		const { theme, setTheme } = await import('./theme.js');
		setTheme('matrix');
		expect(get(theme)).toBe('matrix');
		expect(document.documentElement.getAttribute('data-theme')).toBe('matrix');
		expect(localStorage.setItem).toHaveBeenCalledWith('gac:theme', 'matrix');
	});

	it('restores theme from localStorage', async () => {
		localStorage.getItem.mockReturnValue('classic');
		const { theme } = await import('./theme.js');
		expect(get(theme)).toBe('classic');
	});
});
