import { error, type RequestEvent } from '@sveltejs/kit';
import { and, count, desc, eq, ilike, ne, sql } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import { StatusEnum } from '$lib/model/enum/db-link';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import type { PatientDiagnosisSchema } from '$lib/server/db/schema-type';

export type PatientVitalWithVisit = PatientDiagnosisSchema & {
	visit?: { id: number; visitNo: string | null } | null;
};

function requireUser(event: RequestEvent): void {
	if (!event.locals?.user) throw error(401, 'Unauthorized');
}

export async function getVisitBasicsForVital(
	event: RequestEvent,
	input: { hospitalId: string; visitId: number }
): Promise<{ patientId: string; hospitalId: string } | null> {
	requireUser(event);
	await ensureCanAccessHospital(event, input.hospitalId);

	const row = await ensureDb().query.patientVisitTable.findFirst({
		where: (t, { and, eq, ne }) =>
			and(
				eq(t.id, input.visitId),
				eq(t.hospitalId, input.hospitalId),
				ne(t.statusId, StatusEnum.DELETED)
			),
		columns: { patientId: true, hospitalId: true }
	});
	if (!row?.patientId || !row.hospitalId) return null;
	return { patientId: row.patientId, hospitalId: row.hospitalId };
}

export async function getPatientVitalById(
	event: RequestEvent,
	input: { hospitalId: string; id: number }
): Promise<PatientDiagnosisSchema | null> {
	requireUser(event);
	await ensureCanAccessHospital(event, input.hospitalId);

	const row = await ensureDb().query.patientDiagnosisTable.findFirst({
		where: (t, { and, eq, ne }) =>
			and(
				eq(t.id, input.id),
				eq(t.hospitalId, input.hospitalId),
				ne(t.statusId, StatusEnum.DELETED)
			)
	});
	return row ?? null;
}

export async function getPatientVitalsByVisitId(
	event: RequestEvent,
	input: {
		hospitalId: string;
		visitId: number;
		statusId?: number | null;
	}
): Promise<PatientDiagnosisSchema[]> {
	requireUser(event);
	await ensureCanAccessHospital(event, input.hospitalId);

	const statusFilter =
		input.statusId != null
			? eq(table.patientDiagnosisTable.statusId, input.statusId)
			: null;

	const whereExpr =
		statusFilter != null
			? and(
					eq(
						table.patientDiagnosisTable.hospitalId,
						input.hospitalId
					),
					eq(table.patientDiagnosisTable.visitId, input.visitId),
					ne(
						table.patientDiagnosisTable.statusId,
						StatusEnum.DELETED
					),
					statusFilter
				)
			: and(
					eq(
						table.patientDiagnosisTable.hospitalId,
						input.hospitalId
					),
					eq(table.patientDiagnosisTable.visitId, input.visitId),
					ne(table.patientDiagnosisTable.statusId, StatusEnum.DELETED)
				);

	return ensureDb()
		.select()
		.from(table.patientDiagnosisTable)
		.where(whereExpr)
		.orderBy(
			desc(table.patientDiagnosisTable.vitalDateTime),
			desc(table.patientDiagnosisTable.createdAt)
		);
}

