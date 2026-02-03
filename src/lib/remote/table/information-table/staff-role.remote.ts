import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { StaffRoleSchema, StaffRoleSchemaInsert, StaffRoleSchemaUpdate } from '$lib/server/db/schema-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getStaffRole = query(async (): Promise<StaffRoleSchema[]> => {
	const data = await db.select().from(table.staffRoleTable);
	return data;
});

// get count
export const getStaffRoleCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.staffRoleTable);
	return row?.count ?? 0;
});

// get one
export const getStaffRoleById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<StaffRoleSchema | null> => {
		const [row] = await db
			.select()
			.from(table.staffRoleTable)
			.where(eq(table.staffRoleTable.id, id));
		return row ?? null;
	}
);

// create
export const createStaffRole = command(
	'unchecked' as const,
	async (payload: StaffRoleSchemaInsert): Promise<StaffRoleSchema> => {
		const [row] = await db
			.insert(table.staffRoleTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getStaffRole().refresh();
		return row;
	}
);

// update
export const updateStaffRole = command(
	'unchecked' as const,
	async (payload: { id: number; staffId?: string; roleId?: number }): Promise<StaffRoleSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.staffRoleTable)
			.set(rest as StaffRoleSchemaUpdate)
			.where(eq(table.staffRoleTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getStaffRole().refresh();
		return row;
	}
);

// delete (no status_id: hard delete)
export const deleteStaffRole = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.staffRoleTable).where(eq(table.staffRoleTable.id, id));
		getStaffRole().refresh();
	}
);

// delete complete (hard)
export const deleteStaffRoleComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.staffRoleTable).where(eq(table.staffRoleTable.id, id));
		getStaffRole().refresh();
	}
);
