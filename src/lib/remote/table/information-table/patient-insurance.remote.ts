import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PatientInsuranceSchema,
	PatientInsuranceSchemaInsert,
	PatientInsuranceSchemaUpdate,
} from '$lib/server/db/schema-type';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getPatientInsurance = query(
	async (): Promise<PatientInsuranceSchema[]> => {
		const data = await ensureDb().select().from(table.patientInsurance);
		return data;
	}
);

// get all with relations
export const getPatientInsuranceWithRelations = query(async () => {
	return ensureDb().query.patientInsurance.findMany({
		with: {
			patient: true,
			insurance: true,
		},
	});
});

// get count
export const getPatientInsuranceCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.patientInsurance);
	return row?.count ?? 0;
});

// get paginated
export const getPatientInsurancePaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams,
	): Promise<PaginatedResult<PatientInsuranceSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.patientInsurance)
				.limit(limit)
				.offset(offset),
			ensureDb().select({ count: count() }).from(table.patientInsurance),
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
export const getPatientInsuranceById = query(
	'unchecked' as const,
	async ({
		id,
	}: {
		id: number;
	}): Promise<PatientInsuranceSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.patientInsurance)
			.where(eq(table.patientInsurance.id, id));
		return row ?? null;
	}
);

// create
export const createPatientInsurance = command(
	'unchecked' as const,
	async (
		payload: PatientInsuranceSchemaInsert,
	): Promise<PatientInsuranceSchema> => {
		const [row] = await ensureDb()
			.insert(table.patientInsurance)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getPatientInsurance().refresh();
		return row;
	}
);

// update
export const updatePatientInsurance = command(
	'unchecked' as const,
	async (
		payload: { id: number } & PatientInsuranceSchemaUpdate,
	): Promise<PatientInsuranceSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.patientInsurance)
			.set(rest as PatientInsuranceSchemaUpdate)
			.where(eq(table.patientInsurance.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getPatientInsurance().refresh();
		return row;
	}
);

// delete (hard)
export const deletePatientInsurance = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.patientInsurance)
			.where(eq(table.patientInsurance.id, id));
		getPatientInsurance().refresh();
	}
);

// delete complete (hard)
export const deletePatientInsuranceComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.patientInsurance)
			.where(eq(table.patientInsurance.id, id));
		getPatientInsurance().refresh();
	}
);

