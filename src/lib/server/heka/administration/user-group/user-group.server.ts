import { error, type RequestEvent } from '@sveltejs/kit';
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
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';

export async function getUserGroupsPaginated(
	event: RequestEvent,
	input: PaginationParams & { hospitalId: string }
): Promise<PaginatedResult<UserGroupSchema>> {
	await ensureCanAccessHospital(event, input.hospitalId);
	const { page, pageSize, limit, offset } = normalizePagination(input);

	const conditions = [
		eq(table.userGroupTable.hospitalId, input.hospitalId),
		ne(table.userGroupTable.statusId, StatusEnum.DELETED)
	];

	const nameFilter = input.name?.trim();
	if (nameFilter) {
		conditions.push(ilike(table.userGroupTable.name, `%${nameFilter}%`));
	}
	if (typeof input.statusId === 'number') {
		conditions.push(eq(table.userGroupTable.statusId, input.statusId));
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
	if (!hidUpdate) throw error(400, 'User group has no hospital scope');
	await ensureCanAccessHospital(event, hidUpdate);

	const { id, ...data } = input;
	const [updated] = await ensureDb()
		.update(table.userGroupTable)
		.set(data)
		.where(eq(table.userGroupTable.id, id))
		.returning();
	if (!updated) throw error(404, 'User group not found');
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
		.set({ statusId: StatusEnum.DELETED })
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
			.where(eq(table.userGroupPageTable.userGroupId, input.userGroupId))
	]);

	return { pages, modules, assignments };
}

export async function setPagesForUserGroup(
	event: RequestEvent,
	input: { hospitalId: string; userGroupId: number; pageIds: number[] }
): Promise<void> {
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

	const uniquePageIds = [...new Set(input.pageIds)].filter((n) =>
		Number.isFinite(n)
	);

	await ensureDb().transaction(async (tx) => {
		await tx
			.delete(table.userGroupPageTable)
			.where(eq(table.userGroupPageTable.userGroupId, input.userGroupId));
		if (uniquePageIds.length > 0) {
			await tx.insert(table.userGroupPageTable).values(
				uniquePageIds.map((pageId) => ({
					userGroupId: input.userGroupId,
					pageId
				}))
			);
		}
	});
}

