import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	StaffShiftTypeSchema,
	StaffShiftTypeSchemaInsert,
	StaffShiftTypeSchemaUpdate,
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { count, eq } from 'drizzle-orm';

// get all
export const getStaffShiftType = query(async (): Promise<StaffShiftTypeSchema[]> => {
	const data = await db.select().from(table.staffShiftTypeTable);
	return data;
});

// get count
export const getStaffShiftTypeCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.staffShiftTypeTable);
	return row?.count ?? 0;
});

// get one
export const getStaffShiftTypeById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<StaffShiftTypeSchema | null> => {
		const [row] = await db
			.select()
			.from(table.staffShiftTypeTable)
			.where(eq(table.staffShiftTypeTable.id, id));
		return row ?? null;
	}
);

// create
export const createStaffShiftType = command(
	'unchecked' as const,
	async (payload: StaffShiftTypeSchemaInsert): Promise<StaffShiftTypeSchema> => {
		const [row] = await db
			.insert(table.staffShiftTypeTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getStaffShiftType().refresh();
		return row;
	}
);

// update
export const updateStaffShiftType = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string | null;
		code?: string | null;
		statusId?: number | null;
	}): Promise<StaffShiftTypeSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.staffShiftTypeTable)
			.set(rest as StaffShiftTypeSchemaUpdate)
			.where(eq(table.staffShiftTypeTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getStaffShiftType().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteStaffShiftType = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db
			.update(table.staffShiftTypeTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.staffShiftTypeTable.id, id));
		getStaffShiftType().refresh();
	}
);

// delete complete (hard)
export const deleteStaffShiftTypeComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.staffShiftTypeTable).where(eq(table.staffShiftTypeTable.id, id));
		getStaffShiftType().refresh();
	}
);
