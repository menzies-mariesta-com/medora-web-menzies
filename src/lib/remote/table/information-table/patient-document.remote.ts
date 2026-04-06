import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PatientDocumentSchema,
	PatientDocumentSchemaInsert,
	PatientDocumentSchemaUpdate
} from '$lib/server/db/schema-type';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { count, eq, ne } from 'drizzle-orm';
import { assertVisitNotClinicallySigned } from '$lib/server/visit-clinical-lock.server';

// get all
export const getPatientDocuments = query(
	async (): Promise<PatientDocumentSchema[]> => {
		return ensureDb().select().from(table.patientDocumentTable);
	}
);

// get all with relations
export const getPatientDocumentsWithRelations = query(async () => {
	return ensureDb().query.patientDocumentTable.findMany({
		with: {
			patient: true,
			visit: true,
			document: {
				with: {
					documentType: true
				}
			},
			status: true
		}
	});
});

export type PatientDocumentWithRelations = Awaited<
	ReturnType<typeof getPatientDocumentsWithRelations>
>[number];

// get by id
export const getPatientDocumentById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<PatientDocumentSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.patientDocumentTable)
			.where(eq(table.patientDocumentTable.id, id));
		return row ?? null;
	}
);

// get by patient
export const getPatientDocumentsByPatientId = query(
	'unchecked' as const,
	async ({
		patientId
	}: {
		patientId: string;
	}): Promise<PatientDocumentSchema[]> => {
		return ensureDb()
			.select()
			.from(table.patientDocumentTable)
			.where(eq(table.patientDocumentTable.patientId, patientId));
	}
);

// get by visit
export const getPatientDocumentsByVisitId = query(
	'unchecked' as const,
	async ({
		visitId
	}: {
		visitId: number;
	}): Promise<PatientDocumentSchema[]> => {
		return ensureDb()
			.select()
			.from(table.patientDocumentTable)
			.where(eq(table.patientDocumentTable.visitId, visitId));
	}
);

/** Patient document links for one visit with document + type (observation EMR). */
export const getPatientDocumentsByVisitIdWithRelations = query(
	'unchecked' as const,
	async ({
		visitId
	}: {
		visitId: number;
	}): Promise<PatientDocumentWithRelations[]> => {
		const rows = await ensureDb().query.patientDocumentTable.findMany(
			{
				where: (t, { and, eq, ne }) =>
					and(
						eq(t.visitId, visitId),
						ne(t.statusId, StatusEnum.DELETED)
					),
				with: {
					patient: true,
					visit: true,
					document: {
						with: {
							documentType: true
						}
					},
					status: true
				},
				orderBy: (t, { desc }) => desc(t.id)
			}
		);
		return rows as PatientDocumentWithRelations[];
	}
);

// get by patient with relations
export const getPatientDocumentsByPatientIdWithRelations = query(
	'unchecked' as const,
	async ({
		patientId
	}: {
		patientId: string;
	}): Promise<PatientDocumentWithRelations[]> => {
		return ensureDb().query.patientDocumentTable.findMany({
			where: (t, { eq }) => eq(t.patientId, patientId),
			with: {
				patient: true,
				visit: true,
				document: {
					with: {
						documentType: true
					}
				},
				status: true
			}
		}) as Promise<PatientDocumentWithRelations[]>;
	}
);

// get paginated
export const getPatientDocumentsPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<PatientDocumentSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.patientDocumentTable)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.patientDocumentTable)
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

// create
export const createPatientDocument = command(
	'unchecked' as const,
	async (
		payload: PatientDocumentSchemaInsert
	): Promise<PatientDocumentSchema> => {
		await assertVisitNotClinicallySigned(payload.visitId);
		const [row] = await ensureDb()
			.insert(table.patientDocumentTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getPatientDocuments().refresh();
		getPatientDocumentsByPatientIdWithRelations({
			patientId: row.patientId
		}).refresh();
		getPatientDocumentsByVisitIdWithRelations({
			visitId: row.visitId
		}).refresh();
		return row;
	}
);

// update
export const updatePatientDocument = command(
	'unchecked' as const,
	async (
		payload: { id: number } & PatientDocumentSchemaUpdate
	): Promise<PatientDocumentSchema> => {
		const { id, ...rest } = payload;
		const [pre] = await ensureDb()
			.select({ visitId: table.patientDocumentTable.visitId })
			.from(table.patientDocumentTable)
			.where(eq(table.patientDocumentTable.id, id))
			.limit(1);
		if (!pre) throw new Error('Patient document not found');
		await assertVisitNotClinicallySigned(pre.visitId);
		const [row] = await ensureDb()
			.update(table.patientDocumentTable)
			.set(rest as PatientDocumentSchemaUpdate)
			.where(eq(table.patientDocumentTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getPatientDocuments().refresh();
		getPatientDocumentsByPatientIdWithRelations({
			patientId: row.patientId
		}).refresh();
		getPatientDocumentsByVisitIdWithRelations({
			visitId: row.visitId
		}).refresh();
		return row;
	}
);

// soft delete (set status inactive)
export const inactivatePatientDocument = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		const [pre] = await ensureDb()
			.select({ visitId: table.patientDocumentTable.visitId })
			.from(table.patientDocumentTable)
			.where(eq(table.patientDocumentTable.id, id))
			.limit(1);
		if (pre) await assertVisitNotClinicallySigned(pre.visitId);
		const [row] = await ensureDb()
			.update(table.patientDocumentTable)
			.set({
				statusId: StatusEnum.INACTIVE
			})
			.where(eq(table.patientDocumentTable.id, id))
			.returning();
		if (row) {
			getPatientDocuments().refresh();
			getPatientDocumentsByPatientIdWithRelations({
				patientId: row.patientId
			}).refresh();
			getPatientDocumentsByVisitIdWithRelations({
				visitId: row.visitId
			}).refresh();
		}
	}
);

// delete (soft)
export const deletePatientDocument = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		const [existing] = await ensureDb()
			.select({
				patientId: table.patientDocumentTable.patientId,
				visitId: table.patientDocumentTable.visitId
			})
			.from(table.patientDocumentTable)
			.where(eq(table.patientDocumentTable.id, id))
			.limit(1);
		if (existing)
			await assertVisitNotClinicallySigned(existing.visitId);
		await ensureDb()
			.update(table.patientDocumentTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.patientDocumentTable.id, id));
		getPatientDocuments().refresh();
		if (existing) {
			getPatientDocumentsByPatientIdWithRelations({
				patientId: existing.patientId
			}).refresh();
			getPatientDocumentsByVisitIdWithRelations({
				visitId: existing.visitId
			}).refresh();
		}
	}
);
