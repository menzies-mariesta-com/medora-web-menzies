import { and, eq, ilike, inArray, ne, sql } from 'drizzle-orm';
import {
	IpdAdmissionStatusEnum,
	SurgicalCaseStatusTaggingEnum,
	StatusEnum
} from '$lib/model/enum/db-link';
import { CareSettingEnum } from '$lib/model/enum/care-setting.enum';
import { EdBoardColumnEnum } from '$lib/model/enum/perioperative.enum';
import type { AdtBedStatusRow } from '$lib/model/type/medora/adt/adt.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { patientDisplayName } from '$lib/server/medora/doctor-portal/doctor-utils.server';

/** ED board columns that still hold the bed: in the department or held after discharge. */
const ED_OCCUPYING_COLUMNS = [
	EdBoardColumnEnum.WAITING_TRIAGE,
	EdBoardColumnEnum.TRIAGE,
	EdBoardColumnEnum.WAITING_CLINICIAN,
	EdBoardColumnEnum.FAST_TRACK,
	EdBoardColumnEnum.MAJORS,
	EdBoardColumnEnum.RESUS,
	EdBoardColumnEnum.AWAITING_ADMIT
];

/** Surgical cases that hold an OT room. */
const OT_OCCUPYING_CASE_STATUSES = [
	SurgicalCaseStatusTaggingEnum.SCHEDULED,
	SurgicalCaseStatusTaggingEnum.PRE_OP_COMPLETE,
	SurgicalCaseStatusTaggingEnum.IN_OR,
	SurgicalCaseStatusTaggingEnum.IN_PACU
];

const patientNameSql = sql`concat_ws(' ', ${table.titleTable.name}, ${table.patientTable.firstName}, ${table.patientTable.middleName}, ${table.patientTable.lastName})`;

/**
 * Beds held by a patient/visit name match, across both occupancy sources.
 * Returns `null` when no name filter was supplied.
 */
async function bedIdsMatchingName(input: {
	hospitalId: string;
	patientName?: string;
	visitName?: string;
}): Promise<number[] | null> {
	const patientName = input.patientName?.trim();
	const visitName = input.visitName?.trim();
	if (!patientName && !visitName) return null;

	const db = ensureDb();
	const nameConditions = [] as ReturnType<typeof and>[];
	if (patientName) {
		nameConditions.push(ilike(patientNameSql, `%${patientName}%`));
	}
	if (visitName) {
		nameConditions.push(
			ilike(table.patientVisitTable.visitNo, `%${visitName}%`)
		);
	}

	const [admitted, encountered] = await Promise.all([
		db
			.select({ bedId: table.ipdAdmissionTable.bedId })
			.from(table.ipdAdmissionTable)
			.innerJoin(
				table.patientVisitTable,
				eq(
					table.ipdAdmissionTable.visitId,
					table.patientVisitTable.id
				)
			)
			.innerJoin(
				table.patientTable,
				eq(table.patientVisitTable.patientId, table.patientTable.id)
			)
			.leftJoin(
				table.titleTable,
				eq(table.patientTable.titleId, table.titleTable.id)
			)
			.where(
				and(
					eq(table.ipdAdmissionTable.hospitalId, input.hospitalId),
					eq(
						table.ipdAdmissionTable.admissionStatus,
						IpdAdmissionStatusEnum.ADMITTED
					),
					ne(table.ipdAdmissionTable.statusId, StatusEnum.DELETED),
					...nameConditions
				)
			),
		db
			.select({ bedId: table.edEncounterTable.erBedId })
			.from(table.edEncounterTable)
			.innerJoin(
				table.patientVisitTable,
				eq(table.edEncounterTable.visitId, table.patientVisitTable.id)
			)
			.innerJoin(
				table.patientTable,
				eq(table.patientVisitTable.patientId, table.patientTable.id)
			)
			.leftJoin(
				table.titleTable,
				eq(table.patientTable.titleId, table.titleTable.id)
			)
			.where(
				and(
					eq(table.edEncounterTable.hospitalId, input.hospitalId),
					eq(table.edEncounterTable.statusId, StatusEnum.ACTIVE),
					...nameConditions
				)
			)
	]);

	return [
		...new Set(
			[...admitted, ...encountered]
				.map((row) => row.bedId)
				.filter((id): id is number => id != null)
		)
	];
}

