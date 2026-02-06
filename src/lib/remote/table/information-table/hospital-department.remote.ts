import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	HospitalDepartmentSchema,
	HospitalDepartmentSchemaInsert,
	HospitalDepartmentSchemaUpdate,
} from '$lib/server/db/schema-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getHospitalDepartment = query(async (): Promise<HospitalDepartmentSchema[]> => {
	const data = await db.select().from(table.hospitalDepartmentTable);
	return data;
});

// get all with relations
export const getHospitalDepartmentWithRelations = query(async () => {
	return db.query.hospitalDepartmentTable.findMany({
		with: {
			hospital: true,
			department: true,
		},
	});
});

// get count
export const getHospitalDepartmentCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.hospitalDepartmentTable);
	return row?.count ?? 0;
});

// get one
export const getHospitalDepartmentById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<HospitalDepartmentSchema | null> => {
		const [row] = await db
			.select()
			.from(table.hospitalDepartmentTable)
			.where(eq(table.hospitalDepartmentTable.id, id));
		return row ?? null;
	}
);

// get one with relations
export const getHospitalDepartmentByIdWithRelations = query(
	'unchecked' as const,
	async ({ id }: { id: number }) => {
		return db.query.hospitalDepartmentTable.findFirst({
			where: (t, { eq }) => eq(t.id, id),
			with: {
				hospital: true,
				department: true,
			},
		});
	}
);

// create
export const createHospitalDepartment = command(
	'unchecked' as const,
	async (payload: HospitalDepartmentSchemaInsert): Promise<HospitalDepartmentSchema> => {
		const [row] = await db
			.insert(table.hospitalDepartmentTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getHospitalDepartment().refresh();
		return row;
	}
);

// update
export const updateHospitalDepartment = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		hospitalId?: number;
		departmentId?: number;
	}): Promise<HospitalDepartmentSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.hospitalDepartmentTable)
			.set(rest as HospitalDepartmentSchemaUpdate)
			.where(eq(table.hospitalDepartmentTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getHospitalDepartment().refresh();
		return row;
	}
);

// delete (hard)
export const deleteHospitalDepartment = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.hospitalDepartmentTable).where(eq(table.hospitalDepartmentTable.id, id));
		getHospitalDepartment().refresh();
	}
);
