import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { UserGroupSchema, UserGroupSchemaInsert, UserGroupSchemaUpdate } from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { count, eq } from 'drizzle-orm';

// get all
export const getUserGroup = query(async (): Promise<UserGroupSchema[]> => {
	const data = await db.select().from(table.userGroupTable);
	return data;
});

// get count
export const getUserGroupCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.userGroupTable);
	return row?.count ?? 0;
});

// get one
export const getUserGroupById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<UserGroupSchema | null> => {
		const [row] = await db
			.select()
			.from(table.userGroupTable)
			.where(eq(table.userGroupTable.id, id));
		return row ?? null;
	}
);

// create
export const createUserGroup = command(
	'unchecked' as const,
	async (payload: UserGroupSchemaInsert): Promise<UserGroupSchema> => {
		const [row] = await db
			.insert(table.userGroupTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getUserGroup().refresh();
		return row;
	}
);

// update
export const updateUserGroup = command(
	'unchecked' as const,
	async (payload: { id: number; name?: string | null; statusId?: number | null }): Promise<UserGroupSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.userGroupTable)
			.set(rest as UserGroupSchemaUpdate)
			.where(eq(table.userGroupTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getUserGroup().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteUserGroup = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db
			.update(table.userGroupTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.userGroupTable.id, id));
		getUserGroup().refresh();
	}
);

// delete complete (hard)
export const deleteUserGroupComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.userGroupTable).where(eq(table.userGroupTable.id, id));
		getUserGroup().refresh();
	}
);
