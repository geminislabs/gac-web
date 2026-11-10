import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import AccountStatusModal from './AccountStatusModal.svelte';
import { ClientsService } from '$lib/services/clients';

vi.mock('$lib/services/clients', () => ({
	ClientsService: {
		getSubaccounts: vi.fn()
	}
}));

describe('AccountStatusModal', () => {
	/** @type {HTMLElement} */
	let container;

	beforeEach(() => {
		vi.clearAllMocks();
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	function normalizedText() {
		return (container.textContent || '').replace(/\s+/g, ' ').trim();
	}

	it('muestra el mensaje de suspensión para cuenta normal y no muestra casilla de subcuentas', () => {
		const comp = mount(AccountStatusModal, {
			target: container,
			props: {
				isOpen: true,
				targetStatus: 'SUSPENDED',
				account: {
					id: 'acc-1',
					account_name: 'Cliente Base',
					account_type: 'CUSTOMER',
					status: 'ACTIVE'
				},
				organizationsCount: 3
			}
		});
		flushSync();

		expect(normalizedText()).toContain('Suspender cuenta');
		expect(normalizedText()).toContain(
			'Todas las organizaciones de esta cuenta (3) dejarán de tener servicio. Sus usuarios solo podrán entrar a facturación. Se cerrará el acceso de las apps y se apagarán los enlaces de ubicación compartidos.'
		);
		expect(container.querySelector('input[type="checkbox"]')).toBeNull();
		expect(normalizedText()).not.toContain('Aplicar también a sus');

		unmount(comp);
	});

	it('muestra el mensaje de reactivación y no muestra opciones de causa', () => {
		const comp = mount(AccountStatusModal, {
			target: container,
			props: {
				isOpen: true,
				targetStatus: 'ACTIVE',
				account: {
					id: 'acc-1',
					account_name: 'Cliente Base',
					account_type: 'CUSTOMER',
					status: 'SUSPENDED'
				},
				organizationsCount: 1
			}
		});
		flushSync();

		expect(normalizedText()).toContain('Reactivar cuenta');
		expect(normalizedText()).toContain(
			'Las organizaciones volverán a tener servicio. Los enlaces compartidos que se apagaron no vuelven.'
		);
		// Solo al suspender se piden las causas
		expect(container.querySelectorAll('input[type="radio"]').length).toBe(0);
		expect(normalizedText()).not.toContain('Causa de la suspensión');

		unmount(comp);
	});

	it('pide la causa de suspensión con dos opciones radio por defecto non_payment', () => {
		const comp = mount(AccountStatusModal, {
			target: container,
			props: {
				isOpen: true,
				targetStatus: 'SUSPENDED',
				account: {
					id: 'acc-1',
					account_name: 'Cliente Base',
					account_type: 'CUSTOMER',
					status: 'ACTIVE'
				},
				organizationsCount: 1
			}
		});
		flushSync();

		const radios = /** @type {NodeListOf<HTMLInputElement>} */ (
			container.querySelectorAll('input[type="radio"]')
		);
		expect(radios.length).toBe(2);

		const nonPaymentRadio = Array.from(radios).find((r) => r.value === 'non_payment');
		const otherRadio = Array.from(radios).find((r) => r.value === 'other');

		expect(nonPaymentRadio).toBeDefined();
		expect(nonPaymentRadio?.checked).toBe(true);
		expect(otherRadio).toBeDefined();
		expect(otherRadio?.checked).toBe(false);

		expect(normalizedText()).toContain('Falta de pago');
		expect(normalizedText()).toContain('Se reactivará sola cuando pague.');
		expect(normalizedText()).toContain('Otra causa');
		expect(normalizedText()).toContain('Solo se podrá reactivar desde GAC, aunque pague.');

		unmount(comp);
	});

	it('permite cambiar la causa a other y la envía en el callback', () => {
		const onConfirm = vi.fn().mockResolvedValue(undefined);

		const comp = mount(AccountStatusModal, {
			target: container,
			props: {
				isOpen: true,
				targetStatus: 'SUSPENDED',
				account: {
					id: 'acc-1',
					account_name: 'Cliente Base',
					account_type: 'CUSTOMER',
					status: 'ACTIVE'
				},
				organizationsCount: 1,
				onConfirm
			}
		});
		flushSync();

		const otherRadio = /** @type {HTMLInputElement} */ (
			Array.from(container.querySelectorAll('input[type="radio"]')).find(
				(r) => /** @type {HTMLInputElement} */ (r).value === 'other'
			)
		);
		otherRadio.checked = true;
		otherRadio.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		const confirmBtn = /** @type {HTMLButtonElement} */ (
			Array.from(container.querySelectorAll('button')).find((b) =>
				b.textContent?.includes('Suspender cuenta')
			)
		);
		confirmBtn.click();
		flushSync();

		expect(onConfirm).toHaveBeenCalledWith({
			status: 'SUSPENDED',
			includeSubaccounts: false,
			reason: undefined,
			cause: 'other'
		});

		unmount(comp);
	});

	it('en cuenta RESELLER carga subcuentas y muestra casilla desmarcada por defecto', async () => {
		/** @type {any} */ (ClientsService.getSubaccounts).mockResolvedValueOnce([
			{ id: 'sub-1', account_name: 'Subcuenta Alfa', status: 'ACTIVE' },
			{ id: 'sub-2', account_name: 'Subcuenta Beta', status: 'SUSPENDED' }
		]);

		const comp = mount(AccountStatusModal, {
			target: container,
			props: {
				isOpen: true,
				targetStatus: 'SUSPENDED',
				account: {
					id: 'res-1',
					account_name: 'Marca Uno',
					account_type: 'RESELLER',
					status: 'ACTIVE'
				},
				organizationsCount: 2
			}
		});
		flushSync();

		expect(ClientsService.getSubaccounts).toHaveBeenCalledWith('res-1');

		await vi.waitFor(() => {
			expect(normalizedText()).toContain('Aplicar también a sus 2 subcuentas');
		});

		const checkbox = /** @type {HTMLInputElement} */ (
			container.querySelector('input[type="checkbox"]')
		);
		expect(checkbox.checked).toBe(false);

		// Al estar desmarcada, la lista no se ve aún
		expect(normalizedText()).not.toContain('Subcuenta Alfa');

		unmount(comp);
	});

	it('al marcar la casilla en RESELLER lista las subcuentas con su estado y envía includeSubaccounts: true al confirmar', async () => {
		/** @type {any} */ (ClientsService.getSubaccounts).mockResolvedValueOnce([
			{ id: 'sub-1', account_name: 'Subcuenta Alfa', status: 'ACTIVE' },
			{ id: 'sub-2', account_name: 'Subcuenta Beta', status: 'SUSPENDED' }
		]);

		const onConfirm = vi.fn().mockResolvedValue(undefined);

		const comp = mount(AccountStatusModal, {
			target: container,
			props: {
				isOpen: true,
				targetStatus: 'SUSPENDED',
				account: {
					id: 'res-1',
					account_name: 'Marca Uno',
					account_type: 'RESELLER',
					status: 'ACTIVE'
				},
				organizationsCount: 1,
				onConfirm
			}
		});
		flushSync();

		await vi.waitFor(() => {
			expect(normalizedText()).toContain('Aplicar también a sus 2 subcuentas');
		});

		const checkbox = /** @type {HTMLInputElement} */ (
			container.querySelector('input[type="checkbox"]')
		);
		checkbox.checked = true;
		checkbox.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		// Al marcarla lista las subcuentas con su estado
		expect(normalizedText()).toContain('Subcuenta Alfa');
		expect(normalizedText()).toContain('Subcuenta Beta');

		const confirmBtn = /** @type {HTMLButtonElement} */ (
			Array.from(container.querySelectorAll('button')).find((b) =>
				b.textContent?.includes('Suspender cuenta')
			)
		);
		expect(confirmBtn).toBeDefined();

		confirmBtn.click();
		flushSync();

		expect(onConfirm).toHaveBeenCalledWith({
			status: 'SUSPENDED',
			includeSubaccounts: true,
			reason: undefined,
			cause: 'non_payment'
		});

		unmount(comp);
	});

	it('no envía includeSubaccounts si la casilla queda desmarcada', async () => {
		/** @type {any} */ (ClientsService.getSubaccounts).mockResolvedValueOnce([
			{ id: 'sub-1', account_name: 'Subcuenta Alfa', status: 'ACTIVE' }
		]);

		const onConfirm = vi.fn().mockResolvedValue(undefined);

		const comp = mount(AccountStatusModal, {
			target: container,
			props: {
				isOpen: true,
				targetStatus: 'SUSPENDED',
				account: {
					id: 'res-1',
					account_name: 'Marca Uno',
					account_type: 'RESELLER',
					status: 'ACTIVE'
				},
				organizationsCount: 1,
				onConfirm
			}
		});
		flushSync();

		await vi.waitFor(() => {
			expect(normalizedText()).toContain('Aplicar también a sus 1 subcuenta');
		});

		const confirmBtn = /** @type {HTMLButtonElement} */ (
			Array.from(container.querySelectorAll('button')).find((b) =>
				b.textContent?.includes('Suspender cuenta')
			)
		);
		confirmBtn.click();
		flushSync();

		expect(onConfirm).toHaveBeenCalledWith({
			status: 'SUSPENDED',
			includeSubaccounts: false,
			reason: undefined,
			cause: 'non_payment'
		});

		unmount(comp);
	});

	it('avisa al reactivar con casilla marcada y resalta las subcuentas que están SUSPENDED', async () => {
		/** @type {any} */ (ClientsService.getSubaccounts).mockResolvedValueOnce([
			{ id: 'sub-1', account_name: 'Subcuenta Activa', status: 'ACTIVE' },
			{ id: 'sub-2', account_name: 'Subcuenta Suspendida', status: 'SUSPENDED' }
		]);

		const onConfirm = vi.fn().mockResolvedValue(undefined);

		const comp = mount(AccountStatusModal, {
			target: container,
			props: {
				isOpen: true,
				targetStatus: 'ACTIVE',
				account: {
					id: 'res-1',
					account_name: 'Marca Uno',
					account_type: 'RESELLER',
					status: 'SUSPENDED'
				},
				organizationsCount: 2,
				onConfirm
			}
		});
		flushSync();

		await vi.waitFor(() => {
			expect(normalizedText()).toContain('Aplicar también a sus 2 subcuentas');
		});

		const checkbox = /** @type {HTMLInputElement} */ (
			container.querySelector('input[type="checkbox"]')
		);
		checkbox.checked = true;
		checkbox.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		// Advertencia de reactivación
		expect(normalizedText()).toContain(
			'También se reactivarán las subcuentas que estén suspendidas por su propia cuenta'
		);

		// Subcuenta suspendida resaltada con clase text-danger
		const subElements = Array.from(container.querySelectorAll('.max-h-40 > div'));
		expect(subElements.length).toBe(2);

		const suspendedRow = subElements.find((el) => el.textContent?.includes('Subcuenta Suspendida'));
		expect(suspendedRow?.className).toContain('text-danger');
		expect(suspendedRow?.textContent).toContain('SUSPENDED');

		const confirmBtn = /** @type {HTMLButtonElement} */ (
			Array.from(container.querySelectorAll('button')).find((b) =>
				b.textContent?.includes('Reactivar cuenta')
			)
		);
		confirmBtn.click();
		flushSync();

		expect(onConfirm).toHaveBeenCalledWith({
			status: 'ACTIVE',
			includeSubaccounts: true,
			reason: undefined,
			cause: undefined
		});

		unmount(comp);
	});

	it('envía el motivo recortado si se proporciona', async () => {
		const onConfirm = vi.fn().mockResolvedValue(undefined);

		const comp = mount(AccountStatusModal, {
			target: container,
			props: {
				isOpen: true,
				targetStatus: 'SUSPENDED',
				account: {
					id: 'acc-1',
					account_name: 'Cuenta Test',
					account_type: 'CUSTOMER',
					status: 'ACTIVE'
				},
				organizationsCount: 1,
				onConfirm
			}
		});
		flushSync();

		const textarea = /** @type {HTMLTextAreaElement} */ (container.querySelector('textarea'));
		expect(textarea).not.toBeNull();
		textarea.value = '   Falta de pago de octubre   ';
		textarea.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		const confirmBtn = /** @type {HTMLButtonElement} */ (
			Array.from(container.querySelectorAll('button')).find((b) =>
				b.textContent?.includes('Suspender cuenta')
			)
		);
		confirmBtn.click();
		flushSync();

		expect(onConfirm).toHaveBeenCalledWith({
			status: 'SUSPENDED',
			includeSubaccounts: false,
			reason: 'Falta de pago de octubre',
			cause: 'non_payment'
		});

		unmount(comp);
	});

	it('si no carga las subcuentas lo dice y no inventa «0 subcuentas»', async () => {
		/** @type {any} */ (ClientsService.getSubaccounts).mockRejectedValueOnce(new Error('500'));
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const comp = mount(AccountStatusModal, {
			target: container,
			props: {
				isOpen: true,
				targetStatus: 'SUSPENDED',
				account: { id: 'res-1', account_name: 'Marca', account_type: 'RESELLER' },
				organizationsCount: 1
			}
		});
		flushSync();

		await vi.waitFor(() => {
			expect(normalizedText()).toContain('Aplicar también a sus subcuentas');
		});
		expect(normalizedText()).not.toContain('0 subcuentas');

		const checkbox = /** @type {HTMLInputElement} */ (
			container.querySelector('input[type="checkbox"]')
		);
		checkbox.checked = true;
		checkbox.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();
		expect(normalizedText()).toContain('No se pudieron cargar las subcuentas');

		unmount(comp);
	});

	it('una sola subcuenta va en singular', async () => {
		/** @type {any} */ (ClientsService.getSubaccounts).mockResolvedValueOnce([
			{ id: 'sub-1', account_name: 'Única', status: 'ACTIVE' }
		]);

		const comp = mount(AccountStatusModal, {
			target: container,
			props: {
				isOpen: true,
				targetStatus: 'SUSPENDED',
				account: { id: 'res-1', account_name: 'Marca', account_type: 'RESELLER' },
				organizationsCount: 1
			}
		});
		flushSync();

		await vi.waitFor(() => {
			expect(normalizedText()).toContain('Aplicar también a sus 1 subcuenta');
		});
		expect(normalizedText()).not.toContain('1 subcuentas');

		unmount(comp);
	});

	it('si el cambio falla, el diálogo sigue abierto y el rechazo no se escapa', async () => {
		const onConfirm = vi.fn().mockRejectedValue(new Error('La cuenta está borrada'));
		const unhandled = vi.fn();
		process.on('unhandledRejection', unhandled);

		const comp = mount(AccountStatusModal, {
			target: container,
			props: {
				isOpen: true,
				targetStatus: 'SUSPENDED',
				account: { id: 'acc-1', account_name: 'Cliente', account_type: 'CUSTOMER' },
				organizationsCount: 1,
				onConfirm
			}
		});
		flushSync();

		const confirmBtn = /** @type {HTMLButtonElement} */ (
			Array.from(container.querySelectorAll('button')).find((b) =>
				b.textContent?.includes('Suspender cuenta')
			)
		);
		confirmBtn.click();
		await new Promise((r) => setTimeout(r, 0));
		flushSync();

		expect(onConfirm).toHaveBeenCalled();
		expect(normalizedText()).toContain('Causa de la suspensión');
		expect(confirmBtn.disabled).toBe(false);
		expect(unhandled).not.toHaveBeenCalled();

		process.off('unhandledRejection', unhandled);
		unmount(comp);
	});

	it('se cierra al pulsar el botón Cancelar', () => {
		const onClose = vi.fn();

		const comp = mount(AccountStatusModal, {
			target: container,
			props: {
				isOpen: true,
				targetStatus: 'SUSPENDED',
				account: {
					id: 'acc-1',
					account_name: 'Cuenta Test',
					account_type: 'CUSTOMER',
					status: 'ACTIVE'
				},
				organizationsCount: 1,
				onClose
			}
		});
		flushSync();

		const cancelBtn = /** @type {HTMLButtonElement} */ (
			Array.from(container.querySelectorAll('button')).find((b) =>
				b.textContent?.includes('Cancelar')
			)
		);
		cancelBtn.click();
		flushSync();

		expect(onClose).toHaveBeenCalled();
		unmount(comp);
	});
});
