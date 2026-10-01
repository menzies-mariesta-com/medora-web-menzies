import { count, eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { AdminPageKeyEnum, RoleEnum } from '$lib/model/enum/db-link';
import type { AdminSummary } from '$lib/model/type/medora/admin-summary.type';
import type { RequestEvent } from '@sveltejs/kit';
import { requireAdminPagePermission } from './admin-permission.server';

export async function getAdminSummary(
	event: RequestEvent
): Promise<AdminSummary> {
	await requireAdminPagePermission(
		event,
		AdminPageKeyEnum.OVERVIEW,
		'view'
	);

	const db = ensureDb();
	const [ownersRow, hospitalsRow, staffRow] = await Promise.all([
		db
			.select({ count: count() })
			.from(table.userTable)
			.where(eq(table.userTable.roleId, RoleEnum.OWNER)),
		db.select({ count: count() }).from(table.hospitalTable),
		db
			.select({ count: count() })
			.from(table.userTable)
			.where(eq(table.userTable.roleId, RoleEnum.STAFF))
	]);

	return {
		owners: Number(ownersRow[0]?.count ?? 0),
		hospitals: Number(hospitalsRow[0]?.count ?? 0),
		staff: Number(staffRow[0]?.count ?? 0)
	};
}
