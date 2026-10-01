import type { LayoutServerLoad } from './$types';
import { hasAnyAdminViewPermission } from '$lib/util/admin-permission.util';

export const load: LayoutServerLoad = async ({ locals }) => {
	const userRoleId = locals.userRoleId ?? null;
	const adminPermissions = locals.adminPermissions ?? undefined;
	return {
		user: locals.user,
		staff: locals.staff,
		userRoleId,
		adminPermissions,
		hasAdminDashboardAccess: hasAnyAdminViewPermission(
			userRoleId,
			adminPermissions ?? null
		)
	};
};
