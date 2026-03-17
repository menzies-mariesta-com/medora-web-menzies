import { command, query } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PatientDiagnosisSchema,
	PatientDiagnosisSchemaInsert,
	PatientDiagnosisSchemaUpdate,
	PatientVisitSchema
} from '$lib/server/db/schema-type';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, desc, eq, ne } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';

export type PatientVitalWithVisit = PatientDiagnosisSchema & {
	visit: PatientVisitSchema | null;
};

/** Get all vitals for a patient across all visits, ordered by createdAt desc (newest first). */
export const getPatientVitalsByPatientId = query(
	'unchecked' as const,
	async (params: {
		patientId: string;
		hospitalId?: string;
	}): Promise<PatientVitalWithVisit[]> => {
		let whereExpr = eq(
			table.patientDiagnosisTable.patientId,
			params.patientId
		);
		whereExpr = and(
			whereExpr,
			ne(table.patientDiagnosisTable.statusId, StatusEnum.DELETED)
		) as typeof whereExpr;
		if (params.hospitalId) {
			whereExpr = and(
				whereExpr,
				eq(table.patientDiagnosisTable.hospitalId, params.hospitalId)
			) as typeof whereExpr;
		}
		const rows =
			await ensureDb().query.patientDiagnosisTable.findMany({
				where: whereExpr,
				with: { visit: true },
				orderBy: (t, { desc }) => desc(t.createdAt)
			});
		return rows as PatientVitalWithVisit[];
	}
);

/** Remote paginated table data for EMR vital page (filters + pagination done server-side). */
export const getPatientVitalsByPatientIdPaginated = query(
	'unchecked' as const,
	async (
		params: PaginationParams & {
			patientId: string;
			hospitalId?: string;
			visitNo?: string | null;
			statusId?: number | null;
		}
	): Promise<PaginatedResult<PatientVitalWithVisit>> => {
		const { page, pageSize } = normalizePagination(params);
		let whereExpr = eq(
			table.patientDiagnosisTable.patientId,
			params.patientId
		);
		whereExpr = and(
			whereExpr,
			ne(table.patientDiagnosisTable.statusId, StatusEnum.DELETED)
		) as typeof whereExpr;
		if (params.hospitalId) {
			whereExpr = and(
				whereExpr,
				eq(table.patientDiagnosisTable.hospitalId, params.hospitalId)
			) as typeof whereExpr;
		}
		if (params.statusId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.patientDiagnosisTable.statusId, params.statusId)
			) as typeof whereExpr;
		}

		const rows =
			await ensureDb().query.patientDiagnosisTable.findMany({
				where: whereExpr,
				with: { visit: true },
				orderBy: (t, { desc }) => desc(t.createdAt)
			});

		const visitNoTerm = params.visitNo?.trim().toLowerCase();
		const filtered = visitNoTerm
			? rows.filter((row) =>
					(row.visit?.visitNo ?? '')
						.toLowerCase()
						.includes(visitNoTerm)
				)
			: rows;

		const total = filtered.length;
		const offset = (page - 1) * pageSize;
		const data = filtered.slice(offset, offset + pageSize);
		return {
			data: data as PatientVitalWithVisit[],
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize) || 1
		};
	}
);

/** Get a single vital by id. */
export const getPatientVitalById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<PatientDiagnosisSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.patientDiagnosisTable)
			.where(
				and(
					eq(table.patientDiagnosisTable.id, id),
					ne(
						table.patientDiagnosisTable.statusId,
						StatusEnum.DELETED
					)
				)
			)
			.limit(1);
		return row ?? null;
	}
);

/** Get all vitals for a visit, ordered by createdAt desc (newest first). */
export const getPatientVitalsByVisitId = query(
	'unchecked' as const,
	async ({
		visitId
	}: {
		visitId: number;
	}): Promise<PatientDiagnosisSchema[]> => {
		return await ensureDb()
			.select()
			.from(table.patientDiagnosisTable)
			.where(
				and(
					eq(table.patientDiagnosisTable.visitId, visitId),
					ne(
						table.patientDiagnosisTable.statusId,
						StatusEnum.DELETED
					)
				)
			)
			.orderBy(desc(table.patientDiagnosisTable.createdAt));
	}
);

/** Create a new vital record. */
export const createPatientVital = command(
	'unchecked' as const,
	async (
		payload: PatientDiagnosisSchemaInsert
	): Promise<PatientDiagnosisSchema> => {
		const [row] = await ensureDb()
			.insert(table.patientDiagnosisTable)
			.values(payload)
			.returning();

		if (!row) throw new Error('Insert failed');

		getPatientVitalsByVisitId({ visitId: payload.visitId }).refresh();
		getPatientVitalsByPatientId({
			patientId: payload.patientId,
			hospitalId: payload.hospitalId
		}).refresh();
		return row;
	}
);

/** Update an existing vital record. */
export const updatePatientVital = command(
	'unchecked' as const,
	async ({
		id,
		...data
	}: {
		id: number;
	} & PatientDiagnosisSchemaUpdate): Promise<PatientDiagnosisSchema> => {
		const [existing] = await ensureDb()
			.select({
				patientId: table.patientDiagnosisTable.patientId,
				hospitalId: table.patientDiagnosisTable.hospitalId,
				visitId: table.patientDiagnosisTable.visitId
			})
			.from(table.patientDiagnosisTable)
			.where(eq(table.patientDiagnosisTable.id, id))
			.limit(1);
		if (!existing) throw new Error('Vital not found');
		const [row] = await ensureDb()
			.update(table.patientDiagnosisTable)
			.set(data)
			.where(eq(table.patientDiagnosisTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getPatientVitalsByVisitId({
			visitId: existing.visitId
		}).refresh();
		getPatientVitalsByPatientId({
			patientId: existing.patientId,
			hospitalId: existing.hospitalId
		}).refresh();
		return row;
	}
);

/** Delete a vital record. */
export const deletePatientVital = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		const [existing] = await ensureDb()
			.select({
				patientId: table.patientDiagnosisTable.patientId,
				hospitalId: table.patientDiagnosisTable.hospitalId,
				visitId: table.patientDiagnosisTable.visitId
			})
			.from(table.patientDiagnosisTable)
			.where(eq(table.patientDiagnosisTable.id, id))
			.limit(1);
		if (!existing) throw new Error('Vital not found');
		await ensureDb()
			.update(table.patientDiagnosisTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.patientDiagnosisTable.id, id));
		getPatientVitalsByVisitId({
			visitId: existing.visitId
		}).refresh();
		getPatientVitalsByPatientId({
			patientId: existing.patientId,
			hospitalId: existing.hospitalId
		}).refresh();
	}
);
