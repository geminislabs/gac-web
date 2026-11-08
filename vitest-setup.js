import { vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
});

const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
	value: localStorageMock
});

global.fetch = vi.fn();

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

try {
	const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'));
	globalThis.__APP_VERSION__ = globalThis.__APP_VERSION__ || pkg.version;
} catch {
	globalThis.__APP_VERSION__ = globalThis.__APP_VERSION__ || '1.9.0';
}
