import { RoleEnum } from '$lib/model/enum/db-link';

/**
 * OWNER (hospitals they own), SYSTEM_ADMIN and ADMIN_TEAM (all hospitals) hold
 * absolute permission: no user-group grant, approval assignment or clinical
 * staff-type gate applies to them. Hospital scope is still enforced by
 * `ensureCanAccessHospital`.
 */
export function hasAbsolutePermission(
	roleId: number | null | undefined
): boolean {
	return (
		roleId === RoleEnum.OWNER ||
		roleId === RoleEnum.SYSTEM_ADMIN ||
		roleId === RoleEnum.ADMIN_TEAM
	);
}
