import type { RequestEvent } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	DoctorScheduleSchema,
	DoctorScheduleSchemaInsert,
	DoctorScheduleSchemaUpdate
} from '$lib/server/db/schema-type';
import { RoleEnum, StatusEnum } from '$lib/model/enum/db-link';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';

const BRANCH_ALL_VALUE = '__all__';

async function getSelectedBranchConstraintForStaff(
	event: RequestEvent,
	hospitalId: string
): Promise<string | null> {
	try {
		const roleId = event.locals.userRoleId ?? null;
		const staffId = event.locals.staff?.id ?? null;
		if (roleId !== RoleEnum.STAFF || !staffId) return null;

		const selected =
			event.cookies.get('heka_selected_branch_id') ?? null;

		const staffBranchesForNavRaw = await ensureDb()
			.select({
				id: table.hospitalBranchTable.id,
				name: table.hospitalBranchTable.name
			})
			.from(table.staffBranchTable)
			.innerJoin(
				table.hospitalBranchTable,
				eq(
					table.staffBranchTable.branchId,
					table.hospitalBranchTable.id
				)
			)
			.where(
				and(
					eq(table.staffBranchTable.staffId, staffId),
					eq(table.hospitalBranchTable.hospitalId, hospitalId)
				)
			);

		const staffBranchesForNav = [
			...new Map(
				staffBranchesForNavRaw.map((b) => [b.id, b])
			).values()
		].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

		const allHospitalBranchesRaw = await ensureDb()
			.select({ id: table.hospitalBranchTable.id })
			.from(table.hospitalBranchTable)
			.where(eq(table.hospitalBranchTable.hospitalId, hospitalId));

		const allHospitalBranchIds = allHospitalBranchesRaw.map(
			(b) => b.id
		);
		const staffBranchIdSet = new Set(
			staffBranchesForNav.map((b) => b.id)
		);
		const hasAllBranchesAccess =
			allHospitalBranchIds.length > 0 &&
			allHospitalBranchIds.every((id) => staffBranchIdSet.has(id));

		const branchNavIds = staffBranchesForNav.map((b) => b.id);
		if (hasAllBranchesAccess) branchNavIds.unshift(BRANCH_ALL_VALUE);

		const fallbackSelectedId =
			staffBranchesForNav.length === 1
				? staffBranchesForNav[0].id
				: selected != null && branchNavIds.includes(selected)
					? selected
					: (branchNavIds[0] ?? null);

		if (
			!fallbackSelectedId ||
			fallbackSelectedId === BRANCH_ALL_VALUE
		)
			return null;
		return fallbackSelectedId;
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
	const [branchInHospital, staffInHospital, staffInBranch] =
		await Promise.all([
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
					eq(
						table.staffBranchTable.branchId,
						table.hospitalBranchTable.id
					)
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

	if (!branchInHospital)
		throw new Error(
			'Selected branch does not belong to this hospital'
		);
	if (!staffInHospital)
		throw new Error(
			'Selected doctor is not assigned to this hospital'
		);
	if (!staffInBranch)
		throw new Error('Selected doctor is not assigned to this branch');
}

type DoctorScheduleOverlapCheckInput = {
	hospitalId: string;
	staffId: string;
	weekdayId: number;
	fromDate: string | null;
	toDate: string | null;
	fromShiftTime: string | null;
	toShiftTime: string | null;
	excludeId?: number;
};

function normalizeTime(t: string | null): string {
	if (!t || typeof t !== 'string') return '00:00:00';
	const parts = t.trim().split(':');
	const h = parts[0]?.padStart(2, '0') ?? '00';
	const m = (parts[1] ?? '00').padStart(2, '0');
	const s = (parts[2] ?? '00').padStart(2, '0');
	return `${h}:${m}:${s}`;
}

async function assertNoOverlappingDoctorSchedule(
	event: RequestEvent,
	input: DoctorScheduleOverlapCheckInput
): Promise<void> {
	const {
		hospitalId,
		staffId,
		weekdayId,
		fromDate,
		toDate,
		fromShiftTime,
		toShiftTime,
		excludeId
	} = input;

	await ensureCanAccessHospital(event, hospitalId);

	const existingSchedules = await ensureDb()
		.select({
			schedule: table.doctorScheduleTable,
			branchName: table.hospitalBranchTable.name
		})
		.from(table.doctorScheduleTable)
		.innerJoin(
			table.hospitalBranchTable,
			eq(
				table.doctorScheduleTable.branchId,
				table.hospitalBranchTable.id
			)
		)
		.where(
			and(
				eq(table.doctorScheduleTable.staffId, staffId),
				eq(table.doctorScheduleTable.hospitalId, hospitalId)
			)
		);

	const MIN_DATE = '0001-01-01';
	const MAX_DATE = '9999-12-31';
	const MIN_TIME = '00:00:00';
	const MAX_TIME = '23:59:59';

	const newFromDate = fromDate ?? MIN_DATE;
	const newToDate = toDate ?? MAX_DATE;
	const newFromTime = normalizeTime(fromShiftTime) || MIN_TIME;
	const newToTime = normalizeTime(toShiftTime) || MAX_TIME;

	const conflict = existingSchedules.find(({ schedule: row }) => {
		if (excludeId != null && row.id === excludeId) return false;
		if (row.statusId !== StatusEnum.ACTIVE) return false;
		if (row.weekdayId !== weekdayId) return false;

		const rowFromDate = row.fromDate ?? MIN_DATE;
		const rowToDate = row.toDate ?? MAX_DATE;
		const rowFromTime = normalizeTime(row.fromShiftTime) || MIN_TIME;
		const rowToTime = normalizeTime(row.toShiftTime) || MAX_TIME;

		const dateOverlap =
			rowFromDate <= newToDate && newFromDate <= rowToDate;
		const timeOverlap =
			rowFromTime < newToTime && newFromTime < rowToTime;
		return dateOverlap && timeOverlap;
	});

	if (conflict) {
		const branchLabel =
			conflict.branchName ?? conflict.schedule.branchId;
		throw new Error(
			`Doctor already has an overlapping schedule at branch "${branchLabel}" for this time.`
		);
	}
}

export async function createDoctorSchedule(
	event: RequestEvent,
	payload: DoctorScheduleSchemaInsert
): Promise<DoctorScheduleSchema> {
	await ensureCanAccessHospital(event, payload.hospitalId);
	const selectedBranchConstraint =
		await getSelectedBranchConstraintForStaff(
			event,
			payload.hospitalId
		);
	if (
		selectedBranchConstraint &&
		payload.branchId !== selectedBranchConstraint
	) {
		throw new Error(
			'You can only create schedules for your selected branch'
		);
	}

	await ensureDoctorBranchContext({
		staffId: payload.staffId,
		hospitalId: payload.hospitalId,
		branchId: payload.branchId
	});

	await assertNoOverlappingDoctorSchedule(event, {
		hospitalId: payload.hospitalId,
		staffId: payload.staffId,
		weekdayId: payload.weekdayId!,
		fromDate: payload.fromDate ?? null,
		toDate: payload.toDate ?? null,
		fromShiftTime: payload.fromShiftTime ?? null,
		toShiftTime: payload.toShiftTime ?? null
	});

	const [row] = await ensureDb()
		.insert(table.doctorScheduleTable)
		.values(payload)
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updateDoctorSchedule(
	event: RequestEvent,
	payload: DoctorScheduleSchemaUpdate & { id: number }
): Promise<DoctorScheduleSchema> {
	const { id, ...rest } = payload;

	const existing = await ensureDb()
		.select()
		.from(table.doctorScheduleTable)
		.where(eq(table.doctorScheduleTable.id, id))
		.limit(1)
		.then((rows) => rows[0]);
	if (!existing) throw new Error('Schedule not found');

	await ensureCanAccessHospital(event, existing.hospitalId);

	const nextStaffId = rest.staffId ?? existing.staffId;
	const nextHospitalId = rest.hospitalId ?? existing.hospitalId;
	const nextBranchId = rest.branchId ?? existing.branchId;
	const nextWeekdayId = rest.weekdayId ?? existing.weekdayId;
	const nextFromDate = rest.fromDate ?? existing.fromDate;
	const nextToDate = rest.toDate ?? existing.toDate;
	const nextFromShiftTime =
		rest.fromShiftTime ?? existing.fromShiftTime;
	const nextToShiftTime = rest.toShiftTime ?? existing.toShiftTime;

	const selectedBranchConstraint =
		await getSelectedBranchConstraintForStaff(event, nextHospitalId);
	if (
		selectedBranchConstraint &&
		nextBranchId !== selectedBranchConstraint
	) {
		throw new Error(
			'You can only update schedules in your selected branch'
		);
	}

	await ensureDoctorBranchContext({
		staffId: nextStaffId,
		hospitalId: nextHospitalId,
		branchId: nextBranchId
	});

	const onlyDeactivating =
		rest.statusId === StatusEnum.INACTIVE ||
		rest.statusId === StatusEnum.DELETED;
	const hasOtherChanges = Object.keys(rest).some(
		(k) =>
			k !== 'statusId' &&
			(rest as Record<string, unknown>)[k] !== undefined
	);
	if (!onlyDeactivating || hasOtherChanges) {
		await assertNoOverlappingDoctorSchedule(event, {
			hospitalId: nextHospitalId,
			staffId: nextStaffId,
			weekdayId: nextWeekdayId!,
			fromDate: nextFromDate ?? null,
			toDate: nextToDate ?? null,
			fromShiftTime: nextFromShiftTime ?? null,
			toShiftTime: nextToShiftTime ?? null,
			excludeId: id
		});
	}

	const [row] = await ensureDb()
		.update(table.doctorScheduleTable)
		.set(rest as DoctorScheduleSchemaUpdate)
		.where(eq(table.doctorScheduleTable.id, id))
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}
