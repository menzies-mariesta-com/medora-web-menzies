import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PatientAllergiesSchema,
	PatientAllergiesSchemaInsert,
	PatientAllergiesSchemaUpdate,
} from '$lib/server/db/schema-type';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getPatientAllergies = query(
	async (): Promise<PatientAllergiesSchema[]> => {
		const data = await ensureDb().select().from(table.patientAllergyTable);
		return data;
	}
);

// get all with relations
export const getPatientAllergiesWithRelations = query(async () => {
	return ensureDb().query.patientAllergyTable.findMany({
		with: {
			patient: true,
		},
	});
});

// get count
export const getPatientAllergiesCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.patientAllergyTable);
	return row?.count ?? 0;
});

// get paginated
export const getPatientAllergiesPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams,
	): Promise<PaginatedResult<PatientAllergiesSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.patientAllergyTable)
				.limit(limit)
				.offset(offset),
			ensureDb().select({ count: count() }).from(table.patientAllergyTable),
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
export const getPatientAllergiesById = query(
	'unchecked' as const,
	async ({
		id,
	}: {
		id: number;
	}): Promise<PatientAllergiesSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.patientAllergyTable)
			.where(eq(table.patientAllergyTable.id, id));
		return row ?? null;
	}
);

// create
export const createPatientAllergies = command(
	'unchecked' as const,
	async (
		payload: PatientAllergiesSchemaInsert,
	): Promise<PatientAllergiesSchema> => {
		const [row] = await ensureDb()
			.insert(table.patientAllergyTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getPatientAllergies().refresh();
		return row;
	}
);

// update
export const updatePatientAllergies = command(
	'unchecked' as const,
	async (
		payload: { id: number } & PatientAllergiesSchemaUpdate,
	): Promise<PatientAllergiesSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.patientAllergyTable)
			.set(rest as PatientAllergiesSchemaUpdate)
			.where(eq(table.patientAllergyTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getPatientAllergies().refresh();
		return row;
	}
);

// delete (hard)
export const deletePatientAllergies = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.patientAllergyTable)
			.where(eq(table.patientAllergyTable.id, id));
		getPatientAllergies().refresh();
	}
);

// delete complete (hard)
export const deletePatientAllergiesComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.patientAllergyTable)
			.where(eq(table.patientAllergyTable.id, id));
		getPatientAllergies().refresh();
	}
);

