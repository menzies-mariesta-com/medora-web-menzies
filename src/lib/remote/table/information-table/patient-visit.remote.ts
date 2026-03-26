import { command, query, getRequestEvent } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

import type {
	PatientVisitSchema,
	PatientVisitSchemaInsert,
	PatientVisitSchemaUpdate
} from '$lib/server/db/schema-type';

import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';

import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ne, ilike, or, sql } from 'drizzle-orm';
import { StaffTypeEnum, StatusEnum } from '$lib/model/enum/db-link';
import { error } from '@sveltejs/kit';
const BRANCH_ALL_VALUE = '__all__';

/* =========================================================
   TYPES
========================================================= */

export const getPatientVisitWithRelations = query(async () => {
	return ensureDb().query.patientVisitTable.findMany({
		with: {
			patient: { with: { title: true, gender: true } },
			status: true,
			visitType: true,
			hospital: true,
			branch: true,
			doctor: {
				with: { title: true, specialization: true, staffDetail: true }
			},
			appointment: true,
			diagnoses: true,
			patientDocuments: true
		}
	});
});

export type PatientVisitWithRelations = Awaited<
	ReturnType<typeof getPatientVisitWithRelations>
>[number];

function getSelectedBranchFromRequest(): string | null {
	try {
		const event = getRequestEvent();
		const raw = event.cookies.get('heka_selected_branch_id') ?? null;
		return raw === BRANCH_ALL_VALUE ? null : raw;
	} catch {
		return null;
	}
}

/**
 * When the logged-in user is a Doctor (staff_type DOCTOR), EMR visit list must only
 * include visits where they are the attending doctor OR they are the receiving
 * doctor on a non-cancelled referral for that visit.
 */
function getDoctorEmrVisitScopeFilter(): ReturnType<typeof or> | null {
	try {
		const event = getRequestEvent();
		const staff = event.locals.staff;
		if (!staff || staff.staffTypeId !== StaffTypeEnum.DOCTOR) {
			return null;
		}
		const doctorId = staff.id;
		return or(
			eq(table.patientVisitTable.doctorId, doctorId),
			sql`EXISTS (
				SELECT 1 FROM refer_history rh
				WHERE rh.visit_id = ${table.patientVisitTable.id}
				AND rh.to_refer_doctorid = ${doctorId}
				AND rh.cancel_at IS NULL
			)`
		);
	} catch {
		return null;
	}
}

/* =========================================================
   BASIC CRUD & HELPERS
========================================================= */

/**
 * Generate next visitNo in the format:
 *   VisitTypeCode + YY (year, last 2 digits) + HospitalCode + '-' + BranchCode + Order
 * Example: I26THH-ISN000001
 */
export const getNextVisitNo = query(
	'unchecked' as const,
	async ({
		hospitalId,
		branchId,
		visitTypeId
	}: {
		hospitalId: string;
		branchId: string;
		visitTypeId: number;
	}): Promise<string> => {
		const [hospital, branch, visitType] = await Promise.all([
			ensureDb().query.hospitalTable.findFirst({
				where: (t, { eq }) => eq(t.id, hospitalId)
			}),
			ensureDb().query.hospitalBranchTable.findFirst({
				where: (t, { eq }) => eq(t.id, branchId)
			}),
			ensureDb().query.visitTypeTable.findFirst({
				where: (t, { eq }) => eq(t.id, visitTypeId)
			})
		]);

		if (!hospital)
			throw error(
				400,
				'Hospital is required to generate visit number.'
			);
		if (!branch)
			throw error(
				400,
				'Branch is required to generate visit number.'
			);
		if (!visitType)
			throw error(
				400,
				'Visit type is required to generate visit number.'
			);

		const hospitalCode = (
			hospital.code?.trim() || hospitalId.substring(0, 3)
		).toUpperCase();
		const branchCode = (branch.code?.trim() || 'MAIN').toUpperCase();
		const visitTypeCode = (
			visitType.code?.trim() || 'V'
		).toUpperCase();

		const fullYear = new Date().getFullYear();
		const yearSuffix = String(fullYear).slice(-2);

		const counter = table.hospitalVisitCodeCounterTable;
		const [row] = await ensureDb()
			.insert(counter)
			.values({
				hospitalId,
				branchId,
				visitTypeId,
				year: fullYear,
				lastNumber: 1
			})
			.onConflictDoUpdate({
				target: [
					counter.hospitalId,
					counter.branchId,
					counter.visitTypeId,
					counter.year
				],
				set: { lastNumber: sql`${counter.lastNumber} + 1` }
			})
			.returning({ lastNumber: counter.lastNumber });

		const nextNumber = row?.lastNumber ?? 1;
		const orderPart = String(nextNumber).padStart(6, '0');

		return `${visitTypeCode}${yearSuffix}${hospitalCode}-${branchCode}${orderPart}`;
	}
);

