import { query, command, getRequestEvent } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	DoctorScheduleSchema,
	DoctorScheduleSchemaInsert,
	DoctorScheduleSchemaUpdate,
} from '$lib/server/db/schema-type';
import { RoleEnum, StatusEnum } from '$lib/model/enum/db-link';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq } from 'drizzle-orm';

const BRANCH_ALL_VALUE = '__all__';

function getSelectedBranchConstraintForStaff(): string | null {
	try {
		const event = getRequestEvent();
		const roleId = event.locals.userRoleId ?? null;
		if (roleId !== RoleEnum.STAFF) return null;
		const selected = event.cookies.get('heka_selected_branch_id') ?? null;
		if (!selected || selected === BRANCH_ALL_VALUE) return null;
		return selected;
	} catch {
		return null;
	}
}

async function ensureDoctorBranchContext(input: {
	staffId: string;
	hospitalId: string;
	branchId: string;
}): Promise<void> {
	const { staffId, hospitalId, branchId } = input;
	const [branchInHospital, staffInHospital, staffInBranch] = await Promise.all([
		ensureDb()
			.select({ id: table.hospitalBranchTable.id })
			.from(table.hospitalBranchTable)
			.where(
				and(
					eq(table.hospitalBranchTable.id, branchId),
					eq(table.hospitalBranchTable.hospitalId, hospitalId)
				)
			)
			.limit(1)
			.then((rows) => rows[0]),
		ensureDb()
			.select({ id: table.staffHospitalTable.id })
			.from(table.staffHospitalTable)
			.where(
				and(
					eq(table.staffHospitalTable.staffId, staffId),
					eq(table.staffHospitalTable.hospitalId, hospitalId)
				)
			)
			.limit(1)
			.then((rows) => rows[0]),
		ensureDb()
			.select({ id: table.staffBranchTable.id })
			.from(table.staffBranchTable)
			.innerJoin(
				table.hospitalBranchTable,
				eq(table.staffBranchTable.branchId, table.hospitalBranchTable.id)
			)
			.where(
				and(
					eq(table.staffBranchTable.staffId, staffId),
					eq(table.staffBranchTable.branchId, branchId),
					eq(table.hospitalBranchTable.hospitalId, hospitalId)
				)
			)
			.limit(1)
			.then((rows) => rows[0])
	]);
	if (!branchInHospital) throw new Error('Selected branch does not belong to this hospital');
	if (!staffInHospital) throw new Error('Selected doctor is not assigned to this hospital');
	if (!staffInBranch) throw new Error('Selected doctor is not assigned to this branch');
}

// get all (optional hospitalId/branchId UUID to scope)
export const getDoctorSchedule = query(
	'unchecked' as const,
	async (params?: { hospitalId?: string; branchId?: string }): Promise<DoctorScheduleSchema[]> => {
		let whereExpr: ReturnType<typeof eq> | ReturnType<typeof and> | undefined;
		if (params?.hospitalId != null && params.hospitalId !== '') {
			whereExpr = eq(table.doctorScheduleTable.hospitalId, params.hospitalId);
		}
		if (params?.branchId != null && params.branchId !== '') {
			const branchExpr = eq(table.doctorScheduleTable.branchId, params.branchId);
			whereExpr = whereExpr ? and(whereExpr, branchExpr) : branchExpr;
		}
		return whereExpr
			? ensureDb().select().from(table.doctorScheduleTable).where(whereExpr)
			: ensureDb().select().from(table.doctorScheduleTable);
	}
);

// get count
export const getDoctorScheduleCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.doctorScheduleTable);
	return row?.count ?? 0;
});

// get paginated
export const getDoctorSchedulePaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<DoctorScheduleSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb().select().from(table.doctorScheduleTable).limit(limit).offset(offset),
			ensureDb().select({ count: count() }).from(table.doctorScheduleTable),
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

// get all with relations (optional hospitalId/branchId UUID to scope)
export const getDoctorScheduleWithRelations = query(
	'unchecked' as const,
	async (params?: { hospitalId?: string; branchId?: string }) => {
		const hospitalId = params?.hospitalId;
		const branchId = params?.branchId;
		const whereExpr =
			hospitalId != null && hospitalId !== '' && branchId != null && branchId !== ''
				? and(
						eq(table.doctorScheduleTable.hospitalId, hospitalId),
						eq(table.doctorScheduleTable.branchId, branchId)
					)
				: hospitalId != null && hospitalId !== ''
					? eq(table.doctorScheduleTable.hospitalId, hospitalId)
					: branchId != null && branchId !== ''
						? eq(table.doctorScheduleTable.branchId, branchId)
						: undefined;
		return ensureDb().query.doctorScheduleTable.findMany({
			...(whereExpr && { where: whereExpr }),
			with: {
				doctor: true,
				hospital: true,
				branch: true,
				weekday: true,
				status: true,
			},
		});
	}
);

// get one
export const getDoctorScheduleById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<DoctorScheduleSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.doctorScheduleTable)
			.where(eq(table.doctorScheduleTable.id, id));
		return row ?? null;
	}
);

// create
export const createDoctorSchedule = command(
	'unchecked' as const,
	async (payload: DoctorScheduleSchemaInsert): Promise<DoctorScheduleSchema> => {
		const selectedBranchConstraint = getSelectedBranchConstraintForStaff();
		if (selectedBranchConstraint && payload.branchId !== selectedBranchConstraint) {
			throw new Error('You can only create schedules for your selected branch');
		}
		await ensureDoctorBranchContext({
			staffId: payload.staffId,
			hospitalId: payload.hospitalId,
			branchId: payload.branchId
		});
		const [row] = await ensureDb()
			.insert(table.doctorScheduleTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getDoctorSchedule(undefined).refresh();
		return row;
	}
);

// update
export const updateDoctorSchedule = command(
	'unchecked' as const,
	async (payload: DoctorScheduleSchemaUpdate & { id: number }): Promise<DoctorScheduleSchema> => {
		const { id, ...rest } = payload;
		const existing = await getDoctorScheduleById({ id });
		if (!existing) throw new Error('Schedule not found');
		const nextStaffId = rest.staffId ?? existing.staffId;
		const nextHospitalId = rest.hospitalId ?? existing.hospitalId;
		const nextBranchId = rest.branchId ?? existing.branchId;
		const selectedBranchConstraint = getSelectedBranchConstraintForStaff();
		if (selectedBranchConstraint && nextBranchId !== selectedBranchConstraint) {
			throw new Error('You can only update schedules in your selected branch');
		}
		await ensureDoctorBranchContext({
			staffId: nextStaffId,
			hospitalId: nextHospitalId,
			branchId: nextBranchId
		});
		const [row] = await ensureDb()
			.update(table.doctorScheduleTable)
			.set(rest as DoctorScheduleSchemaUpdate)
			.where(eq(table.doctorScheduleTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getDoctorSchedule(undefined).refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteDoctorSchedule = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.doctorScheduleTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.doctorScheduleTable.id, id));
		getDoctorSchedule(undefined).refresh();
	}
);

// delete complete (hard)
export const deleteDoctorScheduleComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.doctorScheduleTable).where(eq(table.doctorScheduleTable.id, id));
		getDoctorSchedule(undefined).refresh();
	}
);
