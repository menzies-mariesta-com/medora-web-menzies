import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import {
	hekaHospitalHome,
	requestPathToDbPageUrl
} from '$lib/model/enum/routes.enum';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { RoleEnum } from '$lib/model/enum/db-link';
import type { PageWithRelations } from '$lib/remote/table/information-table/page.remote';
import { and, eq, inArray } from 'drizzle-orm';

const COOKIE_SELECTED_USER_GROUP_ID = 'heka_selected_user_group_id';
const COOKIE_SELECTED_BRANCH_ID = 'heka_selected_branch_id';
const BRANCH_ALL_VALUE = '__all__';

/**
 * Load page list for the module bar.
 * - OWNER / SYSTEM_ADMIN: all pages.
 * - STAFF: pages linked to any of staff's hospital user groups (from user_group_page),
 *   expanded with ancestors/descendants.
 *
 * For STAFF, also enforces page access: if the current URL maps to a page not allowed for the selected group, redirect to hospital home.
 */
export const load: LayoutServerLoad = async ({
	locals,
	url,
	params,
	cookies
}) => {
	const fullPages = (await ensureDb().query.pageTable.findMany({
		with: {
			module: true,
			status: true
		}
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

	// OWNER or SYSTEM_ADMIN: show all pages, all branches for this hospital
	if (
		userRoleId === RoleEnum.OWNER ||
		userRoleId === RoleEnum.SYSTEM_ADMIN
	) {
		const allHospitalBranches = hospitalId
			? await ensureDb()
					.select({
						id: table.hospitalBranchTable.id,
						name: table.hospitalBranchTable.name
					})
					.from(table.hospitalBranchTable)
					.where(eq(table.hospitalBranchTable.hospitalId, hospitalId))
					.orderBy(table.hospitalBranchTable.name)
			: [];
		const branchCookieValue = cookies.get(COOKIE_SELECTED_BRANCH_ID);
		const branchIds = allHospitalBranches.map((b) => b.id);
		const hasBranches = allHospitalBranches.length > 0;
		const staffBranchesForNav = hasBranches
			? [
					{ id: BRANCH_ALL_VALUE, name: 'All Branches' },
					...allHospitalBranches
				]
			: [];
		const selectedBranchId =
			hasBranches &&
			branchCookieValue != null &&
			(branchCookieValue === BRANCH_ALL_VALUE ||
				branchIds.includes(branchCookieValue))
				? branchCookieValue
				: hasBranches
					? (staffBranchesForNav[0]?.id ?? null)
					: null;

		return {
			pageData: fullPages,
			currentHospitalName,
			staffUserGroupsForNav: [],
			selectedUserGroupId: null,
			staffBranchesForNav,
			selectedBranchId,
			/** All branches the user is allowed to use (this hospital only). For OWNER/SYSTEM_ADMIN = all hospital branches. */
			allowedBranches: allHospitalBranches
		};
	}

	// STAFF: filter by **selected** user group (cookie), enforce access for that group only
	if (userRoleId === RoleEnum.STAFF && staffId) {
		// 1. Staff's user group ids (all)
		const staffUserGroups = await ensureDb()
			.select({ userGroupId: table.staffUserGroupTable.userGroupId })
			.from(table.staffUserGroupTable)
			.where(eq(table.staffUserGroupTable.staffId, staffId));
		const userGroupIds = [
			...new Set(
				staffUserGroups
					.map((r) => r.userGroupId)
					.filter((id) => id != null)
			)
		];
		if (userGroupIds.length === 0) {
			const dbPageUrl = requestPathToDbPageUrl(
				url.pathname,
				hospitalId
			);
			if (dbPageUrl && dbPageUrl !== '/heka/home') {
				throw redirect(302, hekaHospitalHome(hospitalId));
			}
			return {
				pageData: [],
				currentHospitalName,
				staffUserGroupsForNav: [],
				selectedUserGroupId: null,
				staffBranchesForNav: [],
				selectedBranchId: null,
				allowedBranches: []
			};
		}

		// Staff's user groups for this hospital (for navbar select)
		// Deduplicate by id in case staff_user_group has duplicate entries
		const staffUserGroupsForNavRaw = await ensureDb()
			.select({
				id: table.userGroupTable.id,
				name: table.userGroupTable.name
			})
			.from(table.staffUserGroupTable)
			.innerJoin(
				table.userGroupTable,
				eq(
					table.staffUserGroupTable.userGroupId,
					table.userGroupTable.id
				)
			)
			.where(
				and(
					eq(table.staffUserGroupTable.staffId, staffId),
					eq(table.userGroupTable.hospitalId, hospitalId)
				)
			)
			.orderBy(table.userGroupTable.name);
		const staffUserGroupsForNav = [
			...new Map(
				staffUserGroupsForNavRaw.map((g) => [g.id, g])
			).values()
		].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

		const navIds = staffUserGroupsForNav.map((g) => g.id);
		// Resolve selected user group: cookie if valid, else first group
		const cookieValue = cookies.get(COOKIE_SELECTED_USER_GROUP_ID);
		const selectedUserGroupId =
			cookieValue != null && navIds.includes(Number(cookieValue))
				? Number(cookieValue)
				: (navIds[0] ?? null);

		// Staff branches for this hospital (for navbar select)
		// Deduplicate by id in case staff_branch has duplicate entries
		const staffBranchesForNavRaw = await ensureDb()
			.select({
				id: table.hospitalBranchTable.id,
				name: table.hospitalBranchTable.name
			})
			.from(table.staffBranchTable)
			.innerJoin(
				table.hospitalBranchTable,
				eq(
					table.staffBranchTable.branchId,
					table.hospitalBranchTable.id
				)
			)
			.where(
				and(
					eq(table.staffBranchTable.staffId, staffId),
					eq(table.hospitalBranchTable.hospitalId, hospitalId)
				)
			)
			.orderBy(table.hospitalBranchTable.name);
		const staffBranchesForNav = [
			...new Map(
				staffBranchesForNavRaw.map((b) => [b.id, b])
			).values()
		].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
		const allHospitalBranches = await ensureDb()
			.select({ id: table.hospitalBranchTable.id })
			.from(table.hospitalBranchTable)
			.where(eq(table.hospitalBranchTable.hospitalId, hospitalId));
		const allHospitalBranchIds = allHospitalBranches.map((b) => b.id);
		const staffBranchIdSet = new Set(
			staffBranchesForNav.map((b) => b.id)
		);
		const hasAllBranchesAccess =
			allHospitalBranchIds.length > 0 &&
			allHospitalBranchIds.every((id) => staffBranchIdSet.has(id));
		const staffBranchesForNavWithAll = hasAllBranchesAccess
			? [
					{ id: BRANCH_ALL_VALUE, name: 'All Branches' },
					...staffBranchesForNav
				]
			: staffBranchesForNav;
		const branchNavIds = staffBranchesForNavWithAll.map((b) => b.id);
		const branchCookieValue = cookies.get(COOKIE_SELECTED_BRANCH_ID);
		// Staff with only one branch: always use that branch (no selector); otherwise use cookie or first option
		const selectedBranchId =
			staffBranchesForNav.length === 1
				? staffBranchesForNav[0].id
				: branchCookieValue != null &&
					  branchNavIds.includes(branchCookieValue)
					? branchCookieValue
					: (branchNavIds[0] ?? null);

		// 2. Page ids from all staff user groups in this hospital.
		// Use user_group_page as source of truth for allowed pages.
		const effectiveGroupIds = staffUserGroupsForNav.map((g) => g.id);
		const userGroupPages = await ensureDb()
			.select({ pageId: table.userGroupPageTable.pageId })
			.from(table.userGroupPageTable)
			.where(
				effectiveGroupIds.length > 0
					? inArray(
							table.userGroupPageTable.userGroupId,
							effectiveGroupIds
						)
					: eq(table.userGroupPageTable.userGroupId, -1)
			);
		let allowedPageIds = new Set(
			userGroupPages.map((r) => r.pageId).filter((id) => id != null)
		);

		// 3. Expand page ids recursively to include:
		// - ancestors (so parent sections appear in nav)
		// - descendants (so assigning a parent grants all nested sub-pages)
		const byId = new Map(fullPages.map((p) => [p.id, p] as const));
		const childrenByParent = new Map<number, number[]>();
		for (const p of fullPages) {
			if (p.parentId == null) continue;
			const list = childrenByParent.get(p.parentId) ?? [];
			list.push(p.id);
			childrenByParent.set(p.parentId, list);
		}

		// Add all ancestors for currently allowed pages.
		const ancestorQueue = Array.from(allowedPageIds);
		while (ancestorQueue.length > 0) {
			const id = ancestorQueue.pop()!;
			const page = byId.get(id);
			const parentId = page?.parentId ?? null;
			if (parentId != null && !allowedPageIds.has(parentId)) {
				allowedPageIds.add(parentId);
				ancestorQueue.push(parentId);
			}
		}

		// Add all descendants for currently allowed pages.
		const descendantQueue = Array.from(allowedPageIds);
		while (descendantQueue.length > 0) {
			const id = descendantQueue.pop()!;
			const children = childrenByParent.get(id) ?? [];
			for (const childId of children) {
				if (!allowedPageIds.has(childId)) {
					allowedPageIds.add(childId);
					descendantQueue.push(childId);
				}
			}
		}

		// 4. Enforce page access: current path must be dashboard or an allowed page
		const dbPageUrl = requestPathToDbPageUrl(
			url.pathname,
			hospitalId
		);
		if (dbPageUrl && dbPageUrl !== '/heka/home') {
			const page = fullPages.find((p) => p.pageUrl === dbPageUrl);
			if (page && !allowedPageIds.has(page.id)) {
				throw redirect(302, hekaHospitalHome(hospitalId));
			}
		}

		const filtered = fullPages.filter((p) =>
			allowedPageIds.has(p.id)
		);
		return {
			pageData: filtered,
			currentHospitalName,
			staffUserGroupsForNav,
			selectedUserGroupId,
			staffBranchesForNav: staffBranchesForNavWithAll,
			selectedBranchId,
			/** All branches the user is allowed to use. For STAFF = branches they are assigned to. */
			allowedBranches: staffBranchesForNav
		};
	}

	// Fallback (e.g. no role or no staff): show all
	return {
		pageData: fullPages,
		currentHospitalName,
		staffUserGroupsForNav: [],
		selectedUserGroupId: null,
		staffBranchesForNav: [],
		selectedBranchId: null,
		allowedBranches: []
	};
};
