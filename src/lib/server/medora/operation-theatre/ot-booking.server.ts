import { error } from '@sveltejs/kit';
import {
	and,
	count,
	desc,
	eq,
	gte,
	ilike,
	inArray,
	lte,
	ne,
	or,
	type SQL
} from 'drizzle-orm';
import {
	OtBookingStatusTaggingEnum,
	StatusEnum
} from '$lib/model/enum/db-link';
import { PerioperativeSseEventTypeEnum } from '$lib/model/enum/perioperative.enum';
import type {
	OtBookingRow,
	OtSchedulerResult
} from '$lib/model/type/medora/operation-theatre.type';
import type { PaginatedResult } from '$lib/model/type/pagination.type';
import { normalizePagination } from '$lib/model/type/pagination.type';
import { canTransitionOtStatus } from '$lib/tool/operation-theatre/ot-status.util';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { sumIpAdvanceDepositsForVisit } from '$lib/server/medora/billing/ip-advance-deposit.server';
import { publishPerioperativeEvent } from '$lib/server/medora/perioperative/perioperative-event-bus.server';
import {
	ageGenderLabel,
	dateOnly,
	otAdmittingDoctor,
	otPaediatrician,
	otProvider,
	otSurgeon,
	patientDisplayNameSql,
	staffDisplayNameSql
} from './ot-shared.server';

const BOOKED_STATUS_IDS = [
	OtBookingStatusTaggingEnum.UNCONFIRMED,
	OtBookingStatusTaggingEnum.CONFIRMED,
	OtBookingStatusTaggingEnum.OT_PAC,
	OtBookingStatusTaggingEnum.CHECKED_IN_PRE_OP,
	OtBookingStatusTaggingEnum.POST_OP,
	OtBookingStatusTaggingEnum.ABORTED
];

async function audit(
	surgicalCaseId: number,
	action: string,
	staffId: string | null,
	detail?: Record<string, unknown>
) {
	await ensureDb()
		.insert(table.surgicalCaseAuditTable)
		.values({
			surgicalCaseId,
			action,
			staffId,
			detailJson: detail ?? null
		});
}

function bookingConditions(input: {
	hospitalId: string;
	branchId?: string | null;
	otRoomId?: number | null;
	dateFrom?: string | null;
	dateTo?: string | null;
	providerId?: string | null;
	status?: string | null;
	searchOn?: string | null;
	search?: string | null;
}): SQL[] {
	const conditions: SQL[] = [
		eq(table.surgicalCaseTable.hospitalId, input.hospitalId),
		ne(table.surgicalCaseTable.statusId, StatusEnum.DELETED),
		inArray(
			table.surgicalCaseTable.statusTaggingId,
			BOOKED_STATUS_IDS
		)
	];
	if (input.branchId) {
		conditions.push(
			eq(table.surgicalCaseTable.branchId, input.branchId)
		);
	}
	if (input.otRoomId) {
		conditions.push(
			eq(table.surgicalCaseTable.otRoomId, input.otRoomId)
		);
	}
	if (input.dateFrom) {
		conditions.push(
			gte(
				table.surgicalCaseTable.scheduledStart,
				`${input.dateFrom}T00:00:00.000Z`
			)
		);
	}
	if (input.dateTo) {
		conditions.push(
			lte(
				table.surgicalCaseTable.scheduledStart,
				`${input.dateTo}T23:59:59.999Z`
			)
		);
	}
	if (input.providerId) {
		conditions.push(
			eq(table.surgicalCaseTable.providerId, input.providerId)
		);
	}
	if (input.status) {
		const statusId = Number(input.status);
		if (Number.isFinite(statusId) && statusId > 0) {
			conditions.push(
				eq(table.surgicalCaseTable.statusTaggingId, statusId)
			);
		}
	}
	const search = input.search?.trim();
	if (search) {
		const like = `%${search}%`;
		const fields: (SQL | undefined)[] = [];
		const on = (input.searchOn ?? 'all').toLowerCase();
		if (on === 'all' || on === 'hrn') {
			fields.push(ilike(table.patientTable.code, like));
		}
		if (on === 'all' || on === 'encounter') {
			fields.push(ilike(table.patientVisitTable.visitNo, like));
		}
		if (on === 'all' || on === 'patient') {
			fields.push(
				ilike(table.patientTable.firstName, like),
				ilike(table.patientTable.lastName, like)
			);
		}
		if (on === 'all' || on === 'booking') {
			fields.push(ilike(table.surgicalCaseTable.bookingNo, like));
		}
		const expression = or(...fields);
		if (expression) conditions.push(expression);
	}
	return conditions;
}