export async function listBedsForAdtStatus(input: {
	hospitalId: string;
	careSetting?: CareSettingEnum;
	wardId?: number;
	bedStatus?: number;
	patientName?: string;
	visitName?: string;
	bedName?: string;
	roomName?: string;
}): Promise<AdtBedStatusRow[]> {
	const db = ensureDb();
	const bedName = input.bedName?.trim();
	const roomName = input.roomName?.trim();
	const conditions = [
		eq(table.bedTable.hospitalId, input.hospitalId),
		ne(table.bedTable.statusId, StatusEnum.DELETED)
	];
	if (input.careSetting) {
		conditions.push(
			eq(table.bedTable.careSetting, input.careSetting)
		);
	}
	if (typeof input.wardId === 'number') {
		conditions.push(eq(table.wardTable.id, input.wardId));
	}
	if (typeof input.bedStatus === 'number') {
		conditions.push(eq(table.bedTable.bedStatus, input.bedStatus));
	}
	if (bedName) {
		conditions.push(ilike(table.bedTable.name, `%${bedName}%`));
	}
	if (roomName) {
		conditions.push(ilike(table.roomTable.name, `%${roomName}%`));
	}
	const nameMatchedBedIds = await bedIdsMatchingName(input);
	if (nameMatchedBedIds) {
		if (nameMatchedBedIds.length === 0) return [];
		conditions.push(inArray(table.bedTable.id, nameMatchedBedIds));
	}

	const beds = await db
		.select({
			id: table.bedTable.id,
			name: table.bedTable.name,
			code: table.bedTable.code,
			bedStatus: table.bedTable.bedStatus,
			careSetting: table.bedTable.careSetting,
			roomId: table.roomTable.id,
			roomName: table.roomTable.name,
			wardId: table.wardTable.id,
			wardName: table.wardTable.name
		})
		.from(table.bedTable)
		.innerJoin(
			table.roomTable,
			eq(table.bedTable.roomId, table.roomTable.id)
		)
		.innerJoin(
			table.wardTable,
			eq(table.roomTable.wardId, table.wardTable.id)
		)
		.where(and(...conditions))
		.orderBy(
			table.wardTable.name,
			table.roomTable.name,
			table.bedTable.name
		);

	if (beds.length === 0) return [];

	const [admissions, encounters, otOccupancy] = await Promise.all([
		db
			.select({
				admissionId: table.ipdAdmissionTable.id,
				visitId: table.ipdAdmissionTable.visitId,
				visitNo: table.patientVisitTable.visitNo,
				bedId: table.ipdAdmissionTable.bedId,
				titleName: table.titleTable.name,
				firstName: table.patientTable.firstName,
				middleName: table.patientTable.middleName,
				lastName: table.patientTable.lastName
			})
			.from(table.ipdAdmissionTable)
			.innerJoin(
				table.patientVisitTable,
				eq(
					table.ipdAdmissionTable.visitId,
					table.patientVisitTable.id
				)
			)
			.leftJoin(
				table.patientTable,
				eq(table.patientVisitTable.patientId, table.patientTable.id)
			)
			.leftJoin(
				table.titleTable,
				eq(table.patientTable.titleId, table.titleTable.id)
			)
			.where(
				and(
					eq(table.ipdAdmissionTable.hospitalId, input.hospitalId),
					eq(
						table.ipdAdmissionTable.admissionStatus,
						IpdAdmissionStatusEnum.ADMITTED
					),
					ne(table.ipdAdmissionTable.statusId, StatusEnum.DELETED)
				)
			),
		db
			.select({
				encounterId: table.edEncounterTable.id,
				visitId: table.edEncounterTable.visitId,
				visitNo: table.patientVisitTable.visitNo,
				bedId: table.edEncounterTable.erBedId,
				boardColumn: table.edEncounterTable.boardColumn,
				retainErBedAfterDischarge:
					table.edEncounterTable.retainErBedAfterDischarge,
				titleName: table.titleTable.name,
				firstName: table.patientTable.firstName,
				middleName: table.patientTable.middleName,
				lastName: table.patientTable.lastName
			})
			.from(table.edEncounterTable)
			.innerJoin(
				table.patientVisitTable,
				eq(table.edEncounterTable.visitId, table.patientVisitTable.id)
			)
			.innerJoin(
				table.patientTable,
				eq(table.patientVisitTable.patientId, table.patientTable.id)
			)
			.leftJoin(
				table.titleTable,
				eq(table.patientTable.titleId, table.titleTable.id)
			)
			.where(
				and(
					eq(table.edEncounterTable.hospitalId, input.hospitalId),
					eq(table.edEncounterTable.statusId, StatusEnum.ACTIVE)
				)
			),
		listOtRoomCaseOccupancy({ hospitalId: input.hospitalId })
	]);

	const admissionByBed = new Map<
		number,
		{
			admissionId: number;
			visitId: string;
			visitNo: string | null;
			patientName: string | null;
		}
	>();
	for (const admission of admissions) {
		admissionByBed.set(admission.bedId, {
			admissionId: admission.admissionId,
			visitId: admission.visitId,
			visitNo: admission.visitNo,
			patientName: patientDisplayName({
				title: { name: admission.titleName },
				firstName: admission.firstName,
				middleName: admission.middleName,
				lastName: admission.lastName
			})
		});
	}

	const encounterByBed = new Map<
		number,
		{
			encounterId: number;
			visitId: string;
			visitNo: string | null;
			patientName: string | null;
			dischargedInBed: boolean;
		}
	>();
	for (const encounter of encounters) {
		if (encounter.bedId == null) continue;
		const dischargedInBed =
			encounter.boardColumn === EdBoardColumnEnum.DISCHARGED &&
			Boolean(encounter.retainErBedAfterDischarge);
		const holdsBed =
			dischargedInBed ||
			ED_OCCUPYING_COLUMNS.includes(
				encounter.boardColumn as EdBoardColumnEnum
			);
		if (!holdsBed) continue;
		encounterByBed.set(encounter.bedId, {
			encounterId: encounter.encounterId,
			visitId: encounter.visitId,
			visitNo: encounter.visitNo,
			patientName: patientDisplayName({
				title: { name: encounter.titleName },
				firstName: encounter.firstName,
				middleName: encounter.middleName,
				lastName: encounter.lastName
			}),
			dischargedInBed
		});
	}

	return beds.map((bed) => {
		const careSetting =
			(bed.careSetting as CareSettingEnum | null) ??
			CareSettingEnum.IPD;
		const base = {
			id: bed.id,
			name: bed.name,
			code: bed.code,
			bedStatus: bed.bedStatus,
			careSetting,
			wardId: bed.wardId,
			wardName: bed.wardName,
			roomId: bed.roomId,
			roomName: bed.roomName
		};
		const admission = admissionByBed.get(bed.id);
		if (admission) {
			return {
				...base,
				occupancySource: 'admission' as const,
				admissionId: admission.admissionId,
				encounterId: null,
				surgicalCaseId: null,
				visitId: admission.visitId,
				visitNo: admission.visitNo,
				patientName: admission.patientName,
				dischargedInBed: false
			};
		}
		const encounter = encounterByBed.get(bed.id);
		if (encounter) {
			return {
				...base,
				occupancySource: 'encounter' as const,
				admissionId: null,
				encounterId: encounter.encounterId,
				surgicalCaseId: null,
				visitId: encounter.visitId,
				visitNo: encounter.visitNo,
				patientName: encounter.patientName,
				dischargedInBed: encounter.dischargedInBed
			};
		}
		const surgical = otOccupancy.get(bed.roomId);
		if (surgical && careSetting === CareSettingEnum.OT) {
			return {
				...base,
				occupancySource: 'surgical' as const,
				admissionId: null,
				encounterId: null,
				surgicalCaseId: surgical.surgicalCaseId,
				visitId: null,
				visitNo: surgical.visitNo,
				patientName: surgical.procedureName,
				dischargedInBed: false
			};
		}
		return {
			...base,
			occupancySource: null,
			admissionId: null,
			encounterId: null,
			surgicalCaseId: null,
			visitId: null,
			visitNo: null,
			patientName: null,
			dischargedInBed: false
		};
	});
}