export async function getPatientVitalsByPatientIdPaginated(
	event: RequestEvent,
	params: PaginationParams & {
		hospitalId: string;
		patientId: string;
		visitNo?: string | null;
		statusId?: number | null;
	}
): Promise<PaginatedResult<PatientVitalWithVisit>> {
	requireUser(event);
	await ensureCanAccessHospital(event, params.hospitalId);
	const { page, pageSize, limit, offset } =
		normalizePagination(params);

	const conditions = [
		eq(table.patientDiagnosisTable.hospitalId, params.hospitalId),
		eq(table.patientDiagnosisTable.patientId, params.patientId),
		ne(table.patientDiagnosisTable.statusId, StatusEnum.DELETED)
	];
	if (params.statusId != null) {
		conditions.push(
			eq(table.patientDiagnosisTable.statusId, params.statusId)
		);
	}
	const visitNoTerm = params.visitNo?.trim();
	if (visitNoTerm) {
		conditions.push(
			ilike(table.patientVisitTable.visitNo, `%${visitNoTerm}%`)
		);
	}

	const whereExpr = and(...conditions);

	const [data, countResult] = await Promise.all([
		ensureDb()
			.select({
				vital: table.patientDiagnosisTable,
				visit: {
					id: table.patientVisitTable.id,
					visitNo: table.patientVisitTable.visitNo
				}
			})
			.from(table.patientDiagnosisTable)
			.innerJoin(
				table.patientVisitTable,
				eq(
					table.patientVisitTable.id,
					table.patientDiagnosisTable.visitId
				)
			)
			.where(whereExpr)
			.orderBy(
				desc(
					sql`coalesce(${table.patientDiagnosisTable.vitalDateTime}, ${table.patientDiagnosisTable.createdAt})`
				)
			)
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.patientDiagnosisTable)
			.innerJoin(
				table.patientVisitTable,
				eq(
					table.patientVisitTable.id,
					table.patientDiagnosisTable.visitId
				)
			)
			.where(whereExpr)
	]);

	return {
		data: data.map((r) => ({
			...(r.vital as unknown as PatientDiagnosisSchema),
			visit: r.visit ?? null
		})),
		total: countResult[0]?.count ?? 0,
		page,
		pageSize,
		totalPages:
			Math.ceil((countResult[0]?.count ?? 0) / pageSize) || 1
	};
}

export async function createPatientVital(
	event: RequestEvent,
	input: Omit<
		PatientDiagnosisSchema,
		'id' | 'createdAt' | 'updatedAt'
	> & {
		hospitalId: string;
		patientId: string;
		visitId: number;
	}
): Promise<PatientDiagnosisSchema> {
	requireUser(event);
	await ensureCanAccessHospital(event, input.hospitalId);

	const [row] = await ensureDb()
		.insert(table.patientDiagnosisTable)
		.values({
			...input,
			createdBy: event.locals.user?.id ?? null,
			updatedBy: event.locals.user?.id ?? null
		} as any)
		.returning();
	if (!row) throw error(500, 'Failed to create vital');
	return row;
}

export async function updatePatientVital(
	event: RequestEvent,
	input: Partial<
		Omit<PatientDiagnosisSchema, 'id' | 'createdAt' | 'updatedAt'>
	> & {
		hospitalId: string;
		id: number;
	}
): Promise<PatientDiagnosisSchema> {
	requireUser(event);
	await ensureCanAccessHospital(event, input.hospitalId);

	const { id, hospitalId: _hid, ...patch } = input;
	const [row] = await ensureDb()
		.update(table.patientDiagnosisTable)
		.set({
			...patch,
			updatedBy: event.locals.user?.id ?? null
		} as any)
		.where(
			and(
				eq(table.patientDiagnosisTable.id, id),
				eq(table.patientDiagnosisTable.hospitalId, input.hospitalId),
				ne(table.patientDiagnosisTable.statusId, StatusEnum.DELETED)
			)
		)
		.returning();
	if (!row) throw error(404, 'Vital not found');
	return row;
}

export async function deletePatientVital(
	event: RequestEvent,
	input: { hospitalId: string; id: number }
): Promise<void> {
	requireUser(event);
	await ensureCanAccessHospital(event, input.hospitalId);

	await ensureDb()
		.update(table.patientDiagnosisTable)
		.set({
			statusId: StatusEnum.DELETED,
			updatedBy: event.locals.user?.id ?? null
		} as any)
		.where(
			and(
				eq(table.patientDiagnosisTable.id, input.id),
				eq(table.patientDiagnosisTable.hospitalId, input.hospitalId)
			)
		);
}