export async function listOtBookings(input: {
	hospitalId: string;
	branchId?: string | null;
	otRoomId?: number | null;
	dateFrom?: string | null;
	dateTo?: string | null;
	providerId?: string | null;
	status?: string | null;
	searchOn?: string | null;
	search?: string | null;
	page?: number;
	pageSize?: number;
}): Promise<PaginatedResult<OtBookingRow>> {
	const { page, pageSize, limit, offset } =
		normalizePagination(input);
	const conditions = bookingConditions(input);

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
			surgeonName: staffDisplayNameSql(otSurgeon),
			providerName: staffDisplayNameSql(otProvider),
			paediatricianName: staffDisplayNameSql(otPaediatrician),
			admittingDoctorName: staffDisplayNameSql(otAdmittingDoctor),
			branchName: table.hospitalBranchTable.name,
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
			otSurgeon,
			eq(table.surgicalCaseTable.surgeonId, otSurgeon.id)
		)
		.leftJoin(
			otProvider,
			eq(table.surgicalCaseTable.providerId, otProvider.id)
		)
		.leftJoin(
			otPaediatrician,
			eq(table.surgicalCaseTable.paediatricianId, otPaediatrician.id)
		)
		.leftJoin(
			otAdmittingDoctor,
			eq(
				table.ipdAdmissionTable.admittingDoctorId,
				otAdmittingDoctor.id
			)
		)
		.leftJoin(
			table.hospitalBranchTable,
			eq(
				table.surgicalCaseTable.branchId,
				table.hospitalBranchTable.id
			)
		)
		.where(and(...conditions))
		.orderBy(
			desc(table.surgicalCaseTable.scheduledStart),
			desc(table.surgicalCaseTable.id)
		)
		.limit(limit)
		.offset(offset);

	const [totalRow] = await ensureDb()
		.select({ total: count() })
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
			otSurgeon,
			eq(table.surgicalCaseTable.surgeonId, otSurgeon.id)
		)
		.where(and(...conditions));
	const total = Number(totalRow?.total ?? 0);

	return {
		data: rows.map((r) => ({
			id: r.sc.id,
			bookingNo: r.sc.bookingNo,
			otRoomId: r.sc.otRoomId,
			theatreName: r.roomName,
			scheduledStart: r.sc.scheduledStart,
			scheduledEnd: r.sc.scheduledEnd,
			hrn: r.patient.code,
			ipNo: r.admissionNo,
			visitNo: r.visitNo,
			patientId: r.sc.patientId,
			visitId: r.sc.visitId,
			patientName: r.patientName ?? '—',
			ageGender: ageGenderLabel({
				dateOfBirth: r.patient.dateOfBirth,
				genderName: r.genderName
			}),
			wardName: r.wardName,
			bedNo: r.bedName,
			admittingDoctorName: r.admittingDoctorName,
			procedureName: r.sc.procedureName,
			statusTaggingId: r.sc.statusTaggingId,
			statusName: r.statusName,
			statusCode: r.statusCode,
			surgeonId: r.sc.surgeonId,
			surgeonName: r.surgeonName,
			providerId: r.sc.providerId,
			providerName: r.providerName,
			paediatricianId: r.sc.paediatricianId,
			paediatricianName: r.paediatricianName,
			provisionalDiagnosis: r.sc.provisionalDiagnosis,
			durationMinutes: r.sc.durationMinutes,
			clinicalNotes: r.sc.clinicalNotes,
			priority: r.sc.priority,
			branchId: r.sc.branchId,
			branchName: r.branchName,
			admissionId: r.sc.admissionId
		})),
		total,
		page,
		pageSize,
		totalPages: Math.max(1, Math.ceil(total / pageSize))
	};
}