// Get All
export const getPatientVisit = query(
	async (): Promise<PatientVisitSchema[]> => {
		return await ensureDb()
			.select()
			.from(table.patientVisitTable)
			.where(
				ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
			);
	}
);

// Get by ID
export const getPatientVisitById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<PatientVisitSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.patientVisitTable)
			.where(
				and(
					eq(table.patientVisitTable.id, id),
					ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
				)
			);
		return row ?? null;
	}
);

// Get by ID with relations (for visit info display)
export const getPatientVisitByIdWithRelations = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<PatientVisitWithRelations | null> => {
		const row = await ensureDb().query.patientVisitTable.findFirst({
			where: (t, { eq }) => eq(t.id, id),
			with: {
				patient: { with: { title: true, gender: true } },
				status: true,
				visitType: true,
				hospital: true,
				branch: true,
				doctor: {
					with: {
						title: true,
						specialization: true,
						staffDetail: true
					}
				},
				appointment: true,
				diagnoses: true,
				patientDocuments: true
			}
		});
		return row as PatientVisitWithRelations | null;
	}
);

// Create
export const createPatientVisit = command(
	'unchecked' as const,
	async (
		payload: Omit<
			PatientVisitSchemaInsert,
			'branchId' | 'visitNo'
		> & {
			branchId?: string | null;
		}
	): Promise<PatientVisitSchema> => {
		const selectedBranchId = getSelectedBranchFromRequest();
		const branchId = payload.branchId ?? selectedBranchId ?? null;
		if (!branchId)
			throw error(400, 'Branch is required to create patient visit');

		if (!payload.hospitalId) {
			throw error(
				400,
				'Hospital is required to create patient visit'
			);
		}
		if (!payload.visitTypeId) {
			throw error(
				400,
				'Visit type is required to create patient visit'
			);
		}

		const visitNo = await getNextVisitNo({
			hospitalId: payload.hospitalId,
			branchId,
			visitTypeId: payload.visitTypeId
		});

		const values: PatientVisitSchemaInsert = {
			...payload,
			branchId,
			visitNo
		};
		const [row] = await ensureDb()
			.insert(table.patientVisitTable)
			.values(values)
			.returning();

		if (!row) throw new Error('Insert failed');

		getPatientVisit().refresh();
		return row;
	}
);

// Update
export const updatePatientVisit = command(
	'unchecked' as const,
	async (
		payload: { id: number } & PatientVisitSchemaUpdate
	): Promise<PatientVisitSchema> => {
		const { id, ...rest } = payload;

		const [row] = await ensureDb()
			.update(table.patientVisitTable)
			.set(rest)
			.where(eq(table.patientVisitTable.id, id))
			.returning();

		if (!row) throw new Error('Update failed');

		getPatientVisit().refresh();
		getPatientVisitById({ id }).refresh();
		return row;
	}
);

/* =========================================================
   EMR PAGINATED QUERY
========================================================= */

