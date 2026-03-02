import { query, command, getRequestEvent } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	AppointmentSchema,
	AppointmentSchemaInsert,
	AppointmentSchemaUpdate,
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ne } from 'drizzle-orm';
const BRANCH_ALL_VALUE = '__all__';

function getSelectedScopeFromRequest(): { hospitalId: string | null; branchId: string | null } {
	try {
		const event = getRequestEvent();
		const hospitalIdParam =
			typeof event.params?.hospital_id === 'string' ? event.params.hospital_id : null;
		const rawBranchIdCookie = event.cookies.get('heka_selected_branch_id') ?? null;
		const branchIdCookie = rawBranchIdCookie === BRANCH_ALL_VALUE ? null : rawBranchIdCookie;
		return { hospitalId: hospitalIdParam, branchId: branchIdCookie };
	} catch {
		return { hospitalId: null, branchId: null };
	}
}

// get all
export const getAppointment = query(async (): Promise<AppointmentSchema[]> => {
	const scope = getSelectedScopeFromRequest();
	const conditions = [ne(table.appointmentTable.statusId, StatusEnum.DELETED)];
	if (scope.hospitalId) conditions.push(eq(table.appointmentTable.hospitalId, scope.hospitalId));
	if (scope.branchId) conditions.push(eq(table.appointmentTable.branchId, scope.branchId));
	const whereExpr = and(...conditions)!;
	const data = await ensureDb().select().from(table.appointmentTable).where(whereExpr);
	return data;
});

// get count
export const getAppointmentCount = query(async (): Promise<number> => {
	const scope = getSelectedScopeFromRequest();
	const conditions = [ne(table.appointmentTable.statusId, StatusEnum.DELETED)];
	if (scope.hospitalId) conditions.push(eq(table.appointmentTable.hospitalId, scope.hospitalId));
	if (scope.branchId) conditions.push(eq(table.appointmentTable.branchId, scope.branchId));
	const whereExpr = and(...conditions)!;
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.appointmentTable)
		.where(whereExpr);
	return row?.count ?? 0;
});

// get paginated
export const getAppointmentPaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<AppointmentSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const scope = getSelectedScopeFromRequest();
		const hospitalId = params?.hospitalId ?? scope.hospitalId ?? undefined;
		const branchId = params?.branchId ?? scope.branchId ?? undefined;
		const conditions = [ne(table.appointmentTable.statusId, StatusEnum.DELETED)];
		if (hospitalId) conditions.push(eq(table.appointmentTable.hospitalId, hospitalId));
		if (branchId) conditions.push(eq(table.appointmentTable.branchId, branchId));
		const whereExpr = and(...conditions)!;
		const [data, countResult] = await Promise.all([
			ensureDb().select().from(table.appointmentTable).where(whereExpr).limit(limit).offset(offset),
			ensureDb().select({ count: count() }).from(table.appointmentTable).where(whereExpr),
		]);
		const total = countResult[0]?.count ?? 0;
		return {
			data,
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize) || 1,
		};
	}
);

// get all with relations (optional hospitalId/branchId to override scope)
export const getAppointmentWithRelations = query(
	'unchecked' as const,
	async (params?: { hospitalId?: string; branchId?: string }) => {
		const scope = getSelectedScopeFromRequest();
		const conditions = [ne(table.appointmentTable.statusId, StatusEnum.DELETED)];
		const hospitalId = params?.hospitalId ?? scope.hospitalId;
		const branchId = params?.branchId ?? scope.branchId;
		if (hospitalId) conditions.push(eq(table.appointmentTable.hospitalId, hospitalId));
		if (branchId) conditions.push(eq(table.appointmentTable.branchId, branchId));
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
			status: true,
		},
	});
	}
);

// get one
export const getAppointmentById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<AppointmentSchema | null> => {
		const scope = getSelectedScopeFromRequest();
		const conditions = [eq(table.appointmentTable.id, id)];
		if (scope.hospitalId) conditions.push(eq(table.appointmentTable.hospitalId, scope.hospitalId));
		if (scope.branchId) conditions.push(eq(table.appointmentTable.branchId, scope.branchId));
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
		payload: Omit<AppointmentSchemaInsert, 'hospitalId' | 'branchId'> & {
			hospitalId?: string | null;
			branchId?: string | null;
		}
	): Promise<AppointmentSchema> => {
		const scope = getSelectedScopeFromRequest();
		const hospitalId = scope.hospitalId ?? payload.hospitalId ?? null;
		if (!hospitalId) throw new Error('Hospital is required');
		const branchId = payload.branchId ?? scope.branchId ?? null;
		if (!branchId) throw new Error('Branch is required');
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
		return row;
	}
);

// update
export const updateAppointment = command(
	'unchecked' as const,
	async (payload: AppointmentSchemaUpdate & { id: number }): Promise<AppointmentSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.appointmentTable)
			.set(rest as AppointmentSchemaUpdate)
			.where(eq(table.appointmentTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getAppointment().refresh();
		getAppointmentWithRelations().refresh();
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
	}
);

// delete complete (hard)
export const deleteAppointmentComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.appointmentTable).where(eq(table.appointmentTable.id, id));
		getAppointment().refresh();
		getAppointmentWithRelations().refresh();
	}
);
