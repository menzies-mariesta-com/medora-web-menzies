import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
import { RoleEnum } from '$lib/model/enum/db-link';
import {
	adminPathToPageKey,
	hasAnyAdminViewPermission,
	isAdminShellRole,
	permissionAllows
} from '$lib/server/medora/admin/admin-permission.server';
import { COOKIE_SESSION_EXTENDED_FOR } from '$lib/server/medora/auth/session-extend.server';

/** SYSTEM_ADMIN or ADMIN_TEAM (with page view) can access /medora/admin/* */
export const load: LayoutServerLoad = async ({
	locals,
	cookies,
	url
}) => {
	if (!locals.user) {
		const redirectTo = `${url.pathname}${url.search}`;
		throw redirect(
			302,
			`${WebRoutesEnum.LOGIN}?redirectTo=${encodeURIComponent(redirectTo)}`
		);
	}

	const roleId = locals.userRoleId ?? null;
	if (!isAdminShellRole(roleId)) {
		throw redirect(302, WebRoutesEnum.MEDORA_HOSPITAL);
	}

	const permissions = locals.adminPermissions ?? null;

	if (
		roleId === RoleEnum.ADMIN_TEAM &&
		!hasAnyAdminViewPermission(permissions)
	) {
		throw redirect(302, WebRoutesEnum.DEFAULT);
	}

	const pageKey = adminPathToPageKey(url.pathname);
	if (
		pageKey &&
		roleId === RoleEnum.ADMIN_TEAM &&
		!permissionAllows(permissions, pageKey, 'view')
	) {
		const firstViewable =
			permissions?.find((p) => p.canView)?.pageKey ?? null;
		const fallback =
			firstViewable === 'owners'
				? WebRoutesEnum.MEDORA_ADMIN_OWNERS
				: firstViewable === 'hospitals'
					? WebRoutesEnum.MEDORA_ADMIN_HOSPITALS
					: firstViewable === 'staff'
						? WebRoutesEnum.MEDORA_ADMIN_STAFF
						: firstViewable === 'monitoring'
							? WebRoutesEnum.MEDORA_ADMIN_MONITORING
							: firstViewable === 'team'
								? WebRoutesEnum.MEDORA_ADMIN_TEAM
								: WebRoutesEnum.MEDORA_ADMIN;
		throw redirect(302, fallback);
	}

	const sessionId = locals.session?.id ?? null;
	const extendedFor =
		cookies.get(COOKIE_SESSION_EXTENDED_FOR) ?? null;
	return {
		user: locals.user,
		staff: locals.staff ?? null,
		userRoleId: roleId,
		twoFactorEnabled: locals.twoFactorEnabled ?? false,
		adminPermissions: permissions,
		isSystemAdmin: roleId === RoleEnum.SYSTEM_ADMIN,
		sessionId,
		sessionExpiresAt: locals.session?.expiresAt ?? null,
		sessionExtendedOnce: !!sessionId && extendedFor === sessionId
	};
};
