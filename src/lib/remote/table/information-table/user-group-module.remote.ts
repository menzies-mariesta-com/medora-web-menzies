import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { UserGroupModuleSchema, UserGroupModuleSchemaInsert } from '$lib/server/db/schema-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getUserGroupModule = query(async (): Promise<UserGroupModuleSchema[]> => {
	const data = await db.select().from(table.userGroupModuleTable);
	return data;
});

// get count
export const getUserGroupModuleCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.userGroupModuleTable);
	return row?.count ?? 0;
});

// get one
export const getUserGroupModuleById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<UserGroupModuleSchema | null> => {
		const [row] = await db
			.select()
			.from(table.userGroupModuleTable)
			.where(eq(table.userGroupModuleTable.id, id));
		return row ?? null;
	}
);

// create
export const createUserGroupModule = command(
	'unchecked' as const,
	async (payload: { userGroupId?: number | null; moduleId?: number | null }): Promise<UserGroupModuleSchema> => {
		const [row] = await db
			.insert(table.userGroupModuleTable)
			.values({ userGroupId: payload.userGroupId, moduleId: payload.moduleId })
			.returning();
		if (!row) throw new Error('Insert failed');
		getUserGroupModule().refresh();
		return row;
	}
);

// update
export const updateUserGroupModule = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		userGroupId?: number | null;
		moduleId?: number | null;
	}): Promise<UserGroupModuleSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.userGroupModuleTable)
			.set(rest as Partial<UserGroupModuleSchemaInsert>)
			.where(eq(table.userGroupModuleTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getUserGroupModule().refresh();
		return row;
	}
);

// delete (no status_id: hard delete)
export const deleteUserGroupModule = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.userGroupModuleTable).where(eq(table.userGroupModuleTable.id, id));
		getUserGroupModule().refresh();
	}
);

// delete complete (hard)
export const deleteUserGroupModuleComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.userGroupModuleTable).where(eq(table.userGroupModuleTable.id, id));
		getUserGroupModule().refresh();
	}
);
