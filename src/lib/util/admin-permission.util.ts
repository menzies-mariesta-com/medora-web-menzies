import {
	AdminPageKeyEnum,
	RoleEnum,
	type AdminPermissionAction
} from '$lib/model/enum/db-link';
import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
import type { AdminPagePermissionFlags } from '$lib/model/type/medora/admin-team.type';

export const ADMIN_PAGE_KEYS_CLIENT: AdminPageKeyEnum[] = [
	AdminPageKeyEnum.OVERVIEW,
	AdminPageKeyEnum.OWNERS,
	AdminPageKeyEnum.HOSPITALS,
	AdminPageKeyEnum.STAFF,
	AdminPageKeyEnum.MONITORING,
	AdminPageKeyEnum.ICD,
	AdminPageKeyEnum.TEAM
];

const ACTION_COLUMN: Record<
	AdminPermissionAction,
	'canView' | 'canCreate' | 'canEdit' | 'canDelete'
> = {
	view: 'canView',
	create: 'canCreate',
	edit: 'canEdit',
	delete: 'canDelete'
};

/** Client-safe path → pageKey (mirrors server helper). */
export function adminPathToPageKey(
	pathname: string
): AdminPageKeyEnum | null {
	const path = pathname.replace(/\/$/, '') || '/';
	if (
		path === WebRoutesEnum.MEDORA_ADMIN ||
		path === `${WebRoutesEnum.MEDORA_ADMIN}/`
	) {
		return AdminPageKeyEnum.OVERVIEW;
	}
	if (path.startsWith(WebRoutesEnum.MEDORA_ADMIN_OWNERS)) {
		return AdminPageKeyEnum.OWNERS;
	}
	if (path.startsWith(WebRoutesEnum.MEDORA_ADMIN_HOSPITALS)) {
		return AdminPageKeyEnum.HOSPITALS;
	}
	if (path.startsWith(WebRoutesEnum.MEDORA_ADMIN_STAFF)) {
		return AdminPageKeyEnum.STAFF;
	}
	if (path.startsWith(WebRoutesEnum.MEDORA_ADMIN_MONITORING)) {
		return AdminPageKeyEnum.MONITORING;
	}
	if (path.startsWith(WebRoutesEnum.MEDORA_ADMIN_ICD)) {
		return AdminPageKeyEnum.ICD;
	}
	if (path.startsWith(WebRoutesEnum.MEDORA_ADMIN_TEAM)) {
		return AdminPageKeyEnum.TEAM;
	}
	if (path.startsWith(WebRoutesEnum.MEDORA_ADMIN)) {
		return AdminPageKeyEnum.OVERVIEW;
	}
	return null;
}

export function isAdminShellRole(
	roleId: number | null | undefined
): boolean {
	return (
		roleId === RoleEnum.SYSTEM_ADMIN || roleId === RoleEnum.ADMIN_TEAM
	);
}

export function adminPermissionAllows(
	roleId: number | null | undefined,
	permissions: AdminPagePermissionFlags[] | null | undefined,
	pageKey: AdminPageKeyEnum,
	action: AdminPermissionAction
): boolean {
	if (roleId === RoleEnum.SYSTEM_ADMIN) return true;
	if (roleId !== RoleEnum.ADMIN_TEAM) return false;
	if (
		pageKey === AdminPageKeyEnum.TEAM &&
		action !== 'view'
	) {
		return false;
	}
	const row = (permissions ?? []).find((p) => p.pageKey === pageKey);
	if (!row) return false;
	return Boolean(row[ACTION_COLUMN[action]]);
}

export function hasAnyAdminViewPermission(
	roleId: number | null | undefined,
	permissions: AdminPagePermissionFlags[] | null | undefined
): boolean {
	if (roleId === RoleEnum.SYSTEM_ADMIN) return true;
	if (roleId !== RoleEnum.ADMIN_TEAM) return false;
	return (permissions ?? []).some((p) => p.canView);
}

/** Invite form defaults: overview + monitoring view-only. */
export function defaultAdminInvitePermissions(): AdminPagePermissionFlags[] {
	return ADMIN_PAGE_KEYS_CLIENT.map((pageKey) => {
		const viewOnly =
			pageKey === AdminPageKeyEnum.OVERVIEW ||
			pageKey === AdminPageKeyEnum.MONITORING;
		return {
			pageKey,
			canView: viewOnly,
			canCreate: false,
			canEdit: false,
			canDelete: false
		};
	});
}
