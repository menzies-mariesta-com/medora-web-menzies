import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	DepartmentSchema,
	DepartmentSchemaInsert,
	DepartmentSchemaUpdate,
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { count, eq } from 'drizzle-orm';

// get all
export const getDepartment = query(async (): Promise<DepartmentSchema[]> => {
	const data = await db.select().from(table.departmentTable);
	return data;
});

// get count
export const getDepartmentCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.departmentTable);
	return row?.count ?? 0;
});

// get one
export const getDepartmentById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<DepartmentSchema | null> => {
		const [row] = await db
			.select()
			.from(table.departmentTable)
			.where(eq(table.departmentTable.id, id));
		return row ?? null;
	}
);

// create
export const createDepartment = command(
	'unchecked' as const,
	async (payload: DepartmentSchemaInsert): Promise<DepartmentSchema> => {
		const [row] = await db
			.insert(table.departmentTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getDepartment().refresh();
		return row;
	}
);

// update
export const updateDepartment = command(
	'unchecked' as const,
	async (payload: { id: number; name?: string | null; code?: string | null; statusId?: number | null }): Promise<DepartmentSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.departmentTable)
			.set(rest as DepartmentSchemaUpdate)
			.where(eq(table.departmentTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getDepartment().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteDepartment = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db
			.update(table.departmentTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.departmentTable.id, id));
		getDepartment().refresh();
	}
);

// delete complete (hard)
export const deleteDepartmentComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.departmentTable).where(eq(table.departmentTable.id, id));
		getDepartment().refresh();
	}
);
