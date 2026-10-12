/**
 * Lógica de la tarjeta «Marca y reventa» del detalle de cuenta (B4), sin Svelte.
 *
 * El backend (`/internal/accounts/{id}/capabilities`) es la autoridad: valida el
 * tipo y aplica el techo de los ancestros. Lo de aquí solo decide qué mostrar y
 * qué mandar.
 */

/** Etiqueta y ayuda de cada capability comercial, en el orden en que se muestran. */
export const CAPABILITY_LABELS = {
	white_label_enabled: {
		label: 'Marca propia',
		help: 'La cuenta puede editar y publicar su marca en Nexus.'
	},
	can_resell: {
		label: 'Reventa',
		help: 'La cuenta puede crear subcuentas y administrarlas.'
	},
	max_sub_accounts: {
		label: 'Subcuentas máximas',
		help: 'Cuántas cuentas pueden colgar de esta.'
	},
	max_custom_domains: {
		label: 'Dominios propios máximos',
		help: 'Dominios personalizados verificados (Fase 5).'
	}
};

const ORDER = Object.keys(CAPABILITY_LABELS);

/**
 * Las capabilities en el orden de la tarjeta; las desconocidas, al final.
 * @template {{ code: string }} T
 * @param {T[]} list
 * @returns {T[]}
 */
export function sortCapabilities(list) {
	const rank = (/** @type {string} */ code) => {
		const i = ORDER.indexOf(code);
		return i === -1 ? ORDER.length : i;
	};
	return [...(list || [])].sort(
		(a, b) => rank(a.code) - rank(b.code) || a.code.localeCompare(b.code)
	);
}

/** @param {string} code */
export function capabilityLabel(code) {
	return CAPABILITY_LABELS[/** @type {keyof typeof CAPABILITY_LABELS} */ (code)]?.label ?? code;
}

/** @param {string} code */
export function capabilityHelp(code) {
	return CAPABILITY_LABELS[/** @type {keyof typeof CAPABILITY_LABELS} */ (code)]?.help ?? '';
}

/**
 * Un valor de capability para mostrar.
 * @param {boolean | number | string | null | undefined} value
 */
export function formatCapabilityValue(value) {
	if (value === null || value === undefined) return '—';
	if (typeof value === 'boolean') return value ? 'Sí' : 'No';
	return String(value);
}

/**
 * De dónde sale el valor que rige, en una frase.
 * @param {{ source: string, limited_by?: string | null, expired?: boolean }} capability
 * @param {Record<string, string>} [names] nombres de cuentas por id, si se conocen
 */
export function describeSource(capability, names = {}) {
	if (capability.expired) return 'La fila propia caducó; rige lo heredado.';
	if (capability.source === 'cuenta') return 'Lo fija esta cuenta.';
	if (capability.source === 'default') return 'Nadie lo ha fijado: rige el valor por defecto.';
	if (capability.limited_by) {
		const who = names[capability.limited_by] ?? `la cuenta ${capability.limited_by}`;
		return `Recortado por el techo de ${who}.`;
	}
	return 'Heredado de una cuenta superior.';
}

/**
 * Convierte lo que hay en el editor al valor que espera el backend. El backend
 * no convierte tipos (un `1` no es `true`), así que se convierte aquí.
 * @param {'bool' | 'int' | 'text'} valueType
 * @param {unknown} raw
 * @returns {{ ok: true, value: boolean | number | string } | { ok: false, error: string }}
 */
export function parseCapabilityInput(valueType, raw) {
	if (valueType === 'bool') {
		if (typeof raw === 'boolean') return { ok: true, value: raw };
		return { ok: false, error: 'Elige sí o no.' };
	}
	if (valueType === 'int') {
		const text = String(raw ?? '').trim();
		if (!/^\d+$/.test(text)) return { ok: false, error: 'Escribe un entero de 0 en adelante.' };
		const value = Number(text);
		if (!Number.isSafeInteger(value)) return { ok: false, error: 'El número es demasiado grande.' };
		return { ok: true, value };
	}
	const text = String(raw ?? '').trim();
	if (!text) return { ok: false, error: 'Escribe un valor.' };
	return { ok: true, value: text };
}

/**
 * El valor inicial del editor: el propio si hay fila, si no el efectivo.
 * @param {{ value_type: string, own_value: unknown, effective_value: unknown }} capability
 */
export function initialEditorValue(capability) {
	const base = capability.own_value ?? capability.effective_value;
	if (capability.value_type === 'bool') return base === true;
	if (capability.value_type === 'int')
		return base === null || base === undefined ? '0' : String(base);
	return base === null || base === undefined ? '' : String(base);
}

/**
 * Lo que la tarjeta ofrece hacer con el tipo de cuenta.
 * @param {string | undefined} accountType
 * @returns {{ action: 'to_reseller' | 'to_customer' | null, label: string, isBrand: boolean }}
 */
export function accountTypeAction(accountType) {
	if (accountType === 'RESELLER')
		return { action: 'to_customer', label: 'Regresar a cliente final', isBrand: true };
	if (accountType === 'CUSTOMER' || accountType === undefined || accountType === null)
		return { action: 'to_reseller', label: 'Convertir en marca', isBrand: false };
	// PLATFORM: la cuenta de Geminis no cambia por API.
	return { action: null, label: '', isBrand: false };
}

/**
 * Si la cuenta ya puede usar la pantalla de marca de Nexus: es RESELLER, no
 * tiene padre (la marca es la raíz) y `white_label_enabled` rige en verdadero.
 * @param {{ account_type?: string, parent_account_id?: string | null } | null | undefined} account
 * @param {Array<{ code: string, effective_value: unknown }>} capabilities
 */
export function brandReadiness(account, capabilities) {
	const whiteLabel = (capabilities || []).find((c) => c.code === 'white_label_enabled');
	const steps = [
		{ id: 'type', label: 'Es marca (RESELLER)', done: account?.account_type === 'RESELLER' },
		{ id: 'root', label: 'No cuelga de otra cuenta', done: !account?.parent_account_id },
		{
			id: 'white_label',
			label: 'Marca propia habilitada',
			done: whiteLabel?.effective_value === true
		}
	];
	return { ready: steps.every((s) => s.done), steps };
}
