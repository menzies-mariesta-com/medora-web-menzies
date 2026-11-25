import { error, type RequestEvent } from '@sveltejs/kit';
import { notifyHospitalMasterWrite } from '$lib/server/cache/notify-master-write.server';
import { and, count, desc, eq, ilike, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	ModuleSchema,
	PageSchema,
	UserGroupPageSchema,
	UserGroupSchema,
	UserGroupSchemaInsert,
	UserGroupSchemaUpdate
} from '$lib/server/db/schema-type';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/model/type/pagination.type';
import { normalizePagination } from '$lib/model/type/pagination.type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { isPageAction } from '$lib/model/enum/page-action.enum';
import { pageActionsFor } from '$lib/model/const/page-action-catalog.const';
import type { UserGroupPageGrantInput } from '$lib/model/type/medora/page-permission.type';
import { invalidateStaffPageGrants } from '$lib/server/medora/permission/page-permission.server';
import { hasAbsolutePermission } from '$lib/server/medora/permission/absolute-permission.server';
import { paginatedEntityStatusEq } from '$lib/server/medora/paginated-entity-status-filter.server';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';

export async function getUserGroupsPaginated(
	event: RequestEvent,
	input: PaginationParams & { hospitalId: string }
): Promise<PaginatedResult<UserGroupSchema>> {
	await ensureCanAccessHospital(event, input.hospitalId);
	const { page, pageSize, limit, offset } =
		normalizePagination(input);

	const conditions = [
		eq(table.userGroupTable.hospitalId, input.hospitalId),
		paginatedEntityStatusEq(
			table.userGroupTable.statusId,
			input.statusId
		)
	];

	const nameFilter = input.name?.trim();
	if (nameFilter) {
		conditions.push(
			ilike(table.userGroupTable.name, `%${nameFilter}%`)
		);
	}
	const whereExpr = and(...conditions);
	const [data, countResult] = await Promise.all([
		ensureDb()
			.select()
			.from(table.userGroupTable)
			.where(whereExpr)
			.orderBy(desc(table.userGroupTable.id))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.userGroupTable)
			.where(whereExpr)
	]);

	const total = countResult[0]?.count ?? 0;
	return {
		data,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize) || 1
	};
}

