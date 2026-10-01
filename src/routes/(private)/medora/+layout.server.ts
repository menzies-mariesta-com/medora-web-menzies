import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import {
	WebRoutesEnum,
	medoraHospitalHome
} from '$lib/model/enum/routes.enum';
import { RoleEnum } from '$lib/model/enum/db-link';
import { hasAnyAdminViewPermission } from '$lib/server/medora/admin/admin-permission.server';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		const redirectTo = `${url.pathname}${url.search}`;
		throw redirect(
			302,
			`${WebRoutesEnum.LOGIN}?redirectTo=${encodeURIComponent(redirectTo)}`
		);
	}
	if (
		url.pathname === WebRoutesEnum.MEDORA ||
		url.pathname === `${WebRoutesEnum.MEDORA}/`
	) {
		if (locals.userRoleId === RoleEnum.SYSTEM_ADMIN) {
			throw redirect(302, WebRoutesEnum.MEDORA_ADMIN);
		}
		if (
			locals.userRoleId === RoleEnum.ADMIN_TEAM &&
			hasAnyAdminViewPermission(locals.adminPermissions)
		) {
			throw redirect(302, WebRoutesEnum.MEDORA_ADMIN);
		}
		if (
			locals.userRoleId === RoleEnum.STAFF &&
			locals.allowedHospitalIds?.length
		) {
			throw redirect(
				302,
				medoraHospitalHome(locals.allowedHospitalIds[0])
			);
		}
		throw redirect(302, WebRoutesEnum.MEDORA_HOSPITAL);
	}
	return {
		user: locals.user,
		staff: locals.staff ?? null,
		userRoleId: locals.userRoleId ?? null,
		twoFactorEnabled: locals.twoFactorEnabled ?? false,
		allowedHospitalIds: locals.allowedHospitalIds ?? null,
		adminPermissions: locals.adminPermissions ?? undefined
	};
};