export const getPatientVisitPaginatedForEmr = query(
	'unchecked' as const,
	async (
		params?: PaginationParams & {
			hospitalId?: string;
			patientName?: string;
			patientCode?: string;
			hospitalName?: string;
			branchName?: string;
			doctorName?: string;
			visitTypeId?: number | null;
		}
	): Promise<PaginatedResult<PatientVisitWithRelations>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);

		let whereExpr: any = ne(
			table.patientVisitTable.statusId,
			StatusEnum.DELETED
		);

		// Hospital filter
		if (params?.hospitalId) {
			whereExpr = and(
				whereExpr,
				eq(table.patientVisitTable.hospitalId, params.hospitalId)
			);
		}

		// Selected branch filter (from cookie: when user picks a branch in the module bar, restrict to that branch)
		const selectedBranchId = getSelectedBranchFromRequest();
		if (selectedBranchId) {
			whereExpr = and(
				whereExpr,
				eq(table.patientVisitTable.branchId, selectedBranchId)
			);
		}

		// Global search (optional; when no specific filters are used)
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

		// Specific column filters (each filters only its own field)
		const patientCodeTerm = params?.patientCode?.trim();
		if (patientCodeTerm) {
			const pattern = `%${patientCodeTerm}%`;
			whereExpr = and(
				whereExpr,
				sql`${table.patientVisitTable.patientId} IN (
					SELECT id FROM patient WHERE code ILIKE ${pattern}
				)` as any
			);
		}

		const patientNameTerm = params?.patientName?.trim();
		if (patientNameTerm) {
			const pattern = `%${patientNameTerm}%`;
			whereExpr = and(
				whereExpr,
				sql`${table.patientVisitTable.patientId} IN (
					SELECT id FROM patient
					WHERE concat_ws(' ', first_name, middle_name, last_name) ILIKE ${pattern}
				)` as any
			);
		}

		const hospitalNameTerm = params?.hospitalName?.trim();
		if (hospitalNameTerm) {
			const pattern = `%${hospitalNameTerm}%`;
			whereExpr = and(
				whereExpr,
				sql`${table.patientVisitTable.hospitalId} IN (
					SELECT id FROM hospital WHERE name ILIKE ${pattern}
				)` as any
			);
		}

		const branchNameTerm = params?.branchName?.trim();
		if (branchNameTerm) {
			const pattern = `%${branchNameTerm}%`;
			whereExpr = and(
				whereExpr,
				sql`${table.patientVisitTable.branchId} IN (
					SELECT id FROM hospital_branch WHERE name ILIKE ${pattern}
				)` as any
			);
		}

		const doctorNameTerm = params?.doctorName?.trim();
		if (doctorNameTerm) {
			const pattern = `%${doctorNameTerm}%`;
			whereExpr = and(
				whereExpr,
				sql`${table.patientVisitTable.doctorId} IN (
					SELECT id FROM staff
					WHERE concat_ws(' ', first_name, middle_name, last_name) ILIKE ${pattern}
				)` as any
			);
		}

		// Visit Type filter
		if (params?.visitTypeId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.patientVisitTable.visitTypeId, params.visitTypeId)
			);
		}

		const doctorScope = getDoctorEmrVisitScopeFilter();
		if (doctorScope) {
			whereExpr = and(whereExpr, doctorScope);
		}

		const [data, countResult] = await Promise.all([
			ensureDb().query.patientVisitTable.findMany({
				where: whereExpr,
				with: {
					patient: { with: { title: true, gender: true } },
					status: true,
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
				},
				orderBy: (t, { desc }) => desc(t.createdAt),
				limit,
				offset
			}),
			ensureDb()
				.select({ count: count() })
				.from(table.patientVisitTable)
				.where(whereExpr)
		]);

		const total = countResult[0]?.count ?? 0;

		return {
			data: data as PatientVisitWithRelations[],
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize) || 1
		};
	}
);
