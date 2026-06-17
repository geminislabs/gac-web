import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { toast } from './toast.js';

describe('toast store', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		while (get(toast).length > 0) {
			toast.dismiss(get(toast)[0].id);
		}
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('adds success toasts', () => {
		toast.success('Guardado');
		const toasts = get(toast);
		expect(toasts).toHaveLength(1);
		expect(toasts[0]).toMatchObject({ message: 'Guardado', type: 'success' });
	});

	it('dismisses a toast by id', () => {
		toast.error('Falló');
		const id = get(toast)[0].id;
		toast.dismiss(id);
		expect(get(toast)).toHaveLength(0);
	});

	it('auto-dismisses after duration', () => {
		toast.info('Hola', 1000);
		expect(get(toast)).toHaveLength(1);
		vi.advanceTimersByTime(1000);
		expect(get(toast)).toHaveLength(0);
	});

	it('supports zero-duration toasts without auto-dismiss', () => {
		toast.success('Persistente', 0);
		vi.advanceTimersByTime(5000);
		expect(get(toast)).toHaveLength(1);
	});
});
