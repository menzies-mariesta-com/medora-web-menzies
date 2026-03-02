import { command, query, getRequestEvent } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

import type {
	PatientVisitSchema,
	PatientVisitSchemaInsert,
	PatientVisitSchemaUpdate,
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
import { error } from '@sveltejs/kit';
const BRANCH_ALL_VALUE = '__all__';



/* =========================================================
   TYPES
========================================================= */

export type PatientVisitWithRelations = PatientVisitSchema & {
	patient: PatientSchema | null;
	status: StatusSchema | null;
	visitType: VisitTypeSchema | null;
	hospital: HospitalSchema | null;
	branch: HospitalBranchSchema | null;
	doctor: StaffSchema | null;
};

function getSelectedBranchFromRequest(): string | null {
	try {
		const event = getRequestEvent();
		const raw = event.cookies.get('heka_selected_branch_id') ?? null;
		return raw === BRANCH_ALL_VALUE ? null : raw;
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

		if (!hospital) throw error(400, 'Hospital is required to generate visit number.');
		if (!branch) throw error(400, 'Branch is required to generate visit number.');
		if (!visitType) throw error(400, 'Visit type is required to generate visit number.');

		const hospitalCode =
			(hospital.code?.trim() || hospitalId.substring(0, 3)).toUpperCase();
		const branchCode =
			(branch.code?.trim() || 'MAIN').toUpperCase();
		const visitTypeCode =
			(visitType.code?.trim() || 'V').toUpperCase();

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
export const getPatientVisit = query(async (): Promise<PatientVisitSchema[]> => {
	return await ensureDb().select().from(table.patientVisitTable);
});

// Get by ID
export const getPatientVisitById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<PatientVisitSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.patientVisitTable)
			.where(eq(table.patientVisitTable.id, id));
		return row ?? null;
	}
);

// Create
export const createPatientVisit = command(
	'unchecked' as const,
	async (
		payload: Omit<PatientVisitSchemaInsert, 'branchId' | 'visitNo'> & {
			branchId?: string | null;
		}
	): Promise<PatientVisitSchema> => {
		const selectedBranchId = getSelectedBranchFromRequest();
		const branchId = payload.branchId ?? selectedBranchId ?? null;
		if (!branchId) throw error(400, 'Branch is required to create patient visit');

		if (!payload.hospitalId) {
			throw error(400, 'Hospital is required to create patient visit');
		}
		if (!payload.visitTypeId) {
			throw error(400, 'Visit type is required to create patient visit');
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
	async (payload: { id: number } & PatientVisitSchemaUpdate): Promise<PatientVisitSchema> => {
		const { id, ...rest } = payload;

		const [row] = await ensureDb()
			.update(table.patientVisitTable)
			.set(rest)
			.where(eq(table.patientVisitTable.id, id))
			.returning();

		if (!row) throw new Error('Update failed');

		getPatientVisit().refresh();
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

		const { page, pageSize, limit, offset } = normalizePagination(params);

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

		// Global search
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

		// Visit Type filter
		if (params?.visitTypeId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.patientVisitTable.visitTypeId, params.visitTypeId)
			);
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