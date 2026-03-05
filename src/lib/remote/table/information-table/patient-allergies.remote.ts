import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PatientAllergiesSchema,
	PatientAllergiesSchemaInsert,
	PatientAllergiesSchemaUpdate
} from '$lib/server/db/schema-type';
import type { AllergySchema } from '$lib/server/db/schema-type';
import type { SeveritySchema } from '$lib/server/db/schema-type';
import type { PatientVisitSchema } from '$lib/server/db/schema-type';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { and, count, eq, ne } from 'drizzle-orm';

// get all
export const getPatientAllergies = query(
	async (): Promise<PatientAllergiesSchema[]> => {
		const data = await ensureDb()
			.select()
			.from(table.patientAllergyTable);
		return data;
	}
);

// get all with relations
export const getPatientAllergiesWithRelations = query(async () => {
	return ensureDb().query.patientAllergyTable.findMany({
		with: {
			patient: true,
			allergy: true,
			severity: true,
			visit: true
		}
	});
});

export type PatientAllergyWithRelations = PatientAllergiesSchema & {
	allergy: AllergySchema | null;
	severity: SeveritySchema | null;
	visit: PatientVisitSchema | null;
};

/** Get all patient allergies (active and inactive) by patientId with allergy, severity, and visit (for EMR allergy page). */
export const getPatientAllergiesByPatientIdWithRelations = query(
	'unchecked' as const,
	async ({
		patientId
	}: {
		patientId: string;
	}): Promise<PatientAllergyWithRelations[]> => {
		return ensureDb().query.patientAllergyTable.findMany({
			where: (t, { eq }) => eq(t.patientId, patientId),
			with: {
				allergy: true,
				severity: true,
				visit: true
			},
			orderBy: (t, { desc }) => desc(t.id)
		}) as Promise<PatientAllergyWithRelations[]>;
	}
);

// get count
export const getPatientAllergiesCount = query(
	async (): Promise<number> => {
		const [row] = await ensureDb()
			.select({ count: count() })
			.from(table.patientAllergyTable);
		return row?.count ?? 0;
	}
);

// get paginated
export const getPatientAllergiesPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<PatientAllergiesSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.patientAllergyTable)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.patientAllergyTable)
		]);
		const total = countResult[0]?.count ?? 0;
		return {
			data,
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize) || 1
		};
	}
);

// get one
export const getPatientAllergiesById = query(
	'unchecked' as const,
	async ({
		id
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

// get by patient
export const getPatientAllergiesByPatientId = query(
	'unchecked' as const,
	async ({
		patientId
	}: {
		patientId: string;
	}): Promise<PatientAllergiesSchema[]> => {
		return ensureDb()
			.select()
			.from(table.patientAllergyTable)
			.where(eq(table.patientAllergyTable.patientId, patientId))
			.orderBy(table.patientAllergyTable.id);
	}
);

/** Get active patient allergies for a patient (for "No Known Allergy" flow: check before inactivating others). */
export const getActivePatientAllergiesByPatientId = query(
	'unchecked' as const,
	async ({
		patientId
	}: {
		patientId: string;
	}): Promise<PatientAllergiesSchema[]> => {
		return ensureDb()
			.select()
			.from(table.patientAllergyTable)
			.where(
				and(
					eq(table.patientAllergyTable.patientId, patientId),
					eq(table.patientAllergyTable.statusId, StatusEnum.ACTIVE)
				)
			)
			.orderBy(table.patientAllergyTable.id);
	}
);

/** Set all patient allergies for a patient to inactive (used when adding "No Known Allergy"). */
export const inactivateAllPatientAllergiesForPatient = command(
	'unchecked' as const,
	async ({ patientId }: { patientId: string }): Promise<void> => {
		await ensureDb()
			.update(table.patientAllergyTable)
			.set({ statusId: StatusEnum.INACTIVE })
			.where(eq(table.patientAllergyTable.patientId, patientId));
		getPatientAllergies().refresh();
	}
);

/** Inactivate all patient allergies for a patient except the one with excludeId (used when activating "No Known Allergy" in edit). */
export const inactivateOtherPatientAllergiesForPatient = command(
	'unchecked' as const,
	async ({
		patientId,
		excludeId
	}: {
		patientId: string;
		excludeId: number;
	}): Promise<void> => {
		await ensureDb()
			.update(table.patientAllergyTable)
			.set({ statusId: StatusEnum.INACTIVE })
			.where(
				and(
					eq(table.patientAllergyTable.patientId, patientId),
					ne(table.patientAllergyTable.id, excludeId)
				)
			);
		getPatientAllergies().refresh();
	}
);

/** Inactivate all patient allergy records for a patient that have the given allergyId (e.g. "No Known Allergy"). */
export const inactivatePatientAllergiesByAllergyIdForPatient = command(
	'unchecked' as const,
	async ({
		patientId,
		allergyId
	}: {
		patientId: string;
		allergyId: number;
	}): Promise<void> => {
		await ensureDb()
			.update(table.patientAllergyTable)
			.set({ statusId: StatusEnum.INACTIVE })
			.where(
				and(
					eq(table.patientAllergyTable.patientId, patientId),
					eq(table.patientAllergyTable.allergyId, allergyId)
				)
			);
		getPatientAllergies().refresh();
	}
);

// create
export const createPatientAllergies = command(
	'unchecked' as const,
	async (
		payload: PatientAllergiesSchemaInsert
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
		payload: { id: number } & PatientAllergiesSchemaUpdate
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
