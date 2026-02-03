import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { UserGroupPageSchema, UserGroupPageSchemaInsert, UserGroupPageSchemaUpdate } from '$lib/server/db/schema-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getUserGroupPage = query(async (): Promise<UserGroupPageSchema[]> => {
	const data = await db.select().from(table.userGroupPageTable);
	return data;
});

// get count
export const getUserGroupPageCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.userGroupPageTable);
	return row?.count ?? 0;
});

// get one
export const getUserGroupPageById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<UserGroupPageSchema | null> => {
		const [row] = await db
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
		const [row] = await db
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
		const [row] = await db
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
		await db.delete(table.userGroupPageTable).where(eq(table.userGroupPageTable.id, id));
		getUserGroupPage().refresh();
	}
);

// delete complete (hard)
export const deleteUserGroupPageComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.userGroupPageTable).where(eq(table.userGroupPageTable.id, id));
		getUserGroupPage().refresh();
	}
);
