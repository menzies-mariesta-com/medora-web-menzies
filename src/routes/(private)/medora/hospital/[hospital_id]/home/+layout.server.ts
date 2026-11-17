import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import {
	medoraHospitalHome,
	requestPathToDbPageUrl
} from '$lib/model/enum/routes.enum';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { RoleEnum } from '$lib/model/enum/db-link';
import type { PageWithRelations } from '$lib/model/type/medora/page.type';
import { and, eq, inArray } from 'drizzle-orm';
import { listStoresForApprovalConfig } from '$lib/server/medora/inventory/approval-config.server';
import { getMedoraPagesForNav } from '$lib/server/medora/page-nav-cache.server';
import { cacheGetOrSet } from '$lib/server/cache/tiered-cache.server';
import {
	cacheKeys,
	hospitalMetaTag
} from '$lib/server/cache/cache-keys.server';
import { withSectionIndexRedirect } from '$lib/server/medora/nav/medora-section-index-redirect.server';
import type { PageGrantMap } from '$lib/server/medora/permission/page-permission.server';
import {
	loadStaffPageGrants,
	toPagePermissionFlags
} from '$lib/server/medora/permission/page-permission.server';
import { hasAbsolutePermission } from '$lib/server/medora/permission/absolute-permission.server';
import { PageActionEnum } from '$lib/model/enum/page-action.enum';
import { loadOwnerEntitlementLayoutFields } from '$lib/server/medora/plan/owner-entitlement-layout.server';
import type { Cookies, RequestEvent } from '@sveltejs/kit';

const COOKIE_SELECTED_USER_GROUP_ID = 'heka_selected_user_group_id';
const COOKIE_SELECTED_BRANCH_ID = 'heka_selected_branch_id';
const COOKIE_SELECTED_INVENTORY_FROM_STORE_ID =
	'heka_selected_inventory_from_store_id';
const BRANCH_ALL_VALUE = '__all__';

function isInventoryOpsPathname(
	pathname: string,
	hid: string
): boolean {
	const base = `/medora/hospital/${hid}/home/inventory`;
	if (pathname === base) return true;
	if (!pathname.startsWith(`${base}/`)) return false;
	return !pathname.includes('inventory-setup');
}

async function inventoryFromStoreNavContext(
	event: RequestEvent,
	hospitalId: string,
	pathname: string,
	cookies: Cookies,
	selectedBranchId: string | null,
	selectedUserGroupId: number | null
): Promise<{
	inventoryFromStoresForNav: {
		id: number;
		storeName: string | null;
		isPurchaseRequisitable: boolean;
	}[];
	selectedInventoryFromStoreId: number | null;
}> {
	if (!hospitalId || !isInventoryOpsPathname(pathname, hospitalId)) {
		return {
			inventoryFromStoresForNav: [],
			selectedInventoryFromStoreId: null
		};
	}
	const raw = await listStoresForApprovalConfig(event, hospitalId, {
		userGroupId: selectedUserGroupId
	});
	let rows = raw;
	if (
		selectedBranchId &&
		selectedBranchId !== BRANCH_ALL_VALUE &&
		raw.length > 0
	) {
		rows = raw.filter(
			(s) => String(s.branchId ?? '') === selectedBranchId
		);
	}
	const list = rows.map((s) => ({
		id: s.id,
		storeName: s.storeName,
		isPurchaseRequisitable: s.isPurchaseRequisitable === true
	}));
	if (list.length === 0) {
		return {
			inventoryFromStoresForNav: [],
			selectedInventoryFromStoreId: null
		};
	}
	const cookieRaw = cookies.get(
		COOKIE_SELECTED_INVENTORY_FROM_STORE_ID
	);
	const cookieNum = cookieRaw != null ? Number(cookieRaw) : NaN;
	const selectedFromCookie =
		Number.isFinite(cookieNum) && list.some((s) => s.id === cookieNum)
			? cookieNum
			: null;
	const selectedInventoryFromStoreId =
		selectedFromCookie ?? list[0]!.id;
	return {
		inventoryFromStoresForNav: list,
		selectedInventoryFromStoreId
	};
}

