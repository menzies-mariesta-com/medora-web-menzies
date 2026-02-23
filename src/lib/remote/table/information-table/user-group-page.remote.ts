import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { UserGroupPageSchema, UserGroupPageSchemaInsert, UserGroupPageSchemaUpdate } from '$lib/server/db/schema-type';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

/** Get all user_group_page rows for a user group (to know which pages are assigned). */
export const getByUserGroupId = query(
	'unchecked' as const,
	async ({ userGroupId }: { userGroupId: number }): Promise<UserGroupPageSchema[]> => {
		return ensureDb()
			.select()
			.from(table.userGroupPageTable)
			.where(eq(table.userGroupPageTable.userGroupId, userGroupId));
	}
);

/** Replace page assignments for a user group: delete existing and insert the given page IDs. */
export const setPagesForUserGroup = command(
	'unchecked' as const,
	async ({ userGroupId, pageIds }: { userGroupId: number; pageIds: number[] }): Promise<void> => {
		await ensureDb()
			.delete(table.userGroupPageTable)
			.where(eq(table.userGroupPageTable.userGroupId, userGroupId));
		for (const pageId of pageIds) {
			await ensureDb().insert(table.userGroupPageTable).values({
				userGroupId,
				pageId,
			});
		}
		getUserGroupPage().refresh();
	}
);

// get all
export const getUserGroupPage = query(async (): Promise<UserGroupPageSchema[]> => {
	const data = await ensureDb().select().from(table.userGroupPageTable);
	return data;
});

// get count
export const getUserGroupPageCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.userGroupPageTable);
	return row?.count ?? 0;
});

// get paginated
export const getUserGroupPagePaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<UserGroupPageSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb().select().from(table.userGroupPageTable).limit(limit).offset(offset),
			ensureDb().select({ count: count() }).from(table.userGroupPageTable),
		]);
		const total = countResult[0]?.count ?? 0;
		return {
			data,
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize) || 1,
		};
	}
);

// get one
export const getUserGroupPageById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<UserGroupPageSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.userGroupPageTable)
			.where(eq(table.userGroupPageTable.id, id));
		return row ?? null;
	}
);

// create
export const createUserGroupPage = command(
	'unchecked' as const,
	async (payload: UserGroupPageSchemaInsert): Promise<UserGroupPageSchema> => {
		const [row] = await ensureDb()
			.insert(table.userGroupPageTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getUserGroupPage().refresh();
		return row;
	}
);

// update
export const updateUserGroupPage = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		userGroupId?: number | null;
		pageId?: number | null;
	}): Promise<UserGroupPageSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.userGroupPageTable)
			.set(rest as UserGroupPageSchemaUpdate)
			.where(eq(table.userGroupPageTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getUserGroupPage().refresh();
		return row;
	}
);

// delete (no status_id: hard delete)
export const deleteUserGroupPage = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.userGroupPageTable).where(eq(table.userGroupPageTable.id, id));
		getUserGroupPage().refresh();
	}
);

// delete complete (hard)
export const deleteUserGroupPageComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.userGroupPageTable).where(eq(table.userGroupPageTable.id, id));
		getUserGroupPage().refresh();
	}
);
