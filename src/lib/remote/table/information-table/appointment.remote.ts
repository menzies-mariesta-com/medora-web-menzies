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
		const [row] = await ensureDb()
			.update(table.appointmentTable)
			.set(rest as AppointmentSchemaUpdate)
			.where(eq(table.appointmentTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
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
		await ensureDb()
			.update(table.appointmentTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.appointmentTable.id, id));
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
