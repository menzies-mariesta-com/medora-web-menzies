import { query, command, getRequestEvent } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	AppointmentSchema,
	AppointmentSchemaInsert,
	AppointmentSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import {
	getPatientVisit,
	getPatientVisitPaginatedForEmr
} from '$lib/remote/table/information-table/patient-visit.remote';
import { visitHasBlockingClinicalData } from '$lib/server/visit-blocking-clinical.server';
import { error } from '@sveltejs/kit';
import { and, count, eq, ne } from 'drizzle-orm';
const BRANCH_ALL_VALUE = '__all__';
const MAX_APPOINTMENT_YEARS_AHEAD = 1;

function toDateOnly(value: unknown): Date | null {
	if (!value) return null;
	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) return null;
		return new Date(value.getFullYear(), value.getMonth(), value.getDate());
	}
	if (typeof value === 'string') {
		// appointment_date is stored as a date (YYYY-MM-DD). Parse as a local date-only value.
		const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
		if (!m) return null;
		const y = Number(m[1]);
		const mo = Number(m[2]) - 1;
		const d = Number(m[3]);
		const dt = new Date(y, mo, d);
		// Guard against invalid dates like 2026-02-31 rolling over.
		if (
			dt.getFullYear() !== y ||
			dt.getMonth() !== mo ||
			dt.getDate() !== d
		)
			return null;
		return dt;
	}
	return null;
}

/** Matches doctor-appointment UI: cancel / cancelled status tagging. */
async function isAppointmentCancelStatusTaggingId(
	statusTaggingId: number
): Promise<boolean> {
	const row = await ensureDb().query.statusTaggingTable.findFirst({
		where: (t, { eq: eqId }) => eqId(t.id, statusTaggingId)
	});
	if (!row) return false;
	const raw = (row.code ?? row.name ?? '')
		.trim()
		.toLowerCase()
		.replace(/[\s_-]/g, '');
	return raw === 'cancel' || raw === 'cancelled';
}

/** Visit created at check-in is linked by appointment_id; cancel/soft-delete should not leave it active. */
async function inactivatePatientVisitsForAppointment(
	appointmentId: number
): Promise<void> {
	await ensureDb()
		.update(table.patientVisitTable)
		.set({ statusId: StatusEnum.INACTIVE })
		.where(
			and(
				eq(table.patientVisitTable.appointmentId, appointmentId),
				eq(table.patientVisitTable.statusId, StatusEnum.ACTIVE)
			)
		);
}

/** Blocks cancel / soft-delete when any linked active visit has vitals, allergies, EMR data, etc. */
async function assertLinkedVisitsAllowAppointmentCancellation(
	appointmentId: number
): Promise<void> {
	const visits = await ensureDb()
		.select({ id: table.patientVisitTable.id })
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.appointmentId, appointmentId),
				eq(table.patientVisitTable.statusId, StatusEnum.ACTIVE)
			)
		);
	for (const { id: vid } of visits) {
		if (await visitHasBlockingClinicalData(vid)) {
			throw error(
				400,
				'Cannot cancel: this visit has vitals, allergies, or other clinical records. Remove or resolve those first.'
			);
		}
	}
}

function assertAppointmentNotTooFarAhead(appointmentDate: unknown): void {
	const apptDay = toDateOnly(appointmentDate);
	if (!apptDay) return;
	const today = new Date();
	const todayDay = new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate()
	);
	const maxDay = new Date(todayDay);
	maxDay.setFullYear(maxDay.getFullYear() + MAX_APPOINTMENT_YEARS_AHEAD);
	if (apptDay.getTime() > maxDay.getTime()) {
		throw new Error(
			`Appointment date cannot be more than ${MAX_APPOINTMENT_YEARS_AHEAD} year(s) in advance`
		);
	}
}

function getSelectedScopeFromRequest(): {
	hospitalId: string | null;
	branchId: string | null;
} {
	try {
		const event = getRequestEvent();
		const hospitalIdParam =
			typeof event.params?.hospital_id === 'string'
				? event.params.hospital_id
				: null;
		const rawBranchIdCookie =
			event.cookies.get('heka_selected_branch_id') ?? null;
		const branchIdCookie =
			rawBranchIdCookie === BRANCH_ALL_VALUE
				? null
				: rawBranchIdCookie;
		return { hospitalId: hospitalIdParam, branchId: branchIdCookie };
	} catch {
		return { hospitalId: null, branchId: null };
	}
}