/**
 * Load page list for the module bar.
 * - OWNER / SYSTEM_ADMIN: all pages.
 * - STAFF: pages linked to any of staff's hospital user groups (from user_group_page),
 *   expanded with ancestors/descendants.
 *
 * For STAFF, also enforces page access: if the current URL maps to a page not allowed for the selected group, redirect to hospital home.
 *
 * Only the page list is fatal. Every other query here is an enrichment: when one
 * fails the shell keeps its module bar and flags `navLoadError` instead of
 * returning `pageData: []` (which silently removed the whole nav until refresh).
 */
export const load: LayoutServerLoad = async (event) => {
	const { locals, url, params, cookies } = event;
	try {
		const hospitalId = params.hospital_id ?? '';
		const userRoleId = locals.userRoleId ?? null;
		const currentUserId = locals.user?.id ?? null;
		const currentUserName =
			locals.user?.name != null &&
			String(locals.user.name).trim() !== ''
				? String(locals.user.name).trim()
				: null;
		const staffId = locals.staff?.id ?? null;

		let navDegraded = false;
		let grantsFailed = false;
		async function safe<T>(
			label: string,
			factory: () => Promise<T>,
			fallback: T,
			onFail?: () => void
		): Promise<T> {
			try {
				return await factory();
			} catch (err) {
				navDegraded = true;
				onFail?.();
				console.error(
					`[medora hospital home] ${label} failed; nav degraded`,
					err
				);
				return fallback;
			}
		}

		const [fullPages, hospitalRow] = await Promise.all([
			getMedoraPagesForNav(),
			hospitalId
				? safe(
						'hospital meta',
						() =>
							cacheGetOrSet({
								key: cacheKeys.hospitalMeta(hospitalId),
								ttlSeconds: 300,
								tags: [hospitalMetaTag(hospitalId)],
								factory: () =>
									ensureDb()
										.select({
											name: table.hospitalTable.name,
											logoUrl: table.hospitalTable.logoUrl,
											countryId: table.hospitalTable.countryId
										})
										.from(table.hospitalTable)
										.where(eq(table.hospitalTable.id, hospitalId))
										.limit(1)
							}),
						[] as {
							name: string | null;
							logoUrl: string | null;
							countryId: number | null;
						}[]
					)
				: Promise.resolve(
						[] as {
							name: string | null;
							logoUrl: string | null;
							countryId: number | null;
						}[]
					)
		]);
		const [hospital] = hospitalRow;
		const currentHospitalName = hospital?.name ?? null;
		const currentHospitalLogoUrl = hospital?.logoUrl ?? null;
		const currentHospitalCountryId = hospital?.countryId ?? null;

		const entitlementFields = await safe(
			'owner entitlement',
			() => loadOwnerEntitlementLayoutFields(hospitalId, userRoleId),
			{
				entitlementPhase: null,
				entitlementRibbonLabel: null,
				entitlementShowRibbon: false,
				ownerWorkspaceReadOnly: false
			}
		);

		// Absolute-permission roles (owner, system admin, admin team): all pages,
		// all branches, no grant matrix for this hospital.
		if (hasAbsolutePermission(userRoleId)) {
			const allHospitalBranches = hospitalId
				? await safe(
						'hospital branches',
						() =>
							ensureDb()
								.select({
									id: table.hospitalBranchTable.id,
									name: table.hospitalBranchTable.name
								})
								.from(table.hospitalBranchTable)
								.where(
									eq(table.hospitalBranchTable.hospitalId, hospitalId)
								)
								.orderBy(table.hospitalBranchTable.name),
						[] as { id: string; name: string | null }[]
					)
				: [];
			const branchCookieValue = cookies.get(
				COOKIE_SELECTED_BRANCH_ID
			);
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

			const invNav = await safe(
				'inventory store nav',
				() =>
					inventoryFromStoreNavContext(
						event,
						hospitalId,
						url.pathname,
						cookies,
						selectedBranchId,
						null
					),
				{
					inventoryFromStoresForNav: [],
					selectedInventoryFromStoreId: null
				}
			);

			return withSectionIndexRedirect(
				hospitalId,
				url.pathname,
				{
					pageData: fullPages,
					currentHospitalName,
					currentHospitalLogoUrl,
					currentHospitalCountryId,
					currentUserId,
					currentUserName,
					staffUserGroupsForNav: [],
					selectedUserGroupId: null,
					staffBranchesForNav,
					selectedBranchId,
					/** All branches the user is allowed to use (this hospital only). For OWNER/SYSTEM_ADMIN = all hospital branches. */
					allowedBranches: allHospitalBranches,
					/** null = unrestricted (owner / system admin). */
					pagePermissions: null,
					currentUserRoleId: userRoleId,
					navLoadError: navDegraded,
					...invNav,
					...entitlementFields
				},
				url.search
			);
		}

		// STAFF: filter by **selected** user group (cookie), enforce access for that group only
		if (userRoleId === RoleEnum.STAFF && staffId) {
			const [
				staffUserGroupsForNavRaw,
				staffBranchesForNavRaw,
				allHospitalBranches
			] = await Promise.all([
				safe(
					'staff user groups',
					() =>
						ensureDb()
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
							.orderBy(table.userGroupTable.name),
					[] as { id: number; name: string | null }[]
				),
				safe(
					'staff branches',
					() =>
						ensureDb()
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
							.orderBy(table.hospitalBranchTable.name),
					[] as { id: string; name: string | null }[]
				),
				safe(
					'all hospital branches',
					() =>
						ensureDb()
							.select({ id: table.hospitalBranchTable.id })
							.from(table.hospitalBranchTable)
							.where(
								eq(table.hospitalBranchTable.hospitalId, hospitalId)
							),
					[] as { id: string }[]
				)
			]);

			const staffUserGroupsForNav = [
				...new Map(
					staffUserGroupsForNavRaw.map((g) => [g.id, g])
				).values()
			].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

			if (staffUserGroupsForNav.length === 0) {
				const dbPageUrl = requestPathToDbPageUrl(
					url.pathname,
					hospitalId
				);
				// A failed group lookup is not "no groups": stay put and offer retry
				// instead of bouncing the user to home on a transient DB error.
				if (
					!navDegraded &&
					dbPageUrl &&
					dbPageUrl !== '/medora/home'
				) {
					throw redirect(302, medoraHospitalHome(hospitalId));
				}
				return {
					pageData: [],
					currentHospitalName,
					currentHospitalLogoUrl,
					currentHospitalCountryId,
					currentUserId,
					currentUserName,
					staffUserGroupsForNav: [],
					selectedUserGroupId: null,
					staffBranchesForNav: [],
					selectedBranchId: null,
					allowedBranches: [],
					pagePermissions: [],
					currentUserRoleId: userRoleId,
					navLoadError: navDegraded,
					inventoryFromStoresForNav: [],
					selectedInventoryFromStoreId: null,
					...entitlementFields
				};
			}

			const navIds = staffUserGroupsForNav.map((g) => g.id);
			// Resolve selected user group: cookie if valid, else first group
			const cookieValue = cookies.get(COOKIE_SELECTED_USER_GROUP_ID);
			const selectedUserGroupId =
				cookieValue != null && navIds.includes(Number(cookieValue))
					? Number(cookieValue)
					: (navIds[0] ?? null);

			const staffBranchesForNav = [
				...new Map(
					staffBranchesForNavRaw.map((b) => [b.id, b])
				).values()
			].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
			const allHospitalBranchIds = allHospitalBranches.map(
				(b) => b.id
			);
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
			const branchNavIds = staffBranchesForNavWithAll.map(
				(b) => b.id
			);
			const branchCookieValue = cookies.get(
				COOKIE_SELECTED_BRANCH_ID
			);
			// Staff with only one branch: always use that branch (no selector); otherwise use cookie or first option
			const selectedBranchId =
				staffBranchesForNav.length === 1
					? staffBranchesForNav[0].id
					: branchCookieValue != null &&
						  branchNavIds.includes(branchCookieValue)
						? branchCookieValue
						: (branchNavIds[0] ?? null);

			// 2. Page ids from all staff user groups in this hospital.
			// `user_group_page` is the source of truth; only `view` opens a page.
			const effectiveGroupIds = staffUserGroupsForNav.map(
				(g) => g.id
			);
			const userGroupPages = await safe(
				'user group page grants',
				() =>
					ensureDb()
						.select({ pageId: table.userGroupPageTable.pageId })
						.from(table.userGroupPageTable)
						.where(
							and(
								eq(
									table.userGroupPageTable.actionCode,
									PageActionEnum.VIEW
								),
								effectiveGroupIds.length > 0
									? inArray(
											table.userGroupPageTable.userGroupId,
											effectiveGroupIds
										)
									: eq(table.userGroupPageTable.userGroupId, -1)
							)
						),
				[] as { pageId: number | null }[],
				() => {
					grantsFailed = true;
				}
			);
			const allowedPageIds = new Set(
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
			if (dbPageUrl && dbPageUrl !== '/medora/home') {
				const page = fullPages.find((p) => p.pageUrl === dbPageUrl);
				if (page && !allowedPageIds.has(page.id)) {
					throw redirect(302, medoraHospitalHome(hospitalId));
				}
			}

			// Grants unavailable (degraded) means "unknown", not "none": keep the full
			// nav rather than filtering every page away, and let the flags gate buttons.
			const filtered = grantsFailed
				? fullPages
				: fullPages.filter((p) => allowedPageIds.has(p.id));
			const pagePermissions = toPagePermissionFlags(
				await safe(
					'staff page grants',
					() => loadStaffPageGrants(staffId, hospitalId),
					{} as PageGrantMap
				),
				filtered
			);
			const invNav = await safe(
				'inventory store nav',
				() =>
					inventoryFromStoreNavContext(
						event,
						hospitalId,
						url.pathname,
						cookies,
						selectedBranchId,
						selectedUserGroupId
					),
				{
					inventoryFromStoresForNav: [],
					selectedInventoryFromStoreId: null
				}
			);
			return withSectionIndexRedirect(
				hospitalId,
				url.pathname,
				{
					pageData: filtered,
					currentHospitalName,
					currentHospitalLogoUrl,
					currentHospitalCountryId,
					currentUserId,
					currentUserName,
					staffUserGroupsForNav,
					selectedUserGroupId,
					staffBranchesForNav: staffBranchesForNavWithAll,
					selectedBranchId,
					/** All branches the user is allowed to use. For STAFF = branches they are assigned to. */
					allowedBranches: staffBranchesForNav,
					pagePermissions,
					currentUserRoleId: userRoleId,
					navLoadError: navDegraded,
					...invNav,
					...entitlementFields
				},
				url.search
			);
		}

		// Fallback (e.g. no role or no staff): show all
		return withSectionIndexRedirect(
			hospitalId,
			url.pathname,
			{
				pageData: fullPages,
				currentHospitalName,
				currentHospitalLogoUrl,
				currentHospitalCountryId,
				currentUserId,
				currentUserName,
				staffUserGroupsForNav: [],
				selectedUserGroupId: null,
				staffBranchesForNav: [],
				selectedBranchId: null,
				allowedBranches: [],
				pagePermissions: null,
				currentUserRoleId: userRoleId,
				navLoadError: navDegraded,
				inventoryFromStoresForNav: [],
				selectedInventoryFromStoreId: null,
				...entitlementFields
			},
			url.search
		);
	} catch (err) {
		// Let SvelteKit redirects/errors bubble up unchanged.
		const maybe = err as Record<string, unknown>;
		if (
			typeof maybe === 'object' &&
			maybe != null &&
			typeof maybe.status === 'number' &&
			typeof maybe.location === 'string'
		) {
			throw err;
		}
		// Also let `error(...)` from authz helpers surface with its own status.
		if (
			typeof maybe === 'object' &&
			maybe != null &&
			typeof maybe.status === 'number'
		) {
			throw err;
		}

		// The nav query itself failed. Surface it instead of returning
		// `pageData: []`, which left the shell with no module bar until refresh.
		console.error('[medora hospital home] nav load failed', err);
		throw err;
	}
};
