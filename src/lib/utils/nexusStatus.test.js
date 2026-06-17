import { describe, it, expect } from 'vitest';
import { nexusServiceBadge, nexusServiceDetailLine } from './nexusStatus.js';

describe('nexusStatus', () => {
	it('nexusServiceBadge maps active status', () => {
		expect(nexusServiceBadge('active').label).toBe('Servicio activo');
		expect(nexusServiceBadge('inactive').badgeClass).toContain('warning');
	});

	it('nexusServiceDetailLine for inactive account', () => {
		expect(nexusServiceDetailLine({})).toBe('Sin suscripción Nexus vigente');
	});

	it('nexusServiceDetailLine for active subscription', () => {
		const line = nexusServiceDetailLine({
			nexus_service_status: 'active',
			active_plan_name: 'Pro',
			billing_cycle: 'YEARLY',
			active_units: 5,
			expires_at: '2026-12-01T00:00:00.000Z'
		});
		expect(line).toContain('Pro');
		expect(line).toContain('anual');
		expect(line).toContain('5 u.');
	});
});
