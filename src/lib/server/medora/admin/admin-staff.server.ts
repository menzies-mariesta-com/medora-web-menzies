import { type RequestEvent } from '@sveltejs/kit';
import { and, count, eq, ilike, inArray } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { AdminPageKeyEnum, RoleEnum } from '$lib/model/enum/db-link';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import type { AdminStaffListRow } from '$lib/model/type/medora/admin-staff.type';
import { requireAdminPagePermission } from './admin-permission.server';

async function assertStaffView(event: RequestEvent) {
	await requireAdminPagePermission(
		event,
		AdminPageKeyEnum.STAFF,
		'view'
	);
}

function toIso(value: string | Date | null | undefined): string {
	if (!value) return new Date().toISOString();
	if (value instanceof Date) return value.toISOString();
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

/**
 * Paginated STAFF-role users for SYSTEM_ADMIN, with optional hospital names.
 */
export async function getAdminStaffPaginated(
	event: RequestEvent,
	params: PaginationParams & {
		name?: string | null;
		email?: string | null;
		statusId?: number | null;
	}
): Promise<PaginatedResult<AdminStaffListRow>> {
	await assertStaffView(event);
	const db = ensureDb();
	const { page, pageSize, limit, offset } = normalizePagination(params);

	const filters = [eq(table.userTable.roleId, RoleEnum.STAFF)];
	const nameTerm = params.name?.trim();
	if (nameTerm) {
		filters.push(ilike(table.userTable.name, `%${nameTerm}%`));
	}
	const emailTerm = params.email?.trim();
	if (emailTerm) {
		filters.push(ilike(table.userTable.email, `%${emailTerm}%`));
	}

	const statusId =
		typeof params.statusId === 'number' && Number.isFinite(params.statusId)
			? params.statusId
			: null;

	const whereExpr =
		statusId != null
			? and(
					...filters,
					eq(table.staffTable.statusId, statusId)
				)
			: and(...filters);

	const [userRows, countRows] = await Promise.all([
		statusId != null
			? db
					.select({ user: table.userTable })
					.from(table.userTable)
					.innerJoin(
						table.staffTable,
						eq(table.staffTable.userId, table.userTable.id)
					)
					.where(whereExpr)
					.limit(limit)
					.offset(offset)
					.then((rows) => rows.map((r) => r.user))
			: db
					.select()
					.from(table.userTable)
					.where(whereExpr)
					.limit(limit)
					.offset(offset),
		statusId != null
			? db
					.select({ count: count() })
					.from(table.userTable)
					.innerJoin(
						table.staffTable,
						eq(table.staffTable.userId, table.userTable.id)
					)
					.where(whereExpr)
			: db
					.select({ count: count() })
					.from(table.userTable)
					.where(whereExpr)
	]);

	const total = countRows[0]?.count ?? 0;
	const userIds = userRows.map((u) => u.id);

	const hospitalsByUser = new Map<
		string,
		{ id: string; name: string | null }[]
	>();
	const statusByUser = new Map<string, number | null>();

	if (userIds.length > 0) {
		const staffLinks = await db
			.select({
				userId: table.staffTable.userId,
				statusId: table.staffTable.statusId,
				hospitalId: table.hospitalTable.id,
				hospitalName: table.hospitalTable.name
			})
			.from(table.staffTable)
			.leftJoin(
				table.staffHospitalTable,
				eq(table.staffHospitalTable.staffId, table.staffTable.id)
			)
			.leftJoin(
				table.hospitalTable,
				eq(table.hospitalTable.id, table.staffHospitalTable.hospitalId)
			)
			.where(inArray(table.staffTable.userId, userIds));

		for (const row of staffLinks) {
			statusByUser.set(row.userId, row.statusId ?? null);
			if (!row.hospitalId) continue;
			const list = hospitalsByUser.get(row.userId) ?? [];
			if (!list.some((h) => h.id === row.hospitalId)) {
				list.push({ id: row.hospitalId, name: row.hospitalName });
			}
			hospitalsByUser.set(row.userId, list);
		}
	}

	const data: AdminStaffListRow[] = userRows.map((u) => ({
		id: u.id,
		name: u.name,
		email: u.email,
		emailVerified: u.emailVerified,
		createdAt: toIso(u.createdAt),
		updatedAt: toIso(u.updatedAt),
		statusId: statusByUser.get(u.id) ?? null,
		hospitals: hospitalsByUser.get(u.id) ?? []
	}));

	return {
		data,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize) || 1
	};
}
