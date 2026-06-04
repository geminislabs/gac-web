/**
 * @param {'active' | 'inactive' | string | null | undefined} status
 * @returns {{ label: string, badgeClass: string }}
 */
export function nexusServiceBadge(status) {
	if (status === 'active') {
		return { label: 'Servicio activo', badgeClass: 'gac-badge gac-badge-success' };
	}
	return { label: 'Sin servicio activo', badgeClass: 'gac-badge gac-badge-warning' };
}

/**
 * @param {any} accountOrOrg
 * @returns {string}
 */
export function nexusServiceDetailLine(accountOrOrg) {
	if (accountOrOrg?.nexus_service_status !== 'active') {
		return 'Sin suscripción Nexus vigente';
	}
	const plan = accountOrOrg.active_plan_name || accountOrOrg.active_plan_code || 'Plan';
	const cycle = accountOrOrg.billing_cycle === 'YEARLY' ? 'anual' : 'mensual';
	const units = accountOrOrg.active_units != null ? ` · ${accountOrOrg.active_units} u.` : '';
	const expires = accountOrOrg.expires_at
		? ` · vence ${new Date(accountOrOrg.expires_at).toLocaleDateString()}`
		: '';
	return `${plan} (${cycle})${units}${expires}`;
}
