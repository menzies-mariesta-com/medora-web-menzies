import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { StaffDepartmentSchema, StaffDepartmentSchemaInsert, StaffDepartmentSchemaUpdate } from '$lib/server/db/schema-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getStaffDepartment = query(async (): Promise<StaffDepartmentSchema[]> => {
	const data = await db.select().from(table.staffDepartmentTable);
	return data;
});

// get count
export const getStaffDepartmentCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.staffDepartmentTable);
	return row?.count ?? 0;
});

// get all with relations
export const getStaffDepartmentWithRelations = query(async () => {
	return db.query.staffDepartmentTable.findMany({
		with: {
			staff: true,
			department: true,
		},
	});
});

// get one
export const getStaffDepartmentById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<StaffDepartmentSchema | null> => {
		const [row] = await db
			.select()
			.from(table.staffDepartmentTable)
			.where(eq(table.staffDepartmentTable.id, id));
		return row ?? null;
	}
);

// create
export const createStaffDepartment = command(
	'unchecked' as const,
	async (payload: StaffDepartmentSchemaInsert): Promise<StaffDepartmentSchema> => {
		const [row] = await db
			.insert(table.staffDepartmentTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getStaffDepartment().refresh();
		return row;
	}
);

// update
export const updateStaffDepartment = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		staffId?: string;
		departmentId?: number;
	}): Promise<StaffDepartmentSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.staffDepartmentTable)
			.set(rest as StaffDepartmentSchemaUpdate)
			.where(eq(table.staffDepartmentTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getStaffDepartment().refresh();
		return row;
	}
);

// delete (no status_id: hard delete)
export const deleteStaffDepartment = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.staffDepartmentTable).where(eq(table.staffDepartmentTable.id, id));
		getStaffDepartment().refresh();
	}
);

// delete complete (hard)
export const deleteStaffDepartmentComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.staffDepartmentTable).where(eq(table.staffDepartmentTable.id, id));
		getStaffDepartment().refresh();
	}
);
