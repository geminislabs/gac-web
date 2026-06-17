import { describe, it, expect } from 'vitest';
import {
	getUserRoles,
	isAdmin,
	canAccessNexus,
	canManageInternalUsers,
	canAccessCommerce,
	canWriteNexus,
	isViewerOnly,
	pathRequiresNexusAccess,
	pathRequiresAdmin
} from './roles.js';

describe('roles', () => {
	it('getUserRoles returns empty for missing user', () => {
		expect(getUserRoles(null)).toEqual([]);
	});

	it('getUserRoles normalizes role strings', () => {
		expect(getUserRoles({ roles: ['admin', 'viewer'] })).toEqual(['admin', 'viewer']);
	});

	it('isAdmin detects admin role', () => {
		expect(isAdmin({ roles: ['admin'] })).toBe(true);
		expect(isAdmin({ roles: ['viewer'] })).toBe(false);
	});

	it('nexus and internal users require admin', () => {
		const admin = { roles: ['admin'] };
		const viewer = { roles: ['viewer'] };
		expect(canAccessNexus(admin)).toBe(true);
		expect(canWriteNexus(admin)).toBe(true);
		expect(canManageInternalUsers(admin)).toBe(true);
		expect(canAccessNexus(viewer)).toBe(false);
	});

	it('commerce requires any authenticated user', () => {
		expect(canAccessCommerce({ roles: ['viewer'] })).toBe(true);
		expect(canAccessCommerce(null)).toBe(false);
	});

	it('isViewerOnly excludes admin and user roles', () => {
		expect(isViewerOnly({ roles: ['viewer'] })).toBe(true);
		expect(isViewerOnly({ roles: ['viewer', 'admin'] })).toBe(false);
		expect(isViewerOnly({ roles: ['viewer', 'user'] })).toBe(false);
	});

	it('pathRequiresNexusAccess matches nexus routes', () => {
		expect(pathRequiresNexusAccess('/products/nexus/clients')).toBe(true);
		expect(pathRequiresNexusAccess('/products/plans')).toBe(true);
		expect(pathRequiresNexusAccess('/admin/orders')).toBe(false);
	});

	it('pathRequiresAdmin matches internal users route', () => {
		expect(pathRequiresAdmin('/admin/internal-users')).toBe(true);
		expect(pathRequiresAdmin('/admin/orders')).toBe(false);
	});
});
