import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { StaffUserGroupSchema, StaffUserGroupSchemaInsert, StaffUserGroupSchemaUpdate } from '$lib/server/db/schema-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getStaffUserGroup = query(async (): Promise<StaffUserGroupSchema[]> => {
	const data = await ensureDb().select().from(table.staffUserGroupTable);
	return data;
});

// get count
export const getStaffUserGroupCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.staffUserGroupTable);
	return row?.count ?? 0;
});

// get all with relations
export const getStaffUserGroupWithRelations = query(async () => {
	return ensureDb().query.staffUserGroupTable.findMany({
		with: {
			staff: true,
			userGroup: true,
		},
	});
});

// get one
export const getStaffUserGroupById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<StaffUserGroupSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.staffUserGroupTable)
			.where(eq(table.staffUserGroupTable.id, id));
		return row ?? null;
	}
);

// create
export const createStaffUserGroup = command(
	'unchecked' as const,
	async (payload: StaffUserGroupSchemaInsert): Promise<StaffUserGroupSchema> => {
		const [row] = await ensureDb()
			.insert(table.staffUserGroupTable)
			.values(payload)
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
		const [row] = await ensureDb()
			.update(table.staffUserGroupTable)
			.set(rest as StaffUserGroupSchemaUpdate)
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
		await ensureDb().delete(table.staffUserGroupTable).where(eq(table.staffUserGroupTable.id, id));
		getStaffUserGroup().refresh();
	}
);

// delete complete (hard)
export const deleteStaffUserGroupComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.staffUserGroupTable).where(eq(table.staffUserGroupTable.id, id));
		getStaffUserGroup().refresh();
	}
);
