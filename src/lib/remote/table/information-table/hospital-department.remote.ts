import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	HospitalDepartmentSchema,
	HospitalDepartmentSchemaInsert,
	HospitalDepartmentSchemaUpdate,
} from '$lib/server/db/schema-type';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getHospitalDepartment = query(async (): Promise<HospitalDepartmentSchema[]> => {
	const data = await ensureDb().select().from(table.hospitalDepartmentTable);
	return data;
});

// get all with relations
export const getHospitalDepartmentWithRelations = query(async () => {
	return ensureDb().query.hospitalDepartmentTable.findMany({
		with: {
			hospital: true,
			department: true,
		},
	});
});

// get count
export const getHospitalDepartmentCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.hospitalDepartmentTable);
	return row?.count ?? 0;
});

// get paginated
export const getHospitalDepartmentPaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<HospitalDepartmentSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb().select().from(table.hospitalDepartmentTable).limit(limit).offset(offset),
			ensureDb().select({ count: count() }).from(table.hospitalDepartmentTable),
		]);
		const total = countResult[0]?.count ?? 0;
		return {
			data,
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize) || 1,
		};
	}
);

// get one
export const getHospitalDepartmentById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<HospitalDepartmentSchema | null> => {
		const [row] = await ensureDb()
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
		return ensureDb().query.hospitalDepartmentTable.findFirst({
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
		const [row] = await ensureDb()
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
		const [row] = await ensureDb()
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
		await ensureDb().delete(table.hospitalDepartmentTable).where(eq(table.hospitalDepartmentTable.id, id));
		getHospitalDepartment().refresh();
	}
);