export async function getOtBookingById(input: {
	hospitalId: string;
	caseId: number;
}): Promise<OtBookingRow | null> {
	const [r] = await ensureDb()
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
			surgeonName: staffDisplayNameSql(otSurgeon),
			providerName: staffDisplayNameSql(otProvider),
			paediatricianName: staffDisplayNameSql(otPaediatrician),
			admittingDoctorName: staffDisplayNameSql(otAdmittingDoctor),
			branchName: table.hospitalBranchTable.name,
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
			otSurgeon,
			eq(table.surgicalCaseTable.surgeonId, otSurgeon.id)
		)
		.leftJoin(
			otProvider,
			eq(table.surgicalCaseTable.providerId, otProvider.id)
		)
		.leftJoin(
			otPaediatrician,
			eq(table.surgicalCaseTable.paediatricianId, otPaediatrician.id)
		)
		.leftJoin(
			otAdmittingDoctor,
			eq(
				table.ipdAdmissionTable.admittingDoctorId,
				otAdmittingDoctor.id
			)
		)
		.leftJoin(
			table.hospitalBranchTable,
			eq(
				table.surgicalCaseTable.branchId,
				table.hospitalBranchTable.id
			)
		)
		.where(
			and(
				eq(table.surgicalCaseTable.id, input.caseId),
				eq(table.surgicalCaseTable.hospitalId, input.hospitalId),
				ne(table.surgicalCaseTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!r) return null;
	return {
		id: r.sc.id,
		bookingNo: r.sc.bookingNo,
		otRoomId: r.sc.otRoomId,
		theatreName: r.roomName,
		scheduledStart: r.sc.scheduledStart,
		scheduledEnd: r.sc.scheduledEnd,
		hrn: r.patient.code,
		ipNo: r.admissionNo,
		visitNo: r.visitNo,
		patientId: r.sc.patientId,
		visitId: r.sc.visitId,
		patientName: r.patientName ?? '—',
		ageGender: ageGenderLabel({
			dateOfBirth: r.patient.dateOfBirth,
			genderName: r.genderName
		}),
		wardName: r.wardName,
		bedNo: r.bedName,
		admittingDoctorName: r.admittingDoctorName,
		procedureName: r.sc.procedureName,
		statusTaggingId: r.sc.statusTaggingId,
		statusName: r.statusName,
		statusCode: r.statusCode,
		surgeonId: r.sc.surgeonId,
		surgeonName: r.surgeonName,
		providerId: r.sc.providerId,
		providerName: r.providerName,
		paediatricianId: r.sc.paediatricianId,
		paediatricianName: r.paediatricianName,
		provisionalDiagnosis: r.sc.provisionalDiagnosis,
		durationMinutes: r.sc.durationMinutes,
		clinicalNotes: r.sc.clinicalNotes,
		priority: r.sc.priority,
		branchId: r.sc.branchId,
		branchName: r.branchName,
		admissionId: r.sc.admissionId
	};
}

export async function bookOtRequest(input: {
	hospitalId: string;
	caseId: number;
	otRoomId: number;
	scheduledStart: string;
	scheduledEnd: string;
	staffId?: string | null;
	notes?: string | null;
}) {
	const db = ensureDb();
	const start = new Date(input.scheduledStart);
	const end = new Date(input.scheduledEnd);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
		throw error(400, 'Booking date and time are required.');
	}
	if (end <= start)
		throw error(400, 'End time must be after start time.');

	const [caseRow] = await db
		.select()
		.from(table.surgicalCaseTable)
		.where(
			and(
				eq(table.surgicalCaseTable.id, input.caseId),
				eq(table.surgicalCaseTable.hospitalId, input.hospitalId),
				ne(table.surgicalCaseTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!caseRow) throw error(404, 'OT request not found.');
	if (caseRow.statusTaggingId !== 71) {
		throw error(409, 'This OT request has already been booked.');
	}

	const [room] = await db
		.select()
		.from(table.otRoomTable)
		.where(
			and(
				eq(table.otRoomTable.id, input.otRoomId),
				eq(table.otRoomTable.hospitalId, input.hospitalId),
				eq(table.otRoomTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.limit(1);
	if (!room) throw error(404, 'Theatre not found or inactive.');
	if (room.branchId !== caseRow.branchId) {
		throw error(400, 'Theatre belongs to a different facility.');
	}

	const conflicts = await db
		.select({
			id: table.surgicalCaseTable.id,
			start: table.surgicalCaseTable.scheduledStart,
			end: table.surgicalCaseTable.scheduledEnd,
			status: table.surgicalCaseTable.statusTaggingId
		})
		.from(table.surgicalCaseTable)
		.where(
			and(
				eq(table.surgicalCaseTable.hospitalId, input.hospitalId),
				eq(table.surgicalCaseTable.otRoomId, input.otRoomId),
				ne(table.surgicalCaseTable.id, input.caseId),
				ne(table.surgicalCaseTable.statusId, StatusEnum.DELETED),
				inArray(table.surgicalCaseTable.statusTaggingId, [
					OtBookingStatusTaggingEnum.UNCONFIRMED,
					OtBookingStatusTaggingEnum.CONFIRMED,
					OtBookingStatusTaggingEnum.OT_PAC,
					OtBookingStatusTaggingEnum.CHECKED_IN_PRE_OP,
					OtBookingStatusTaggingEnum.POST_OP
				])
			)
		);
	const freezeMs = Math.max(0, room.freezeMinutes ?? 0) * 60_000;
	for (const existing of conflicts) {
		if (!existing.start || !existing.end) continue;
		const existingStart = new Date(existing.start).getTime();
		const existingEnd = new Date(existing.end).getTime();
		if (
			existingStart < end.getTime() + freezeMs &&
			existingEnd + freezeMs > start.getTime()
		) {
			throw error(
				409,
				'The selected theatre is already booked for this time (including freeze time).'
			);
		}
	}

	if (room.otAdvanceMandatory) {
		const paid = await sumIpAdvanceDepositsForVisit({
			hospitalId: input.hospitalId,
			visitId: caseRow.visitId
		});
		if (paid <= 0) {
			throw error(
				409,
				'This theatre requires an advance deposit before OT booking.'
			);
		}
	}

	const [updated] = await db
		.update(table.surgicalCaseTable)
		.set({
			otRoomId: input.otRoomId,
			scheduledStart: start.toISOString(),
			scheduledEnd: end.toISOString(),
			statusTaggingId: OtBookingStatusTaggingEnum.UNCONFIRMED,
			clinicalNotes: input.notes?.trim() || caseRow.clinicalNotes,
			updatedAt: new Date().toISOString()
		})
		.where(
			and(
				eq(table.surgicalCaseTable.id, input.caseId),
				eq(table.surgicalCaseTable.hospitalId, input.hospitalId)
			)
		)
		.returning();
	if (!updated) throw error(500, 'Unable to book OT request.');

	const bookingNo = `OT-${(dateOnly(start.toISOString()) ?? '').replaceAll('-', '')}-${String(updated.id).padStart(5, '0')}`;
	const [withNo] = await db
		.update(table.surgicalCaseTable)
		.set({ bookingNo })
		.where(eq(table.surgicalCaseTable.id, updated.id))
		.returning();

	await audit(updated.id, 'booked', input.staffId ?? null, {
		bookingNo,
		otRoomId: input.otRoomId,
		scheduledStart: start.toISOString(),
		scheduledEnd: end.toISOString()
	});
	publishPerioperativeEvent({
		type: PerioperativeSseEventTypeEnum.CASE_SCHEDULED,
		hospitalId: input.hospitalId,
		data: { caseId: updated.id }
	});
	return withNo ?? updated;
}

export async function changeOtBookingStatus(input: {
	hospitalId: string;
	caseId: number;
	statusTaggingId: number;
	staffId?: string | null;
	reason?: string | null;
}) {
	const [current] = await ensureDb()
		.select()
		.from(table.surgicalCaseTable)
		.where(
			and(
				eq(table.surgicalCaseTable.id, input.caseId),
				eq(table.surgicalCaseTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!current) throw error(404, 'Booking not found.');

	if (
		!canTransitionOtStatus(
			current.statusTaggingId,
			input.statusTaggingId
		)
	) {
		throw error(409, 'This status change is not allowed.');
	}
	if (
		input.statusTaggingId === OtBookingStatusTaggingEnum.ABORTED &&
		!input.reason?.trim()
	) {
		throw error(400, 'Abort reason is required.');
	}

	const now = new Date().toISOString();
	const patch: Record<string, unknown> = {
		statusTaggingId: input.statusTaggingId,
		updatedAt: now
	};
	if (
		input.statusTaggingId ===
		OtBookingStatusTaggingEnum.CHECKED_IN_PRE_OP
	) {
		patch.inOtAt = current.inOtAt ?? now;
		patch.inOtBy = input.staffId ?? null;
		patch.actualStart = current.actualStart ?? now;
	}
	if (input.statusTaggingId === OtBookingStatusTaggingEnum.POST_OP) {
		patch.postOpAt = now;
		patch.postOpBy = input.staffId ?? null;
		patch.actualEnd = now;
	}
	if (input.statusTaggingId === OtBookingStatusTaggingEnum.ABORTED) {
		patch.abortReason = input.reason?.trim();
	}

	const [row] = await ensureDb()
		.update(table.surgicalCaseTable)
		.set(patch)
		.where(
			and(
				eq(table.surgicalCaseTable.id, input.caseId),
				eq(table.surgicalCaseTable.hospitalId, input.hospitalId)
			)
		)
		.returning();
	await audit(input.caseId, 'status_changed', input.staffId ?? null, {
		from: current.statusTaggingId,
		to: input.statusTaggingId,
		reason: input.reason ?? null
	});
	publishPerioperativeEvent({
		type: PerioperativeSseEventTypeEnum.CASE_STATUS,
		hospitalId: input.hospitalId,
		data: { caseId: input.caseId, status: input.statusTaggingId }
	});
	return row;
}

export async function tagOtPatient(input: {
	hospitalId: string;
	caseId: number;
	staffId?: string | null;
	notes?: string | null;
}) {
	const now = new Date().toISOString();
	const [row] = await ensureDb()
		.update(table.surgicalCaseTable)
		.set({
			taggedAt: now,
			taggedBy: input.staffId ?? null,
			clinicalNotes: input.notes?.trim() || undefined,
			updatedAt: now
		})
		.where(
			and(
				eq(table.surgicalCaseTable.id, input.caseId),
				eq(table.surgicalCaseTable.hospitalId, input.hospitalId)
			)
		)
		.returning();
	if (!row) throw error(404, 'Booking not found.');
	await audit(input.caseId, 'patient_tagged', input.staffId ?? null);
	return row;
}

export async function saveOtClinicalDetails(input: {
	hospitalId: string;
	caseId: number;
	provisionalDiagnosis?: string | null;
	clinicalNotes?: string | null;
	surgeonId?: string | null;
	paediatricianId?: string | null;
	providerId?: string | null;
	durationMinutes?: number | null;
	staffId?: string | null;
}) {
	const [row] = await ensureDb()
		.update(table.surgicalCaseTable)
		.set({
			provisionalDiagnosis:
				input.provisionalDiagnosis?.trim() || null,
			clinicalNotes: input.clinicalNotes?.trim() || null,
			surgeonId: input.surgeonId ?? null,
			paediatricianId: input.paediatricianId ?? null,
			providerId: input.providerId ?? null,
			durationMinutes: input.durationMinutes ?? null,
			updatedAt: new Date().toISOString()
		})
		.where(
			and(
				eq(table.surgicalCaseTable.id, input.caseId),
				eq(table.surgicalCaseTable.hospitalId, input.hospitalId)
			)
		)
		.returning();
	if (!row) throw error(404, 'Booking not found.');
	await audit(
		input.caseId,
		'clinical_details_saved',
		input.staffId ?? null
	);
	return row;
}

export async function getOtScheduler(input: {
	hospitalId: string;
	branchId?: string | null;
	date: string;
	search?: string;
}): Promise<OtSchedulerResult> {
	const date = input.date?.trim();
	if (!date) throw error(400, 'Date is required.');
	const conditions: SQL[] = [
		eq(table.otRoomTable.hospitalId, input.hospitalId),
		eq(table.otRoomTable.statusId, StatusEnum.ACTIVE)
	];
	if (input.branchId) {
		conditions.push(eq(table.otRoomTable.branchId, input.branchId));
	}
	const rooms = await ensureDb()
		.select({
			id: table.otRoomTable.id,
			name: table.otRoomTable.name,
			freezeMinutes: table.otRoomTable.freezeMinutes,
			otAdvanceMandatory: table.otRoomTable.otAdvanceMandatory
		})
		.from(table.otRoomTable)
		.where(and(...conditions))
		.orderBy(table.otRoomTable.sequenceNo, table.otRoomTable.name);

	const bookingConditions: SQL[] = [
		eq(table.surgicalCaseTable.hospitalId, input.hospitalId),
		ne(table.surgicalCaseTable.statusId, StatusEnum.DELETED),
		inArray(
			table.surgicalCaseTable.statusTaggingId,
			BOOKED_STATUS_IDS
		),
		gte(
			table.surgicalCaseTable.scheduledStart,
			`${date}T00:00:00.000Z`
		),
		lte(
			table.surgicalCaseTable.scheduledStart,
			`${date}T23:59:59.999Z`
		)
	];
	if (input.branchId) {
		bookingConditions.push(
			eq(table.surgicalCaseTable.branchId, input.branchId)
		);
	}
	const search = input.search?.trim();
	if (search) {
		const like = `%${search}%`;
		const expression = or(
			ilike(table.patientTable.code, like),
			ilike(table.patientTable.firstName, like),
			ilike(table.patientTable.lastName, like),
			ilike(otSurgeon.firstName, like),
			ilike(otSurgeon.lastName, like),
			ilike(table.specializationTable.name, like)
		);
		if (expression) bookingConditions.push(expression);
	}

	const rows = await ensureDb()
		.select({
			id: table.surgicalCaseTable.id,
			bookingNo: table.surgicalCaseTable.bookingNo,
			patientName: patientDisplayNameSql(),
			hrn: table.patientTable.code,
			visitNo: table.patientVisitTable.visitNo,
			otRoomId: table.surgicalCaseTable.otRoomId,
			otRoomName: table.otRoomTable.name,
			scheduledStart: table.surgicalCaseTable.scheduledStart,
			scheduledEnd: table.surgicalCaseTable.scheduledEnd,
			statusTaggingId: table.surgicalCaseTable.statusTaggingId,
			statusName: table.statusTaggingTable.name,
			statusCode: table.statusTaggingTable.code,
			procedureName: table.surgicalCaseTable.procedureName,
			surgeonName: staffDisplayNameSql(otSurgeon),
			specialtyName: table.specializationTable.name,
			priority: table.surgicalCaseTable.priority
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
			otSurgeon,
			eq(table.surgicalCaseTable.surgeonId, otSurgeon.id)
		)
		.leftJoin(
			table.specializationTable,
			eq(otSurgeon.specializationId, table.specializationTable.id)
		)
		.where(and(...bookingConditions))
		.orderBy(table.surgicalCaseTable.scheduledStart);

	return {
		date,
		rooms,
		bookings: rows
			.filter(
				(r) =>
					r.otRoomId != null && r.scheduledStart && r.scheduledEnd
			)
			.map((r) => ({
				id: r.id,
				bookingNo: r.bookingNo,
				patientName: r.patientName ?? '—',
				hrn: r.hrn,
				visitNo: r.visitNo,
				otRoomId: r.otRoomId!,
				otRoomName: r.otRoomName,
				scheduledStart: r.scheduledStart!,
				scheduledEnd: r.scheduledEnd!,
				statusTaggingId: r.statusTaggingId,
				statusName: r.statusName,
				statusCode: r.statusCode,
				procedureName: r.procedureName,
				surgeonName: r.surgeonName,
				specialtyName: r.specialtyName,
				priority: r.priority
			}))
	};
}
