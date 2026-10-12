import { describe, it, expect } from 'vitest';
import {
	accountTypeAction,
	brandReadiness,
	capabilityHelp,
	capabilityLabel,
	describeSource,
	formatCapabilityValue,
	initialEditorValue,
	parseCapabilityInput,
	sortCapabilities
} from './accountBrand.js';

describe('parseCapabilityInput: el backend no convierte tipos, así que se convierte aquí', () => {
	it('bool: solo un booleano real', () => {
		expect(parseCapabilityInput('bool', true)).toEqual({ ok: true, value: true });
		expect(parseCapabilityInput('bool', false)).toEqual({ ok: true, value: false });
		expect(parseCapabilityInput('bool', 'true').ok).toBe(false);
		expect(parseCapabilityInput('bool', 1).ok).toBe(false);
	});

	it('int: enteros de 0 en adelante, desde el texto del input', () => {
		expect(parseCapabilityInput('int', '25')).toEqual({ ok: true, value: 25 });
		expect(parseCapabilityInput('int', ' 0 ')).toEqual({ ok: true, value: 0 });
		for (const malo of ['-1', '2.5', 'diez', '', '1e3', null]) {
			expect(parseCapabilityInput('int', malo).ok).toBe(false);
		}
		expect(parseCapabilityInput('int', '9'.repeat(20))).toEqual({
			ok: false,
			error: 'El número es demasiado grande.'
		});
	});

	it('text: no vacío, recortado', () => {
		expect(parseCapabilityInput('text', '  abierto ')).toEqual({ ok: true, value: 'abierto' });
		expect(parseCapabilityInput('text', '   ').ok).toBe(false);
	});
});

describe('initialEditorValue', () => {
	it('usa el valor propio si hay fila', () => {
		expect(initialEditorValue({ value_type: 'int', own_value: 10, effective_value: 3 })).toBe('10');
	});

	it('sin fila, parte del valor que rige', () => {
		expect(initialEditorValue({ value_type: 'bool', own_value: null, effective_value: true })).toBe(
			true
		);
		expect(initialEditorValue({ value_type: 'int', own_value: null, effective_value: null })).toBe(
			'0'
		);
		expect(initialEditorValue({ value_type: 'text', own_value: null, effective_value: null })).toBe(
			''
		);
	});
});

describe('describeSource', () => {
	it('distingue cuenta, default, recorte y caducidad', () => {
		expect(describeSource({ source: 'cuenta' })).toBe('Lo fija esta cuenta.');
		expect(describeSource({ source: 'default' })).toMatch(/valor por defecto/);
		expect(
			describeSource({ source: 'ancestro', limited_by: 'acc-1' }, { 'acc-1': 'Geminis' })
		).toBe('Recortado por el techo de Geminis.');
		expect(describeSource({ source: 'ancestro', limited_by: 'acc-9' })).toBe(
			'Recortado por el techo de la cuenta acc-9.'
		);
		expect(describeSource({ source: 'ancestro' })).toBe('Heredado de una cuenta superior.');
		expect(describeSource({ source: 'cuenta', expired: true })).toMatch(/caducó/);
	});
});

describe('accountTypeAction', () => {
	it('CUSTOMER ofrece convertir en marca', () => {
		expect(accountTypeAction('CUSTOMER')).toEqual({
			action: 'to_reseller',
			label: 'Convertir en marca',
			isBrand: false
		});
	});

	it('RESELLER ofrece regresar a cliente final', () => {
		expect(accountTypeAction('RESELLER').action).toBe('to_customer');
		expect(accountTypeAction('RESELLER').isBrand).toBe(true);
	});

	it('PLATFORM no ofrece nada: no cambia por API', () => {
		expect(accountTypeAction('PLATFORM').action).toBeNull();
	});

	it('un backend sin account_type cuenta como cliente', () => {
		expect(accountTypeAction(undefined).action).toBe('to_reseller');
	});
});

describe('brandReadiness: cuándo el owner ve «Marca» en Nexus', () => {
	const conMarca = [{ code: 'white_label_enabled', effective_value: true }];

	it('lista con las tres condiciones', () => {
		const r = brandReadiness({ account_type: 'RESELLER', parent_account_id: null }, conMarca);
		expect(r.ready).toBe(true);
	});

	it('RESELLER sin white_label efectivo no basta', () => {
		const r = brandReadiness({ account_type: 'RESELLER', parent_account_id: null }, [
			{ code: 'white_label_enabled', effective_value: false }
		]);
		expect(r.ready).toBe(false);
		expect(r.steps.find((s) => s.id === 'white_label')?.done).toBe(false);
	});

	it('una subcuenta no es marca aunque tenga todo lo demás', () => {
		const r = brandReadiness({ account_type: 'RESELLER', parent_account_id: 'padre' }, conMarca);
		expect(r.ready).toBe(false);
		expect(r.steps.find((s) => s.id === 'root')?.done).toBe(false);
	});

	it('CUSTOMER no está lista', () => {
		expect(brandReadiness({ account_type: 'CUSTOMER' }, conMarca).ready).toBe(false);
		expect(brandReadiness(null, []).ready).toBe(false);
	});
});

describe('presentación', () => {
	it('ordena como la tarjeta y deja las desconocidas al final', () => {
		const ordenadas = sortCapabilities([
			{ code: 'max_custom_domains' },
			{ code: 'zzz_nueva' },
			{ code: 'white_label_enabled' },
			{ code: 'can_resell' }
		]).map((c) => c.code);
		expect(ordenadas).toEqual([
			'white_label_enabled',
			'can_resell',
			'max_custom_domains',
			'zzz_nueva'
		]);
		expect(sortCapabilities(undefined)).toEqual([]);
	});

	it('etiquetas y valores', () => {
		expect(capabilityLabel('white_label_enabled')).toBe('Marca propia');
		expect(capabilityLabel('desconocida')).toBe('desconocida');
		expect(capabilityHelp('desconocida')).toBe('');
		expect(formatCapabilityValue(true)).toBe('Sí');
		expect(formatCapabilityValue(false)).toBe('No');
		expect(formatCapabilityValue(0)).toBe('0');
		expect(formatCapabilityValue(null)).toBe('—');
	});
});
