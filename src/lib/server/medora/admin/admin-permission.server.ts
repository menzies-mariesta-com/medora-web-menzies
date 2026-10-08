import { error, type RequestEvent } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import { adminPagePermissionTable } from '$lib/server/db/table/auth-table/auth-table';
import {
	AdminPageKeyEnum,
	RoleEnum,
	type AdminPermissionAction
} from '$lib/model/enum/db-link';
import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
import type { AdminPagePermissionFlags } from '$lib/model/type/medora/admin-team.type';

export const ADMIN_PAGE_KEYS: AdminPageKeyEnum[] = [
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

/** Map `/medora/admin/**` pathname to a permission page key. */
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

/** Sensible invite defaults: overview + monitoring view-only. */
export function defaultAdminInvitePermissions(): AdminPagePermissionFlags[] {
	return ADMIN_PAGE_KEYS.map((pageKey) => {
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

export function normalizePermissionRows(
	rows: AdminPagePermissionFlags[] | null | undefined
): AdminPagePermissionFlags[] {
	const byKey = new Map<string, AdminPagePermissionFlags>();
	for (const row of rows ?? []) {
		const key = String(row.pageKey ?? '').trim();
		if (!ADMIN_PAGE_KEYS.includes(key as AdminPageKeyEnum)) continue;
		byKey.set(key, {
			pageKey: key as AdminPageKeyEnum,
			canView: Boolean(row.canView),
			canCreate: Boolean(row.canCreate),
			canEdit: Boolean(row.canEdit),
			canDelete: Boolean(row.canDelete)
		});
	}
	return ADMIN_PAGE_KEYS.map((pageKey) => {
		const existing = byKey.get(pageKey);
		if (existing) return existing;
		return {
			pageKey,
			canView: false,
			canCreate: false,
			canEdit: false,
			canDelete: false
		};
	});
}

export async function loadAdminPagePermissions(
	userId: string
): Promise<AdminPagePermissionFlags[]> {
	const rows = await ensureDb()
		.select({
			pageKey: adminPagePermissionTable.pageKey,
			canView: adminPagePermissionTable.canView,
			canCreate: adminPagePermissionTable.canCreate,
			canEdit: adminPagePermissionTable.canEdit,
			canDelete: adminPagePermissionTable.canDelete
		})
		.from(adminPagePermissionTable)
		.where(eq(adminPagePermissionTable.userId, userId));
	return normalizePermissionRows(rows);
}

export function permissionAllows(
	permissions: AdminPagePermissionFlags[] | null | undefined,
	pageKey: AdminPageKeyEnum,
	action: AdminPermissionAction
): boolean {
	const row = (permissions ?? []).find((p) => p.pageKey === pageKey);
	if (!row) return false;
	return Boolean(row[ACTION_COLUMN[action]]);
}

export function hasAnyAdminViewPermission(
	permissions: AdminPagePermissionFlags[] | null | undefined
): boolean {
	return (permissions ?? []).some((p) => p.canView);
}

/**
 * SYSTEM_ADMIN: always allowed.
 * ADMIN_TEAM: must have the matching flag for pageKey.
 * Team management mutations (create/edit/delete on TEAM): SYSTEM_ADMIN only.
 */
export async function requireAdminPagePermission(
	event: RequestEvent,
	pageKey: AdminPageKeyEnum,
	action: AdminPermissionAction
): Promise<void> {
	if (!event.locals.user) throw error(401, 'Unauthorized');
	const roleId = event.locals.userRoleId ?? null;

	if (roleId === RoleEnum.SYSTEM_ADMIN) return;

	if (roleId !== RoleEnum.ADMIN_TEAM) {
		throw error(403, 'Forbidden');
	}

	if (
		pageKey === AdminPageKeyEnum.TEAM &&
		action !== 'view'
	) {
		throw error(403, 'Only system admin can manage the admin team');
	}

	let permissions = event.locals.adminPermissions ?? null;
	if (permissions == null) {
		permissions = await loadAdminPagePermissions(event.locals.user.id);
		event.locals.adminPermissions = permissions;
	}

	if (!permissionAllows(permissions, pageKey, action)) {
		throw error(403, `Missing ${action} permission for ${pageKey}`);
	}
}

export async function replaceAdminPagePermissions(
	userId: string,
	permissions: AdminPagePermissionFlags[]
): Promise<AdminPagePermissionFlags[]> {
	const normalized = normalizePermissionRows(permissions);
	const db = ensureDb();
	await db
		.delete(adminPagePermissionTable)
		.where(eq(adminPagePermissionTable.userId, userId));

	const toInsert = normalized.filter(
		(p) => p.canView || p.canCreate || p.canEdit || p.canDelete
	);
	if (toInsert.length > 0) {
		await db.insert(adminPagePermissionTable).values(
			toInsert.map((p) => ({
				userId,
				pageKey: String(p.pageKey),
				canView: p.canView,
				canCreate: p.canCreate,
				canEdit: p.canEdit,
				canDelete: p.canDelete
			}))
		);
	}
	return normalized;
}

export async function getAdminPagePermissionRow(
	userId: string,
	pageKey: AdminPageKeyEnum
): Promise<AdminPagePermissionFlags | null> {
	const [row] = await ensureDb()
		.select({
			pageKey: adminPagePermissionTable.pageKey,
			canView: adminPagePermissionTable.canView,
			canCreate: adminPagePermissionTable.canCreate,
			canEdit: adminPagePermissionTable.canEdit,
			canDelete: adminPagePermissionTable.canDelete
		})
		.from(adminPagePermissionTable)
		.where(
			and(
				eq(adminPagePermissionTable.userId, userId),
				eq(adminPagePermissionTable.pageKey, pageKey)
			)
		)
		.limit(1);
	if (!row) return null;
	return {
		pageKey: row.pageKey as AdminPageKeyEnum,
		canView: row.canView,
		canCreate: row.canCreate,
		canEdit: row.canEdit,
		canDelete: row.canDelete
	};
}
