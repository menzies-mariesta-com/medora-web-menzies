import { error, type RequestEvent } from '@sveltejs/kit';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { RoleEnum, StatusEnum } from '$lib/model/enum/db-link';
import { PageActionEnum } from '$lib/model/enum/page-action.enum';
import type { PagePermissionFlags } from '$lib/model/type/medora/page-permission.type';
import { hasAbsolutePermission } from '$lib/server/medora/permission/absolute-permission.server';
import {
	cacheKeys,
	cacheTags
} from '$lib/server/cache/cache-keys.server';
import {
	cacheGet,
	cacheSet,
	invalidateCacheTag
} from '$lib/server/cache/tiered-cache.server';

const TTL_SECONDS = 120;

export type PageGrantMap = Record<number, PageActionEnum[]>;

/**
 * Effective grants for the signed-in staff member: the **union** of every user
 * group they hold in this hospital, same rule the nav layout uses.
 */
async function loadGrantsFromDb(
	staffId: string,
	hospitalId: string
): Promise<PageGrantMap> {
	const rows = await ensureDb()
		.select({
			pageId: table.userGroupPageTable.pageId,
			actionCode: table.userGroupPageTable.actionCode
		})
		.from(table.userGroupPageTable)
		.innerJoin(
			table.staffUserGroupTable,
			eq(
				table.staffUserGroupTable.userGroupId,
				table.userGroupPageTable.userGroupId
			)
		)
		.innerJoin(
			table.userGroupTable,
			eq(
				table.userGroupTable.id,
				table.userGroupPageTable.userGroupId
			)
		)
		.where(
			and(
				eq(table.staffUserGroupTable.staffId, staffId),
				eq(table.userGroupTable.hospitalId, hospitalId),
				ne(table.userGroupTable.statusId, StatusEnum.DELETED)
			)
		);

	const byPage: PageGrantMap = {};
	for (const row of rows) {
		if (row.pageId == null) continue;
		const list = byPage[row.pageId] ?? [];
		if (!list.includes(row.actionCode as PageActionEnum)) {
			list.push(row.actionCode as PageActionEnum);
		}
		byPage[row.pageId] = list;
	}
	return byPage;
}

/** Cached grants, keyed per staff + hospital. Writes invalidate the whole tag. */
export async function loadStaffPageGrants(
	staffId: string,
	hospitalId: string
): Promise<PageGrantMap> {
	const key = cacheKeys.staffPagePermissions(staffId, hospitalId);
	const cached = await cacheGet<PageGrantMap>(key);
	if (cached) return cached;
	const grants = await loadGrantsFromDb(staffId, hospitalId);
	await cacheSet(key, grants, TTL_SECONDS, [
		cacheTags.staffPagePermissions
	]);
	return grants;
}

/** Drop cached grants for every staff member (called after the matrix is saved). */
export async function invalidateStaffPageGrants(): Promise<void> {
	await invalidateCacheTag(cacheTags.staffPagePermissions);
}

/**
 * Grants shaped for the client: `{ pageUrl, actions[] }` for the pages the user
 * may open. Used by the hospital-home layout to gate buttons.
 */
export function toPagePermissionFlags(
	grants: PageGrantMap,
	pages: { id: number; pageUrl: string | null }[]
): PagePermissionFlags[] {
	return pages.flatMap((page) => {
		const actions = grants[page.id];
		if (!page.pageUrl || !actions?.length) return [];
		return [{ pageUrl: page.pageUrl, actions: [...actions] }];
	});
}

/**
 * Fails closed: STAFF without a matching grant gets 403. OWNER / SYSTEM_ADMIN /
 * ADMIN_TEAM pass (absolute permission). `staff.isSuperAdmin` deliberately does
 * **not** bypass — it is a registration flag, not an authorization role.
 */
export async function requirePageAction(
	event: RequestEvent,
	input: {
		hospitalId: string;
		pageUrls: string[];
		action: PageActionEnum | null;
	}
): Promise<void> {
	const roleId = event.locals.userRoleId ?? null;
	if (roleId === null) throw error(401, 'Unauthorized');
	if (hasAbsolutePermission(roleId)) return;

	if (roleId !== RoleEnum.STAFF) throw error(403, 'Forbidden');
	// null = route only needs a signed-in staff member (home landing, shared lookups).
	if (input.action === null) return;

	const staffId = event.locals.staff?.id ?? null;
	if (!staffId) throw error(403, 'Forbidden');

	const pages = await ensureDb()
		.select({
			id: table.pageTable.id,
			pageUrl: table.pageTable.pageUrl
		})
		.from(table.pageTable)
		.where(inArray(table.pageTable.pageUrl, input.pageUrls));
	const pageIds = pages.map((page) => page.id);
	if (pageIds.length === 0) throw error(403, 'Unknown page');

	const grants = await loadStaffPageGrants(staffId, input.hospitalId);
	const allowed = pageIds.some((pageId) =>
		(grants[pageId] ?? []).includes(input.action as PageActionEnum)
	);
	if (!allowed) {
		throw error(
			403,
			`Missing ${input.action} permission for this page`
		);
	}
}