// get all
export const getAppointment = query(
	async (): Promise<AppointmentSchema[]> => {
		const scope = getSelectedScopeFromRequest();
		const conditions = [
			ne(table.appointmentTable.statusId, StatusEnum.DELETED)
		];
		if (scope.hospitalId)
			conditions.push(
				eq(table.appointmentTable.hospitalId, scope.hospitalId)
			);
		if (scope.branchId)
			conditions.push(
				eq(table.appointmentTable.branchId, scope.branchId)
			);
		const whereExpr = and(...conditions)!;
		const data = await ensureDb()
			.select()
			.from(table.appointmentTable)
			.where(whereExpr);
		return data;
	}
);

// get count
export const getAppointmentCount = query(
	async (): Promise<number> => {
		const scope = getSelectedScopeFromRequest();
		const conditions = [
			ne(table.appointmentTable.statusId, StatusEnum.DELETED)
		];
		if (scope.hospitalId)
			conditions.push(
				eq(table.appointmentTable.hospitalId, scope.hospitalId)
			);
		if (scope.branchId)
			conditions.push(
				eq(table.appointmentTable.branchId, scope.branchId)
			);
		const whereExpr = and(...conditions)!;
		const [row] = await ensureDb()
			.select({ count: count() })
			.from(table.appointmentTable)
			.where(whereExpr);
		return row?.count ?? 0;
	}
);

// get paginated
export const getAppointmentPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<AppointmentSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const scope = getSelectedScopeFromRequest();
		const hospitalId =
			params?.hospitalId ?? scope.hospitalId ?? undefined;
		const branchId = params?.branchId ?? scope.branchId ?? undefined;
		const conditions = [
			ne(table.appointmentTable.statusId, StatusEnum.DELETED)
		];
		if (hospitalId)
			conditions.push(
				eq(table.appointmentTable.hospitalId, hospitalId)
			);
		if (branchId)
			conditions.push(eq(table.appointmentTable.branchId, branchId));
		const whereExpr = and(...conditions)!;
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.appointmentTable)
				.where(whereExpr)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.appointmentTable)
				.where(whereExpr)
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

// get all with relations (optional hospitalId/branchId to override scope)
export const getAppointmentWithRelations = query(
	'unchecked' as const,
	async (params?: { hospitalId?: string; branchId?: string }) => {
		const scope = getSelectedScopeFromRequest();
		const conditions = [
			ne(table.appointmentTable.statusId, StatusEnum.DELETED)
		];
		const hospitalId = params?.hospitalId ?? scope.hospitalId;
		const branchId = params?.branchId ?? scope.branchId;
		if (hospitalId)
			conditions.push(
				eq(table.appointmentTable.hospitalId, hospitalId)
			);
		if (branchId)
			conditions.push(eq(table.appointmentTable.branchId, branchId));
		const whereExpr = and(...conditions)!;
		return ensureDb().query.appointmentTable.findMany({
			where: whereExpr,
			with: {
				hospital: true,
				branch: true,
				patient: true,
				staff: true,
				patientTitle: true,
				referType: true,
				externalRefer: true,
				statusTagging: true,
				status: true
			}
		});
	}
);

export type AppointmentWithRelations = Awaited<
	ReturnType<typeof getAppointmentWithRelations>
>[number];

/** UI hint before cancel remark: whether linked visit(s) allow cancellation. */
export const getAppointmentCancelEligibility = query(
	'unchecked' as const,
	async ({
		appointmentId
	}: {
		appointmentId: number;
	}): Promise<{ allowed: true } | { allowed: false; message: string }> => {
		const visits = await ensureDb()
			.select({ id: table.patientVisitTable.id })
			.from(table.patientVisitTable)
			.where(
				and(
					eq(table.patientVisitTable.appointmentId, appointmentId),
					eq(table.patientVisitTable.statusId, StatusEnum.ACTIVE)
				)
			);
		for (const { id: vid } of visits) {
			if (await visitHasBlockingClinicalData(vid)) {
				return {
					allowed: false,
					message:
						'Cannot cancel: this visit has vitals, allergies, or other clinical records. Remove or resolve those first.'
				};
			}
		}
		return { allowed: true };
	}
);

