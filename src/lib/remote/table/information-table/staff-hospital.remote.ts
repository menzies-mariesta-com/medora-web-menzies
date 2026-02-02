import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { StaffHospitalSchema, StaffHospitalSchemaInsert } from '$lib/server/db/schema-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getStaffHospital = query(async (): Promise<StaffHospitalSchema[]> => {
	const data = await db.select().from(table.staffHospitalTable);
	return data;
});

// get count
export const getStaffHospitalCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.staffHospitalTable);
	return row?.count ?? 0;
});

// get one
export const getStaffHospitalById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<StaffHospitalSchema | null> => {
		const [row] = await db
			.select()
			.from(table.staffHospitalTable)
			.where(eq(table.staffHospitalTable.id, id));
		return row ?? null;
	}
);

// create
export const createStaffHospital = command(
	'unchecked' as const,
	async (payload: { staffId: string; hospitalId: number }): Promise<StaffHospitalSchema> => {
		const [row] = await db
			.insert(table.staffHospitalTable)
			.values({ staffId: payload.staffId, hospitalId: payload.hospitalId })
			.returning();
		if (!row) throw new Error('Insert failed');
		getStaffHospital().refresh();
		return row;
	}
);

// update
export const updateStaffHospital = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		staffId?: string;
		hospitalId?: number;
	}): Promise<StaffHospitalSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.staffHospitalTable)
			.set(rest as Partial<StaffHospitalSchemaInsert>)
			.where(eq(table.staffHospitalTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getStaffHospital().refresh();
		return row;
	}
);

// delete (no status_id: hard delete)
export const deleteStaffHospital = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.staffHospitalTable).where(eq(table.staffHospitalTable.id, id));
		getStaffHospital().refresh();
	}
);

// delete complete (hard)
export const deleteStaffHospitalComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.staffHospitalTable).where(eq(table.staffHospitalTable.id, id));
		getStaffHospital().refresh();
	}
);