/**
 * OT rooms hold surgical cases, not bed admissions. Keyed by room id, since a
 * room is either free or busy as a whole.
 */
export async function listOtRoomCaseOccupancy(input: {
	hospitalId: string;
}): Promise<
	Map<
		number,
		{
			surgicalCaseId: number;
			procedureName: string;
			visitNo: string | null;
		}
	>
> {
	const rows = await ensureDb()
		.select({
			roomId: table.surgicalCaseTable.otRoomId,
			surgicalCaseId: table.surgicalCaseTable.id,
			procedureName: table.surgicalCaseTable.procedureName,
			visitNo: table.patientVisitTable.visitNo
		})
		.from(table.surgicalCaseTable)
		.innerJoin(
			table.patientVisitTable,
			eq(table.surgicalCaseTable.visitId, table.patientVisitTable.id)
		)
		.where(
			and(
				eq(table.surgicalCaseTable.hospitalId, input.hospitalId),
				ne(table.surgicalCaseTable.statusId, StatusEnum.DELETED),
				inArray(
					table.surgicalCaseTable.statusTaggingId,
					OT_OCCUPYING_CASE_STATUSES
				)
			)
		);

	const byRoom = new Map<
		number,
		{
			surgicalCaseId: number;
			procedureName: string;
			visitNo: string | null;
		}
	>();
	for (const row of rows) {
		if (row.roomId == null) continue;
		byRoom.set(row.roomId, {
			surgicalCaseId: row.surgicalCaseId,
			procedureName: row.procedureName,
			visitNo: row.visitNo
		});
	}
	return byRoom;
}
