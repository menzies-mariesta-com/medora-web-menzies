import { error } from '@sveltejs/kit';
import {
	and,
	desc,
	eq,
	inArray,
	isNotNull,
	isNull,
	ne,
	type SQL
} from 'drizzle-orm';
import {
	OtBookingStatusTaggingEnum,
	StatusEnum
} from '$lib/model/enum/db-link';
import { PerioperativeSseEventTypeEnum } from '$lib/model/enum/perioperative.enum';
import type {
	OtHandoffRow,
	OtHandoffStage
} from '$lib/model/type/medora/operation-theatre.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { publishPerioperativeEvent } from '$lib/server/medora/perioperative/perioperative-event-bus.server';
import {
	ageGenderLabel,
	otWardToBy,
	patientDisplayNameSql,
	staffDisplayNameSql
} from './ot-shared.server';

const HANDOFF_STATUS_IDS = [
	OtBookingStatusTaggingEnum.UNCONFIRMED,
	OtBookingStatusTaggingEnum.CONFIRMED,
	OtBookingStatusTaggingEnum.OT_PAC,
	OtBookingStatusTaggingEnum.CHECKED_IN_PRE_OP,
	OtBookingStatusTaggingEnum.POST_OP
];

function stageConditions(input: {
	hospitalId: string;
	branchId?: string | null;
	stage: OtHandoffStage;
}): SQL[] {
	const conditions: SQL[] = [
		eq(table.surgicalCaseTable.hospitalId, input.hospitalId),
		ne(table.surgicalCaseTable.statusId, StatusEnum.DELETED),
		inArray(
			table.surgicalCaseTable.statusTaggingId,
			HANDOFF_STATUS_IDS
		)
	];
	if (input.branchId) {
		conditions.push(
			eq(table.surgicalCaseTable.branchId, input.branchId)
		);
	}
	if (input.stage === 'from_ward') {
		conditions.push(isNull(table.surgicalCaseTable.wardToOtAt));
	} else if (input.stage === 'pre_op') {
		conditions.push(isNotNull(table.surgicalCaseTable.wardToOtAt));
		conditions.push(isNull(table.surgicalCaseTable.inOtAt));
	} else if (input.stage === 'in_ot') {
		conditions.push(isNotNull(table.surgicalCaseTable.inOtAt));
		conditions.push(isNull(table.surgicalCaseTable.postOpAt));
	} else {
		conditions.push(isNotNull(table.surgicalCaseTable.postOpAt));
		conditions.push(isNull(table.surgicalCaseTable.returnedToWardAt));
	}
	return conditions;
}

export async function listOtHandoff(input: {
	hospitalId: string;
	branchId?: string | null;
	stage: OtHandoffStage;
}): Promise<OtHandoffRow[]> {
	const rows = await ensureDb()
		.select({
			sc: table.surgicalCaseTable,
			patient: table.patientTable,
			genderName: table.genderTable.name,
			visitNo: table.patientVisitTable.visitNo,
			admissionNo: table.ipdAdmissionTable.admissionNo,
			wardName: table.wardTable.name,
			bedName: table.bedTable.name,
			roomName: table.otRoomTable.name,
			statusName: table.statusTaggingTable.name,
			statusCode: table.statusTaggingTable.code,
			wardToOtByName: staffDisplayNameSql(otWardToBy),
			patientName: patientDisplayNameSql()
		})
		.from(table.surgicalCaseTable)
		.innerJoin(
			table.patientTable,
			eq(table.surgicalCaseTable.patientId, table.patientTable.id)
		)
		.innerJoin(
			table.patientVisitTable,
			eq(table.surgicalCaseTable.visitId, table.patientVisitTable.id)
		)
		.leftJoin(
			table.genderTable,
			eq(table.patientTable.genderId, table.genderTable.id)
		)
		.leftJoin(
			table.ipdAdmissionTable,
			eq(
				table.surgicalCaseTable.admissionId,
				table.ipdAdmissionTable.id
			)
		)
		.leftJoin(
			table.wardTable,
			eq(table.ipdAdmissionTable.wardId, table.wardTable.id)
		)
		.leftJoin(
			table.bedTable,
			eq(table.ipdAdmissionTable.bedId, table.bedTable.id)
		)
		.leftJoin(
			table.otRoomTable,
			eq(table.surgicalCaseTable.otRoomId, table.otRoomTable.id)
		)
		.leftJoin(
			table.statusTaggingTable,
			eq(
				table.surgicalCaseTable.statusTaggingId,
				table.statusTaggingTable.id
			)
		)
		.leftJoin(
			otWardToBy,
			eq(table.surgicalCaseTable.wardToOtBy, otWardToBy.id)
		)
		.where(and(...stageConditions(input)))
		.orderBy(
			desc(table.surgicalCaseTable.scheduledStart),
			desc(table.surgicalCaseTable.id)
		);

	return rows.map((r) => ({
		id: r.sc.id,
		surgicalCaseId: r.sc.id,
		bookingNo: r.sc.bookingNo,
		theatreName: r.roomName,
		hrn: r.patient.code,
		encounterNo: r.visitNo,
		patientName: r.patientName ?? '—',
		ageGender: ageGenderLabel({
			dateOfBirth: r.patient.dateOfBirth,
			genderName: r.genderName
		}),
		dateOfBirth: r.patient.dateOfBirth,
		bedNo: r.bedName,
		wardName: r.wardName,
		wardRemarks: r.sc.wardRemarks,
		wardToOtByName: r.wardToOtByName,
		wardToOtAt: r.sc.wardToOtAt,
		otDate: r.sc.scheduledStart,
		preOpAcknowledgedAt: r.sc.preOpAcknowledgedAt,
		inOtAt: r.sc.inOtAt,
		postOpAt: r.sc.postOpAt,
		returnedToWardAt: r.sc.returnedToWardAt,
		statusTaggingId: r.sc.statusTaggingId,
		statusName: r.statusName,
		statusCode: r.statusCode,
		admissionId: r.sc.admissionId
	}));
}

