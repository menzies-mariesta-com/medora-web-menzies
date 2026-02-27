import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { hekaHospitalHome, requestPathToDbPageUrl } from '$lib/model/enum/routes.enum';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { RoleEnum } from '$lib/model/enum/db-link';
import type { PageWithRelations } from '$lib/remote/table/information-table/page.remote';
import { and, eq } from 'drizzle-orm';

const COOKIE_SELECTED_USER_GROUP_ID = 'heka_selected_user_group_id';
const COOKIE_SELECTED_BRANCH_ID = 'heka_selected_branch_id';
const BRANCH_ALL_VALUE = '__all__';

/**
 * Load page list for the module bar.
 * - OWNER / SYSTEM_ADMIN: all pages.
 * - STAFF: only pages linked to the **selected** user group (cookie), plus ancestor pages. Restrictions enforced per selection.
 *
 * For STAFF, also enforces page access: if the current URL maps to a page not allowed for the selected group, redirect to hospital home.
 */
export const load: LayoutServerLoad = async ({ locals, url, params, cookies }) => {
	const fullPages = (await ensureDb().query.pageTable.findMany({
		with: {
			module: true,
			status: true,
		},
	})) as unknown as PageWithRelations[];

	const userRoleId = locals.userRoleId ?? null;
	const staffId = locals.staff?.id ?? null;
	const hospitalId = params.hospital_id ?? '';
	const [hospital] = hospitalId
		? await ensureDb()
				.select({ name: table.hospitalTable.name })
				.from(table.hospitalTable)
				.where(eq(table.hospitalTable.id, hospitalId))
				.limit(1)
		: [];
	const currentHospitalName = hospital?.name ?? null;

	// OWNER or SYSTEM_ADMIN: show all pages, no page-level enforcement
	if (userRoleId === RoleEnum.OWNER || userRoleId === RoleEnum.SYSTEM_ADMIN) {
		return {
			pageData: fullPages,
			currentHospitalName,
			staffUserGroupsForNav: [],
			selectedUserGroupId: null,
			staffBranchesForNav: [],
			selectedBranchId: null
		};
	}

	// STAFF: filter by **selected** user group (cookie), enforce access for that group only
	if (userRoleId === RoleEnum.STAFF && staffId) {
		// 1. Staff's user group ids (all)
		const staffUserGroups = await ensureDb()
			.select({ userGroupId: table.staffUserGroupTable.userGroupId })
			.from(table.staffUserGroupTable)
			.where(eq(table.staffUserGroupTable.staffId, staffId));
		const userGroupIds = [...new Set(staffUserGroups.map((r) => r.userGroupId).filter((id) => id != null))];
		if (userGroupIds.length === 0) {
			const dbPageUrl = requestPathToDbPageUrl(url.pathname, hospitalId);
			if (dbPageUrl && dbPageUrl !== '/heka/home') {
				throw redirect(302, hekaHospitalHome(hospitalId));
			}
			return {
				pageData: [],
				currentHospitalName,
				staffUserGroupsForNav: [],
				selectedUserGroupId: null,
				staffBranchesForNav: [],
				selectedBranchId: null
			};
		}

		// Staff's user groups for this hospital (for navbar select)
		const staffUserGroupsForNav = await ensureDb()
			.select({
				id: table.userGroupTable.id,
				name: table.userGroupTable.name
			})
			.from(table.staffUserGroupTable)
			.innerJoin(
				table.userGroupTable,
				eq(table.staffUserGroupTable.userGroupId, table.userGroupTable.id)
			)
			.where(
				and(
					eq(table.staffUserGroupTable.staffId, staffId),
					eq(table.userGroupTable.hospitalId, hospitalId)
				)
			)
			.orderBy(table.userGroupTable.name);

		const navIds = staffUserGroupsForNav.map((g) => g.id);
		// Resolve selected user group: cookie if valid, else first group
		const cookieValue = cookies.get(COOKIE_SELECTED_USER_GROUP_ID);
		const selectedUserGroupId =
			cookieValue != null && navIds.includes(Number(cookieValue))
				? Number(cookieValue)
				: navIds[0] ?? null;

		// Staff branches for this hospital (for navbar select)
		const staffBranchesForNav = await ensureDb()
			.select({
				id: table.hospitalBranchTable.id,
				name: table.hospitalBranchTable.name
			})
			.from(table.staffBranchTable)
			.innerJoin(
				table.hospitalBranchTable,
				eq(table.staffBranchTable.branchId, table.hospitalBranchTable.id)
			)
			.where(
				and(
					eq(table.staffBranchTable.staffId, staffId),
					eq(table.hospitalBranchTable.hospitalId, hospitalId)
				)
			)
			.orderBy(table.hospitalBranchTable.name);
		const allHospitalBranches = await ensureDb()
			.select({ id: table.hospitalBranchTable.id })
			.from(table.hospitalBranchTable)
			.where(eq(table.hospitalBranchTable.hospitalId, hospitalId));
		const allHospitalBranchIds = allHospitalBranches.map((b) => b.id);
		const staffBranchIdSet = new Set(staffBranchesForNav.map((b) => b.id));
		const hasAllBranchesAccess =
			allHospitalBranchIds.length > 0 &&
			allHospitalBranchIds.every((id) => staffBranchIdSet.has(id));
		const staffBranchesForNavWithAll = hasAllBranchesAccess
			? [{ id: BRANCH_ALL_VALUE, name: 'All Branches' }, ...staffBranchesForNav]
			: staffBranchesForNav;
		const branchNavIds = staffBranchesForNavWithAll.map((b) => b.id);
		const branchCookieValue = cookies.get(COOKIE_SELECTED_BRANCH_ID);
		const selectedBranchId =
			branchCookieValue != null && branchNavIds.includes(branchCookieValue)
				? branchCookieValue
				: branchNavIds[0] ?? null;

		// 2. Page ids for the **selected** user group only (restrict pages and restrictions to this group)
		const userGroupPages = await ensureDb()
			.select({ pageId: table.userGroupPageTable.pageId })
			.from(table.userGroupPageTable)
			.where(eq(table.userGroupPageTable.userGroupId, selectedUserGroupId!));
		let allowedPageIds = new Set(userGroupPages.map((r) => r.pageId).filter((id) => id != null));

		// 3. Add ancestor page ids so parent sections appear in nav
		let changed = true;
		while (changed) {
			changed = false;
			for (const p of fullPages) {
				if (allowedPageIds.has(p.id) && p.parentId != null && !allowedPageIds.has(p.parentId)) {
					allowedPageIds.add(p.parentId);
					changed = true;
				}
			}
		}

		// 4. Enforce page access for selected group: current path must be dashboard or an allowed page
		const dbPageUrl = requestPathToDbPageUrl(url.pathname, hospitalId);
		if (dbPageUrl && dbPageUrl !== '/heka/home') {
			const page = fullPages.find((p) => p.pageUrl === dbPageUrl);
			if (page && !allowedPageIds.has(page.id)) {
				throw redirect(302, hekaHospitalHome(hospitalId));
			}
		}

		const filtered = fullPages.filter((p) => allowedPageIds.has(p.id));
		return {
			pageData: filtered,
			currentHospitalName,
			staffUserGroupsForNav,
			selectedUserGroupId,
			staffBranchesForNav: staffBranchesForNavWithAll,
			selectedBranchId
		};
	}

	// Fallback (e.g. no role or no staff): show all
	return {
		pageData: fullPages,
		currentHospitalName,
		staffUserGroupsForNav: [],
		selectedUserGroupId: null,
		staffBranchesForNav: [],
		selectedBranchId: null
	};
};
