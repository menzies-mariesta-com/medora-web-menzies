import { query } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PatientVisitSchema,
	PatientSchema,
	HospitalSchema,
	HospitalBranchSchema,
	StaffSchema
} from '$lib/server/db/schema-type';
import type {
	StatusSchema,
	VisitTypeSchema
} from '$lib/server/db/table/master-table/master-table-schema-type';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ne, ilike, or, sql } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';

export type PatientVisitWithRelations = PatientVisitSchema & {
	patient: PatientSchema | null;
	status: StatusSchema | null;
	visitType: VisitTypeSchema | null;
	hospital: HospitalSchema | null;
	branch: HospitalBranchSchema | null;
	doctor: StaffSchema | null;
};

/**
 * Paginated list of patient visits with basic relations (patient, status, visitType),
 * filtered by hospital and excluding DELETED visits.
 */
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
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const hospitalId = params?.hospitalId;

		let whereExpr: any = ne(table.patientVisitTable.statusId, StatusEnum.DELETED);

		if (hospitalId != null && hospitalId !== '') {
			whereExpr = and(whereExpr, eq(table.patientVisitTable.hospitalId, hospitalId));
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

		const patientName = params?.patientName?.trim();
		if (patientName) {
			const pattern = `%${patientName}%`;
			whereExpr = and(
				whereExpr,
				sql`patient_visit.patient_id IN (
					SELECT id FROM patient
					WHERE concat_ws(' ', first_name, middle_name, last_name) ILIKE ${pattern}
				)` as any
			);
		}

		const patientCode = params?.patientCode?.trim();
		if (patientCode) {
			const pattern = `%${patientCode}%`;
			whereExpr = and(
				whereExpr,
				sql`patient_visit.patient_id IN (
					SELECT id FROM patient
					WHERE code ILIKE ${pattern}
				)` as any
			);
		}

		const hospitalName = params?.hospitalName?.trim();
		if (hospitalName) {
			const pattern = `%${hospitalName}%`;
			whereExpr = and(
				whereExpr,
				sql`patient_visit.hospital_id IN (
					SELECT id FROM hospital
					WHERE name ILIKE ${pattern}
				)` as any
			);
		}

		const branchName = params?.branchName?.trim();
		if (branchName) {
			const pattern = `%${branchName}%`;
			whereExpr = and(
				whereExpr,
				sql`patient_visit.branch_id IN (
					SELECT id FROM hospital_branch
					WHERE name ILIKE ${pattern}
				)` as any
			);
		}

		const doctorName = params?.doctorName?.trim();
		if (doctorName) {
			const pattern = `%${doctorName}%`;
			whereExpr = and(
				whereExpr,
				sql`patient_visit.doctor_id IN (
					SELECT id FROM staff
					WHERE concat_ws(' ', first_name, middle_name, last_name) ILIKE ${pattern}
				)` as any
			);
		}

		const visitTypeId = params?.visitTypeId ?? null;
		if (visitTypeId != null && !Number.isNaN(visitTypeId)) {
			whereExpr = and(whereExpr, eq(table.patientVisitTable.visitTypeId, visitTypeId) as any);
		}

		const [data, countResult] = await Promise.all([
			ensureDb().query.patientVisitTable.findMany({
				where: whereExpr,
				with: {
					patient: true,
					status: true,
					visitType: true,
					hospital: true,
					branch: true,
					doctor: true
				},
				orderBy: (patientVisitTable, { desc }) => desc(patientVisitTable.createdAt),
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

