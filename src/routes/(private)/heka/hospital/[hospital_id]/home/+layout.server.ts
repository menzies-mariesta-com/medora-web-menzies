import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { hekaHospitalHome, requestPathToDbPageUrl } from '$lib/model/enum/routes.enum';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { RoleEnum } from '$lib/model/enum/db-link';
import type { PageWithRelations } from '$lib/remote/table/information-table/page.remote';
import { eq, inArray } from 'drizzle-orm';

/**
 * Load page list for the module bar.
 * - OWNER / SYSTEM_ADMIN: all pages.
 * - STAFF: only pages linked to the staff's user groups (via user_group_page), plus ancestor pages so sections show.
 *
 * For STAFF, also enforces page access: if the current URL maps to a page the staff is not allowed, redirect to hospital home.
 */
export const load: LayoutServerLoad = async ({ locals, url, params }) => {
	const fullPages = (await ensureDb().query.pageTable.findMany({
		with: {
			module: true,
			status: true,
		},
	})) as unknown as PageWithRelations[];

	const userRoleId = locals.userRoleId ?? null;
	const staffId = locals.staff?.id ?? null;
	const hospitalId = params.hospital_id ?? '';

	// OWNER or SYSTEM_ADMIN: show all pages, no page-level enforcement
	if (userRoleId === RoleEnum.OWNER || userRoleId === RoleEnum.SYSTEM_ADMIN) {
		return { pageData: fullPages };
	}

	// STAFF: filter by user group page assignments and enforce access
	if (userRoleId === RoleEnum.STAFF && staffId) {
		// 1. Staff's user group ids
		const staffUserGroups = await ensureDb()
			.select({ userGroupId: table.staffUserGroupTable.userGroupId })
			.from(table.staffUserGroupTable)
			.where(eq(table.staffUserGroupTable.staffId, staffId));
		const userGroupIds = [...new Set(staffUserGroups.map((r) => r.userGroupId).filter((id) => id != null))];
		if (userGroupIds.length === 0) {
			// No user groups: only allow hospital home dashboard (no child path)
			const dbPageUrl = requestPathToDbPageUrl(url.pathname, hospitalId);
			if (dbPageUrl && dbPageUrl !== '/heka/home') {
				throw redirect(302, hekaHospitalHome(hospitalId));
			}
			return { pageData: [] };
		}

		// 2. Page ids assigned to those user groups
		const userGroupPages = await ensureDb()
			.select({ pageId: table.userGroupPageTable.pageId })
			.from(table.userGroupPageTable)
			.where(inArray(table.userGroupPageTable.userGroupId, userGroupIds));
		let allowedPageIds = new Set(userGroupPages.map((r) => r.pageId).filter((id) => id != null));

		// 3. Add all ancestor page ids so parent sections appear in nav
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

		// 4. Enforce page access: current path must be dashboard or an allowed page
		const dbPageUrl = requestPathToDbPageUrl(url.pathname, hospitalId);
		if (dbPageUrl && dbPageUrl !== '/heka/home') {
			const page = fullPages.find((p) => p.pageUrl === dbPageUrl);
			if (page && !allowedPageIds.has(page.id)) {
				throw redirect(302, hekaHospitalHome(hospitalId));
			}
		}

		const filtered = fullPages.filter((p) => allowedPageIds.has(p.id));
		return { pageData: filtered };
	}

	// Fallback (e.g. no role or no staff): show all
	return { pageData: fullPages };
};