export async function acknowledgeOtHandoff(input: {
	hospitalId: string;
	caseId: number;
	stage: OtHandoffStage | 'return_to_ward';
	staffId?: string | null;
	wardRemarks?: string | null;
}) {
	const db = ensureDb();
	const [current] = await db
		.select()
		.from(table.surgicalCaseTable)
		.where(
			and(
				eq(table.surgicalCaseTable.id, input.caseId),
				eq(table.surgicalCaseTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!current) throw error(404, 'OT booking not found.');
	if (!HANDOFF_STATUS_IDS.includes(current.statusTaggingId)) {
		throw error(
			409,
			'This OT booking is not in the handoff workflow.'
		);
	}
	if (input.stage === 'from_ward' && current.wardToOtAt) {
		throw error(409, 'Ward handoff has already been acknowledged.');
	}
	if (input.stage === 'pre_op') {
		if (!current.wardToOtAt) {
			throw error(409, 'Acknowledge the ward handoff first.');
		}
		if (current.inOtAt) {
			throw error(409, 'Pre-op has already been acknowledged.');
		}
	}
	if (input.stage === 'in_ot') {
		if (!current.inOtAt) {
			throw error(409, 'Acknowledge pre-op before marking post-op.');
		}
		if (current.postOpAt) {
			throw error(409, 'Post-op has already been marked.');
		}
	}
	if (input.stage === 'post_op' || input.stage === 'return_to_ward') {
		if (!current.postOpAt) {
			throw error(
				409,
				'Mark the case post-op before returning to ward.'
			);
		}
		if (current.returnedToWardAt) {
			throw error(
				409,
				'Return to ward has already been acknowledged.'
			);
		}
	}

	const now = new Date().toISOString();
	const patch: Record<string, unknown> = { updatedAt: now };
	let action = '';

	if (input.stage === 'from_ward') {
		patch.wardToOtAt = now;
		patch.wardToOtBy = input.staffId ?? null;
		patch.wardRemarks = input.wardRemarks?.trim() || null;
		patch.statusTaggingId = OtBookingStatusTaggingEnum.OT_PAC;
		action = 'ward_to_ot_acknowledged';
	} else if (input.stage === 'pre_op') {
		patch.preOpAcknowledgedAt = now;
		patch.preOpAcknowledgedBy = input.staffId ?? null;
		patch.inOtAt = now;
		patch.inOtBy = input.staffId ?? null;
		patch.actualStart = now;
		patch.statusTaggingId =
			OtBookingStatusTaggingEnum.CHECKED_IN_PRE_OP;
		action = 'pre_op_acknowledged';
	} else if (input.stage === 'in_ot') {
		patch.postOpAt = now;
		patch.postOpBy = input.staffId ?? null;
		patch.actualEnd = now;
		patch.statusTaggingId = OtBookingStatusTaggingEnum.POST_OP;
		action = 'post_op_acknowledged';
	} else {
		patch.returnedToWardAt = now;
		patch.returnedToWardBy = input.staffId ?? null;
		action = 'return_to_ward_acknowledged';
	}

	const [row] = await db
		.update(table.surgicalCaseTable)
		.set(patch)
		.where(
			and(
				eq(table.surgicalCaseTable.id, input.caseId),
				eq(table.surgicalCaseTable.hospitalId, input.hospitalId)
			)
		)
		.returning();

	if (current.admissionId) {
		if (input.stage === 'from_ward') {
			await db
				.update(table.ipdAdmissionTable)
				.set({
					otHoldLocation: current.bookingNo ?? 'Operation Theatre',
					otHoldAt: now,
					updatedAt: now
				})
				.where(eq(table.ipdAdmissionTable.id, current.admissionId));
		} else if (input.stage === 'return_to_ward') {
			await db
				.update(table.ipdAdmissionTable)
				.set({
					otHoldLocation: null,
					otHoldAt: null,
					updatedAt: now
				})
				.where(eq(table.ipdAdmissionTable.id, current.admissionId));
		}
	}

	await db.insert(table.surgicalCaseAuditTable).values({
		surgicalCaseId: input.caseId,
		action,
		staffId: input.staffId ?? null,
		detailJson: {
			stage: input.stage,
			wardRemarks: input.wardRemarks ?? null
		}
	});
	publishPerioperativeEvent({
		type: PerioperativeSseEventTypeEnum.CASE_STATUS,
		hospitalId: input.hospitalId,
		data: { caseId: input.caseId, stage: input.stage }
	});
	return row;
}
