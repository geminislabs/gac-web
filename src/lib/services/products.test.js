import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductsService } from './products.js';

const internalApiMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/services/api', () => ({
	internalApi: (...args) => internalApiMock(...args)
}));

describe('ProductsService', () => {
	beforeEach(() => {
		internalApiMock.mockReset();
	});

	it('getAll applies default limit and normalizes products', async () => {
		internalApiMock.mockResolvedValueOnce({ products: [{ id: 'p1' }] });
		const result = await ProductsService.getAll({ search: 'gps' });
		expect(internalApiMock).toHaveBeenCalledWith('/internal/products?limit=50&search=gps');
		expect(result.products).toEqual([{ id: 'p1' }]);
		expect(result.data).toEqual([{ id: 'p1' }]);
	});

	it('delete calls internal API', async () => {
		internalApiMock.mockResolvedValueOnce(null);
		await ProductsService.delete('p1');
		expect(internalApiMock).toHaveBeenCalledWith('/internal/products/p1', { method: 'DELETE' });
	});
});
