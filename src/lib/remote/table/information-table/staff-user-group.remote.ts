import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { StaffUserGroupSchema, StaffUserGroupSchemaInsert } from '$lib/server/db/schema-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getStaffUserGroup = query(async (): Promise<StaffUserGroupSchema[]> => {
	const data = await db.select().from(table.staffUserGroupTable);
	return data;
});

// get count
export const getStaffUserGroupCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.staffUserGroupTable);
	return row?.count ?? 0;
});

// get one
export const getStaffUserGroupById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<StaffUserGroupSchema | null> => {
		const [row] = await db
			.select()
			.from(table.staffUserGroupTable)
			.where(eq(table.staffUserGroupTable.id, id));
		return row ?? null;
	}
);

// create
export const createStaffUserGroup = command(
	'unchecked' as const,
	async (payload: { staffId: string; userGroupId: number }): Promise<StaffUserGroupSchema> => {
		const [row] = await db
			.insert(table.staffUserGroupTable)
			.values({ staffId: payload.staffId, userGroupId: payload.userGroupId })
			.returning();
		if (!row) throw new Error('Insert failed');
		getStaffUserGroup().refresh();
		return row;
	}
);

// update
export const updateStaffUserGroup = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		staffId?: string;
		userGroupId?: number;
	}): Promise<StaffUserGroupSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.staffUserGroupTable)
			.set(rest as Partial<StaffUserGroupSchemaInsert>)
			.where(eq(table.staffUserGroupTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getStaffUserGroup().refresh();
		return row;
	}
);

// delete (no status_id: hard delete)
export const deleteStaffUserGroup = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.staffUserGroupTable).where(eq(table.staffUserGroupTable.id, id));
		getStaffUserGroup().refresh();
	}
);

// delete complete (hard)
export const deleteStaffUserGroupComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.staffUserGroupTable).where(eq(table.staffUserGroupTable.id, id));
		getStaffUserGroup().refresh();
	}
);
