import { and, eq, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { DoctorPortalContext } from './doctor-context.server';

export type DoctorScheduleRow = {
	id: number;
	weekdayId: number | null;
	weekdayName: string | null;
	branchId: string | null;
	branchName: string | null;
	fromDate: string | null;
	toDate: string | null;
	fromShiftTime: string | null;
	toShiftTime: string | null;
	slotDurationMinutes: number | null;
	statusId: number | null;
	statusName: string | null;
};

export async function listDoctorSchedule(
	ctx: DoctorPortalContext,
	branchId?: string | null
): Promise<DoctorScheduleRow[]> {
	const conditions = [
		eq(table.doctorScheduleTable.staffId, ctx.staffId),
		eq(table.doctorScheduleTable.hospitalId, ctx.hospitalId),
		ne(table.doctorScheduleTable.statusId, StatusEnum.DELETED)
	];
	if (branchId) {
		conditions.push(eq(table.doctorScheduleTable.branchId, branchId));
	}

	const rows = await ensureDb()
		.select({
			id: table.doctorScheduleTable.id,
			weekdayId: table.doctorScheduleTable.weekdayId,
			weekdayName: table.weekdayTable.name,
			branchId: table.doctorScheduleTable.branchId,
			branchName: table.hospitalBranchTable.name,
			fromDate: table.doctorScheduleTable.fromDate,
			toDate: table.doctorScheduleTable.toDate,
			fromShiftTime: table.doctorScheduleTable.fromShiftTime,
			toShiftTime: table.doctorScheduleTable.toShiftTime,
			slotDurationMinutes:
				table.doctorScheduleTable.slotDurationMinutes,
			statusId: table.doctorScheduleTable.statusId,
			statusName: table.statusTable.name
		})
		.from(table.doctorScheduleTable)
		.leftJoin(
			table.weekdayTable,
			eq(table.doctorScheduleTable.weekdayId, table.weekdayTable.id)
		)
		.leftJoin(
			table.hospitalBranchTable,
			eq(
				table.doctorScheduleTable.branchId,
				table.hospitalBranchTable.id
			)
		)
		.leftJoin(
			table.statusTable,
			eq(table.doctorScheduleTable.statusId, table.statusTable.id)
		)
		.where(and(...conditions))
		.orderBy(table.weekdayTable.id, table.doctorScheduleTable.fromShiftTime);

	return rows as DoctorScheduleRow[];
}