export async function getUserGroupById(
	event: RequestEvent,
	input: { id: number }
): Promise<UserGroupSchema | null> {
	if (!event.locals?.user) throw error(401, 'Unauthorized');
	const [row] = await ensureDb()
		.select()
		.from(table.userGroupTable)
		.where(
			and(
				eq(table.userGroupTable.id, input.id),
				ne(table.userGroupTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!row) return null;
	const hid = row.hospitalId;
	if (!hid) throw error(400, 'User group has no hospital scope');
	await ensureCanAccessHospital(event, hid);
	return row;
}

export async function createUserGroup(
	event: RequestEvent,
	input: UserGroupSchemaInsert
): Promise<UserGroupSchema> {
	const hid = input.hospitalId;
	if (!hid) throw error(400, 'hospitalId is required');
	await ensureCanAccessHospital(event, hid);
	const [created] = await ensureDb()
		.insert(table.userGroupTable)
		.values(input)
		.returning();
	if (!created) throw new Error('Failed to create user group');
	void notifyHospitalMasterWrite(input.hospitalId);

	return created;
}

export async function updateUserGroup(
	event: RequestEvent,
	input: UserGroupSchemaUpdate & { id: number }
): Promise<UserGroupSchema> {
	const [row] = await ensureDb()
		.select({ hospitalId: table.userGroupTable.hospitalId })
		.from(table.userGroupTable)
		.where(eq(table.userGroupTable.id, input.id))
		.limit(1);
	if (!row) throw error(404, 'User group not found');
	const hidUpdate = row.hospitalId;
	if (!hidUpdate)
		throw error(400, 'User group has no hospital scope');
	await ensureCanAccessHospital(event, hidUpdate);

	const { id, ...data } = input;
	const [updated] = await ensureDb()
		.update(table.userGroupTable)
		.set(data)
		.where(eq(table.userGroupTable.id, id))
		.returning();
	if (!updated) throw error(404, 'User group not found');
	void notifyHospitalMasterWrite(hidUpdate);

	return updated;
}

export async function deleteUserGroup(
	event: RequestEvent,
	input: { id: number }
): Promise<void> {
	const [row] = await ensureDb()
		.select({ hospitalId: table.userGroupTable.hospitalId })
		.from(table.userGroupTable)
		.where(eq(table.userGroupTable.id, input.id))
		.limit(1);
	if (!row) throw error(404, 'User group not found');
	const hidDel = row.hospitalId;
	if (!hidDel) throw error(400, 'User group has no hospital scope');
	await ensureCanAccessHospital(event, hidDel);

	await ensureDb()
		.update(table.userGroupTable)
		.set({ statusId: StatusEnum.INACTIVE })
		.where(eq(table.userGroupTable.id, input.id));
}

export async function getUserGroupPageAssignments(
	event: RequestEvent,
	input: { hospitalId: string; userGroupId: number }
): Promise<{
	pages: PageSchema[];
	modules: ModuleSchema[];
	assignments: UserGroupPageSchema[];
}> {
	await ensureCanAccessHospital(event, input.hospitalId);

	const [group] = await ensureDb()
		.select({
			id: table.userGroupTable.id,
			hospitalId: table.userGroupTable.hospitalId
		})
		.from(table.userGroupTable)
		.where(eq(table.userGroupTable.id, input.userGroupId))
		.limit(1);
	if (!group) throw error(404, 'User group not found');
	if (group.hospitalId !== input.hospitalId)
		throw error(400, 'User group does not belong to this hospital');

	const [pages, modules, assignments] = await Promise.all([
		ensureDb().select().from(table.pageTable),
		ensureDb().select().from(table.moduleTable),
		ensureDb()
			.select()
			.from(table.userGroupPageTable)
			.where(
				eq(table.userGroupPageTable.userGroupId, input.userGroupId)
			)
	]);

	return { pages, modules, assignments };
}

/**
 * Replace every grant for a group. Absolute-permission roles only: a group
 * holding `edit` here could otherwise widen its own permissions.
 * Actions not offered by the page catalog are dropped (allowlist).
 */
export async function setPagesForUserGroup(
	event: RequestEvent,
	input: {
		hospitalId: string;
		userGroupId: number;
		grants: UserGroupPageGrantInput[];
	}
): Promise<void> {
	await ensureCanAccessHospital(event, input.hospitalId);

	const roleId = event.locals.userRoleId ?? null;
	if (!hasAbsolutePermission(roleId)) {
		throw error(
			403,
			'Only the hospital owner can change access rights'
		);
	}

	const [group] = await ensureDb()
		.select({
			id: table.userGroupTable.id,
			hospitalId: table.userGroupTable.hospitalId
		})
		.from(table.userGroupTable)
		.where(eq(table.userGroupTable.id, input.userGroupId))
		.limit(1);
	if (!group) throw error(404, 'User group not found');
	if (group.hospitalId !== input.hospitalId)
		throw error(400, 'User group does not belong to this hospital');

	const pageRows = await ensureDb()
		.select({
			id: table.pageTable.id,
			pageUrl: table.pageTable.pageUrl
		})
		.from(table.pageTable);
	const pageUrlById = new Map(pageRows.map((p) => [p.id, p.pageUrl]));

	const rows: {
		userGroupId: number;
		pageId: number;
		actionCode: string;
	}[] = [];
	const seen = new Set<string>();
	for (const grant of input.grants) {
		const pageUrl = pageUrlById.get(grant.pageId);
		if (pageUrl == null) continue;
		const offered = pageActionsFor(pageUrl) as string[];
		for (const action of grant.actions) {
			if (!isPageAction(action) || !offered.includes(action))
				continue;
			const key = `${grant.pageId}:${action}`;
			if (seen.has(key)) continue;
			seen.add(key);
			rows.push({
				userGroupId: input.userGroupId,
				pageId: grant.pageId,
				actionCode: action
			});
		}
	}

	await ensureDb().transaction(async (tx) => {
		await tx
			.delete(table.userGroupPageTable)
			.where(
				eq(table.userGroupPageTable.userGroupId, input.userGroupId)
			);
		if (rows.length > 0) {
			await tx.insert(table.userGroupPageTable).values(rows);
		}
	});

	await invalidateStaffPageGrants();
}
