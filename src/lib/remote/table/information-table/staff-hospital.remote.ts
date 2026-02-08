import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { StaffHospitalSchema, StaffHospitalSchemaInsert, StaffHospitalSchemaUpdate } from '$lib/server/db/schema-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getStaffHospital = query(async (): Promise<StaffHospitalSchema[]> => {
	const data = await ensureDb().select().from(table.staffHospitalTable);
	return data;
});

// get count
export const getStaffHospitalCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.staffHospitalTable);
	return row?.count ?? 0;
});

// get all with relations
export const getStaffHospitalWithRelations = query(async () => {
	return ensureDb().query.staffHospitalTable.findMany({
		with: {
			staff: true,
			hospital: true,
		},
	});
});

// get one
export const getStaffHospitalById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<StaffHospitalSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.staffHospitalTable)
			.where(eq(table.staffHospitalTable.id, id));
		return row ?? null;
	}
);

// create
export const createStaffHospital = command(
	'unchecked' as const,
	async (payload: StaffHospitalSchemaInsert): Promise<StaffHospitalSchema> => {
		const [row] = await ensureDb()
			.insert(table.staffHospitalTable)
			.values(payload)
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
		const [row] = await ensureDb()
			.update(table.staffHospitalTable)
			.set(rest as StaffHospitalSchemaUpdate)
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
		await ensureDb().delete(table.staffHospitalTable).where(eq(table.staffHospitalTable.id, id));
		getStaffHospital().refresh();
	}
);

// delete complete (hard)
export const deleteStaffHospitalComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.staffHospitalTable).where(eq(table.staffHospitalTable.id, id));
		getStaffHospital().refresh();
	}
);
