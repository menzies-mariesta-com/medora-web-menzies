import type { RequestEvent } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import { AllergyEnum, StaffTypeEnum, StatusEnum } from '$lib/model/enum/db-link';
import { VITAL_REFERENCE_RANGES } from '$lib/config/vital.config';
import { normalizePagination, type PaginationParams, type PaginatedResult } from '$lib/model/type/pagination.type';
import { and, count, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm';
import type { PatientVisitForEmrList, VisitStatusCode, VisitTypeOption } from '$lib/model/type/heka/emr/visit-list.type';

const BRANCH_ALL_VALUE = '__all__';

function getSelectedBranchId(event: RequestEvent): string | null {
	const raw = event.cookies.get('heka_selected_branch_id') ?? null;
	return raw === BRANCH_ALL_VALUE ? null : raw;
}

async function getVisitStatusTaggingIds(db = ensureDb()): Promise<{
	openId: number | null;
	vitalId: number | null;
	seenId: number | null;
	closedId: number | null;
}> {
	const rows = await db
		.select({
			id: table.statusTaggingTable.id,
			code: table.statusTaggingTable.code
		})
		.from(table.statusTaggingTable)
		.leftJoin(
			table.statusTaggingTypeTable,
			eq(table.statusTaggingTable.statusTaggingTypeId, table.statusTaggingTypeTable.id)
		)
		.where(sql`${table.statusTaggingTypeTable.name} ILIKE 'Visit'`);

	const byCode = new Map<string, number>();
	for (const r of rows) {
		if (r.code && r.id != null) byCode.set(String(r.code), r.id);
	}

	return {
		openId: byCode.get('open') ?? null,
		vitalId: byCode.get('vital') ?? null,
		seenId: byCode.get('seen') ?? null,
		closedId: byCode.get('closed') ?? null
	};
}

function getDoctorEmrVisitScopeFilter(event: RequestEvent): ReturnType<typeof or> | null {
	const staff = event.locals.staff;
	if (!staff || staff.staffTypeId !== StaffTypeEnum.DOCTOR) return null;

	const doctorId = staff.id;
	return or(
		eq(table.patientVisitTable.doctorId, doctorId),
		sql`EXISTS (
			SELECT 1 FROM refer_history rh
			WHERE rh.visit_id = ${table.patientVisitTable.id}
			AND rh.to_refer_doctorid = ${doctorId}
			AND rh.cancel_at IS NULL
			AND rh.accept_at IS NOT NULL
		)`
	);
}

function resolveVisitStatusCode(params: {
	hasVitals: boolean;
	statusTaggingId: number | null | undefined;
	tagging: Awaited<ReturnType<typeof getVisitStatusTaggingIds>>;
}): VisitStatusCode {
	if (params.tagging.closedId != null && params.statusTaggingId === params.tagging.closedId)
		return 'closed';
	if (params.tagging.seenId != null && params.statusTaggingId === params.tagging.seenId)
		return 'seen';
	if (params.hasVitals) return 'vital';
	return 'open';
}

export async function getVisitTypes(): Promise<VisitTypeOption[]> {
	return ensureDb()
		.select({ id: table.visitTypeTable.id, name: table.visitTypeTable.name })
		.from(table.visitTypeTable)
		.where(ne(table.visitTypeTable.statusId, StatusEnum.DELETED))
		.orderBy(table.visitTypeTable.name);
}

export async function getActivePatientAllergiesPatientIdsByPatientIds(params: {
	patientIds: string[];
}): Promise<string[]> {
	const ids = params.patientIds.map(String).filter((id) => id.trim() !== '');
	if (ids.length === 0) return [];

	const rows = await ensureDb()
		.select({ patientId: table.patientAllergyTable.patientId })
		.from(table.patientAllergyTable)
		.where(
			and(
				inArray(table.patientAllergyTable.patientId, ids),
				eq(table.patientAllergyTable.statusId, StatusEnum.ACTIVE),
				ne(table.patientAllergyTable.allergyId, AllergyEnum.NO_KNOWN_ALLERGY)
			)
		);

	return Array.from(new Set(rows.map((r) => r.patientId)));
}

export async function getAbnormalVitalVisitIdsByVisitIds(params: {
	visitIds: number[];
}): Promise<number[]> {
	const ids = params.visitIds.filter((id) => Number.isInteger(id) && id > 0);
	if (ids.length === 0) return [];

	const pd = table.patientDiagnosisTable;
	const rows = await ensureDb()
		.select({ visitId: pd.visitId })
		.from(pd)
		.where(
			and(
				inArray(pd.visitId, ids),
				ne(pd.statusId, StatusEnum.DELETED),
				sql`(
					(${pd.temperature} IS NOT NULL AND (${pd.temperature} < ${VITAL_REFERENCE_RANGES.temperature.min} OR ${pd.temperature} > ${VITAL_REFERENCE_RANGES.temperature.max}))
					OR (${pd.respiration} IS NOT NULL AND (${pd.respiration} < ${VITAL_REFERENCE_RANGES.respiration.min} OR ${pd.respiration} > ${VITAL_REFERENCE_RANGES.respiration.max}))
					OR (${pd.pulse} IS NOT NULL AND (${pd.pulse} < ${VITAL_REFERENCE_RANGES.pulse.min} OR ${pd.pulse} > ${VITAL_REFERENCE_RANGES.pulse.max}))
					OR (${pd.bpSystolic} IS NOT NULL AND (${pd.bpSystolic} < ${VITAL_REFERENCE_RANGES.bpSystolic.min} OR ${pd.bpSystolic} > ${VITAL_REFERENCE_RANGES.bpSystolic.max}))
					OR (${pd.bpDiastolic} IS NOT NULL AND (${pd.bpDiastolic} < ${VITAL_REFERENCE_RANGES.bpDiastolic.min} OR ${pd.bpDiastolic} > ${VITAL_REFERENCE_RANGES.bpDiastolic.max}))
					OR (${pd.spO2} IS NOT NULL AND (${pd.spO2} < ${VITAL_REFERENCE_RANGES.spO2.min} OR ${pd.spO2} > ${VITAL_REFERENCE_RANGES.spO2.max}))
					OR (${pd.rbs} IS NOT NULL AND (${pd.rbs} < ${VITAL_REFERENCE_RANGES.rbs.min} OR ${pd.rbs} > ${VITAL_REFERENCE_RANGES.rbs.max}))
					OR (${pd.bmi} IS NOT NULL AND (${pd.bmi} < ${VITAL_REFERENCE_RANGES.bmi.min} OR ${pd.bmi} > ${VITAL_REFERENCE_RANGES.bmi.max}))
				)`
			)
		);

	return Array.from(new Set(rows.map((r) => r.visitId)));
}

export async function markPatientVisitSeenOnDoctorSelect(
	event: RequestEvent,
	params: { visitId: number }
): Promise<void> {
	const staff = event.locals.staff;
	if (!staff || staff.staffTypeId !== StaffTypeEnum.DOCTOR) return;

	const visitStatusTagging = await getVisitStatusTaggingIds();
	if (visitStatusTagging.seenId == null) return;

	const [current] = await ensureDb()
		.select({ statusTaggingId: table.patientVisitTable.statusTaggingId })
		.from(table.patientVisitTable)
		.where(eq(table.patientVisitTable.id, params.visitId))
		.limit(1);
	if (!current) return;

	if (visitStatusTagging.closedId != null && current.statusTaggingId === visitStatusTagging.closedId)
		return;
	if (current.statusTaggingId === visitStatusTagging.seenId) return;

	await ensureDb()
		.update(table.patientVisitTable)
		.set({ statusTaggingId: visitStatusTagging.seenId })
		.where(eq(table.patientVisitTable.id, params.visitId));
}

export async function getPatientVisitByIdForDisplay(
	event: RequestEvent,
	params: { hospitalId: string; visitId: number }
) {
	await ensureCanAccessHospital(event, params.hospitalId);
	return ensureDb().query.patientVisitTable.findFirst({
		where: and(
			eq(table.patientVisitTable.id, params.visitId),
			eq(table.patientVisitTable.hospitalId, params.hospitalId),
			ne(table.patientVisitTable.statusId, StatusEnum.DELETED),
			ne(table.patientVisitTable.statusId, StatusEnum.INACTIVE)
		),
		with: {
			patient: { with: { title: true, gender: true } },
			visitType: true,
			hospital: true,
			branch: true,
			doctor: {
				with: {
					title: true,
					specialization: true,
					staffDetail: true
				}
			}
		}
	});
}

export async function getPatientVisitPaginatedForEmr(
	event: RequestEvent,
	params?: PaginationParams & {
		hospitalId?: string;
		visitNo?: string;
		patientName?: string;
		patientCode?: string;
		hospitalName?: string;
		branchName?: string;
		doctorName?: string;
		visitTypeId?: number | null;
		visitStatus?: VisitStatusCode;
	}
): Promise<PaginatedResult<PatientVisitForEmrList>> {
	const { page, pageSize, limit, offset } = normalizePagination(params);

	// Hide soft-deleted and inactive (e.g. appointment cancel after check-in) visits.
	let whereExpr: any = and(
		ne(table.patientVisitTable.statusId, StatusEnum.DELETED),
		ne(table.patientVisitTable.statusId, StatusEnum.INACTIVE)
	);

	if (params?.hospitalId) {
		whereExpr = and(whereExpr, eq(table.patientVisitTable.hospitalId, params.hospitalId));
	}

	const selectedBranchId = getSelectedBranchId(event);
	if (selectedBranchId) {
		whereExpr = and(whereExpr, eq(table.patientVisitTable.branchId, selectedBranchId));
	}

	const searchTerm = params?.search?.trim();
	if (searchTerm) {
		const pattern = `%${searchTerm}%`;
		whereExpr = and(
			whereExpr,
			or(
				ilike(table.patientVisitTable.visitNo, pattern),
				sql`patient_visit.patient_id IN (
					SELECT id FROM patient
					WHERE code ILIKE ${pattern}
					OR concat_ws(' ', first_name, middle_name, last_name) ILIKE ${pattern}
				)`,
				sql`patient_visit.doctor_id IN (
					SELECT id FROM staff
					WHERE concat_ws(' ', first_name, middle_name, last_name) ILIKE ${pattern}
				)`
			) as any
		);
	}

	const visitNoTerm = params?.visitNo?.trim();
	if (visitNoTerm) {
		whereExpr = and(whereExpr, ilike(table.patientVisitTable.visitNo, `%${visitNoTerm}%`));
	}

	const patientCodeTerm = params?.patientCode?.trim();
	if (patientCodeTerm) {
		whereExpr = and(
			whereExpr,
			sql`${table.patientVisitTable.patientId} IN (
				SELECT id FROM patient WHERE code ILIKE ${`%${patientCodeTerm}%`}
			)` as any
		);
	}

	const patientNameTerm = params?.patientName?.trim();
	if (patientNameTerm) {
		whereExpr = and(
			whereExpr,
			sql`${table.patientVisitTable.patientId} IN (
				SELECT id FROM patient
				WHERE concat_ws(' ', first_name, middle_name, last_name) ILIKE ${`%${patientNameTerm}%`}
			)` as any
		);
	}

	const hospitalNameTerm = params?.hospitalName?.trim();
	if (hospitalNameTerm) {
		whereExpr = and(
			whereExpr,
			sql`${table.patientVisitTable.hospitalId} IN (
				SELECT id FROM hospital WHERE name ILIKE ${`%${hospitalNameTerm}%`}
			)` as any
		);
	}

	const branchNameTerm = params?.branchName?.trim();
	if (branchNameTerm) {
		whereExpr = and(
			whereExpr,
			sql`${table.patientVisitTable.branchId} IN (
				SELECT id FROM hospital_branch WHERE name ILIKE ${`%${branchNameTerm}%`}
			)` as any
		);
	}

	const doctorNameTerm = params?.doctorName?.trim();
	if (doctorNameTerm) {
		whereExpr = and(
			whereExpr,
			sql`${table.patientVisitTable.doctorId} IN (
				SELECT id FROM staff
				WHERE concat_ws(' ', first_name, middle_name, last_name) ILIKE ${`%${doctorNameTerm}%`}
			)` as any
		);
	}

	if (params?.visitTypeId != null) {
		whereExpr = and(whereExpr, eq(table.patientVisitTable.visitTypeId, params.visitTypeId));
	}

	const tagging = await getVisitStatusTaggingIds();
	const visitStatus = params?.visitStatus;
	if (visitStatus) {
		if (visitStatus === 'seen') {
			whereExpr = and(
				whereExpr,
				tagging.seenId != null ? eq(table.patientVisitTable.statusTaggingId, tagging.seenId) : (sql`1=0` as any)
			);
		} else if (visitStatus === 'vital') {
			whereExpr = and(
				whereExpr,
				tagging.seenId != null
					? (sql`${table.patientVisitTable.statusTaggingId} IS DISTINCT FROM ${tagging.seenId}` as any)
					: (sql`1=1` as any),
				tagging.closedId != null
					? (sql`${table.patientVisitTable.statusTaggingId} IS DISTINCT FROM ${tagging.closedId}` as any)
					: (sql`1=1` as any),
				sql`EXISTS (
					SELECT 1 FROM patient_diagnosis pd
					WHERE pd.visit_id = ${table.patientVisitTable.id}
					AND pd.vital_date_time IS NOT NULL
					AND pd.status_id <> ${StatusEnum.DELETED}
				)` as any
			);
		} else if (visitStatus === 'open') {
			whereExpr = and(
				whereExpr,
				tagging.seenId != null
					? (sql`${table.patientVisitTable.statusTaggingId} IS DISTINCT FROM ${tagging.seenId}` as any)
					: (sql`1=1` as any),
				tagging.closedId != null
					? (sql`${table.patientVisitTable.statusTaggingId} IS DISTINCT FROM ${tagging.closedId}` as any)
					: (sql`1=1` as any),
				sql`NOT EXISTS (
					SELECT 1 FROM patient_diagnosis pd
					WHERE pd.visit_id = ${table.patientVisitTable.id}
					AND pd.vital_date_time IS NOT NULL
					AND pd.status_id <> ${StatusEnum.DELETED}
				)` as any
			);
		} else if (visitStatus === 'closed') {
			whereExpr = tagging.closedId != null ? and(whereExpr, eq(table.patientVisitTable.statusTaggingId, tagging.closedId)) : and(whereExpr, sql`1=0` as any);
		}
	}

	const doctorScope = getDoctorEmrVisitScopeFilter(event);
	if (doctorScope) whereExpr = and(whereExpr, doctorScope);

	const [data, countResult] = await Promise.all([
		ensureDb().query.patientVisitTable.findMany({
			where: whereExpr,
			with: {
				patient: { with: { title: true, gender: true } },
				visitType: true,
				hospital: true,
				branch: true,
				doctor: { with: { title: true } }
			},
			orderBy: (t, { desc }) => desc(t.createdAt),
			limit,
			offset
		}),
		ensureDb().select({ count: count() }).from(table.patientVisitTable).where(whereExpr)
	]);

	const visitIds = data.map((d) => d.id).filter((id): id is number => id != null);
	const vitalsByVisitId = new Set<number>();
	if (visitIds.length) {
		const vitalRows = await ensureDb()
			.select({ visitId: table.patientDiagnosisTable.visitId })
			.from(table.patientDiagnosisTable)
			.where(
				and(
					inArray(table.patientDiagnosisTable.visitId, visitIds),
					sql`${table.patientDiagnosisTable.vitalDateTime} IS NOT NULL` as any,
					ne(table.patientDiagnosisTable.statusId, StatusEnum.DELETED)
				)
			);
		for (const r of vitalRows) vitalsByVisitId.add(r.visitId);
	}

	const dataWithStatus: PatientVisitForEmrList[] = data.map((row: any) => {
		const hasVitals = vitalsByVisitId.has(row.id);
		const visitStatus = resolveVisitStatusCode({
			hasVitals,
			statusTaggingId: row.statusTaggingId as number | null | undefined,
			tagging
		});
		return { ...row, visitStatus } as PatientVisitForEmrList;
	});

	const total = countResult[0]?.count ?? 0;
	return {
		data: dataWithStatus,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize) || 1
	};
}