// get one
export const getAppointmentById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<AppointmentSchema | null> => {
		const scope = getSelectedScopeFromRequest();
		const conditions = [
			eq(table.appointmentTable.id, id),
			ne(table.appointmentTable.statusId, StatusEnum.DELETED)
		];
		if (scope.hospitalId)
			conditions.push(
				eq(table.appointmentTable.hospitalId, scope.hospitalId)
			);
		if (scope.branchId)
			conditions.push(
				eq(table.appointmentTable.branchId, scope.branchId)
			);
		const whereExpr = and(...conditions)!;
		const [row] = await ensureDb()
			.select()
			.from(table.appointmentTable)
			.where(whereExpr);
		return row ?? null;
	}
);

// create
export const createAppointment = command(
	'unchecked' as const,
	async (
		payload: Omit<
			AppointmentSchemaInsert,
			'hospitalId' | 'branchId'
		> & {
			hospitalId?: string | null;
			branchId?: string | null;
		}
	): Promise<AppointmentSchema> => {
		const scope = getSelectedScopeFromRequest();
		const hospitalId = scope.hospitalId ?? payload.hospitalId ?? null;
		if (!hospitalId) throw new Error('Hospital is required');
		const branchId = payload.branchId ?? scope.branchId ?? null;
		if (!branchId) throw new Error('Branch is required');
		assertAppointmentNotTooFarAhead(payload.appointmentDate);
		const values: AppointmentSchemaInsert = {
			...payload,
			hospitalId,
			branchId
		};
		const [row] = await ensureDb()
			.insert(table.appointmentTable)
			.values(values)
			.returning();
		if (!row) throw new Error('Insert failed');
		getAppointment().refresh();
		getAppointmentWithRelations().refresh();
		getAppointmentCount().refresh();
		getAppointmentPaginated(undefined).refresh();
		return row;
	}
);

// update
export const updateAppointment = command(
	'unchecked' as const,
	async (
		payload: AppointmentSchemaUpdate & { id: number }
	): Promise<AppointmentSchema> => {
		const { id, ...rest } = payload;
		if ('appointmentDate' in rest) {
			assertAppointmentNotTooFarAhead(
				(rest as AppointmentSchemaUpdate).appointmentDate
			);
		}
		const nextTagging = (rest as AppointmentSchemaUpdate).statusTaggingId;
		if (
			nextTagging != null &&
			typeof nextTagging === 'number' &&
			(await isAppointmentCancelStatusTaggingId(nextTagging))
		) {
			await assertLinkedVisitsAllowAppointmentCancellation(id);
		}
		const [row] = await ensureDb()
			.update(table.appointmentTable)
			.set(rest as AppointmentSchemaUpdate)
			.where(eq(table.appointmentTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');

		if (
			nextTagging != null &&
			typeof nextTagging === 'number' &&
			(await isAppointmentCancelStatusTaggingId(nextTagging))
		) {
			await inactivatePatientVisitsForAppointment(id);
			getPatientVisit().refresh();
			getPatientVisitPaginatedForEmr().refresh();
		}

		getAppointment().refresh();
		getAppointmentWithRelations().refresh();
		getAppointmentCount().refresh();
		getAppointmentPaginated(undefined).refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteAppointment = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await assertLinkedVisitsAllowAppointmentCancellation(id);
		await ensureDb()
			.update(table.appointmentTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.appointmentTable.id, id));
		await inactivatePatientVisitsForAppointment(id);
		getPatientVisit().refresh();
		getPatientVisitPaginatedForEmr().refresh();
		getAppointment().refresh();
		getAppointmentWithRelations().refresh();
		getAppointmentCount().refresh();
		getAppointmentPaginated(undefined).refresh();
	}
);

// delete complete (hard)
export const deleteAppointmentComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.appointmentTable)
			.where(eq(table.appointmentTable.id, id));
		getAppointment().refresh();
		getAppointmentWithRelations().refresh();
		getAppointmentCount().refresh();
		getAppointmentPaginated(undefined).refresh();
	}
);
