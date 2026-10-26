import { error } from '@sveltejs/kit';
import {
	and,
	count,
	desc,
	eq,
	ilike,
	inArray,
	ne,
	or,
	type SQL
} from 'drizzle-orm';
import {
	OtBookingStatusTaggingEnum,
	StatusEnum,
	SurgicalCaseStatusTaggingEnum
} from '$lib/model/enum/db-link';
import type { OtRequestRow } from '$lib/model/type/medora/operation-theatre.type';
import type { PaginatedResult } from '$lib/model/type/pagination.type';
import { normalizePagination } from '$lib/model/type/pagination.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { publishPerioperativeEvent } from '$lib/server/medora/perioperative/perioperative-event-bus.server';
import { PerioperativeSseEventTypeEnum } from '$lib/model/enum/perioperative.enum';
import {
	ageGenderLabel,
	dateOnly,
	otPaediatrician,
	otProvider,
	otSurgeon,
	patientDisplayNameSql,
	staffDisplayNameSql
} from './ot-shared.server';

function requestConditions(input: {
	hospitalId: string;
	branchId?: string | null;
	search?: string;
	scope?: 'pending' | 'booked' | 'all';
}): SQL[] {
	const conditions: SQL[] = [
		eq(table.surgicalCaseTable.hospitalId, input.hospitalId),
		ne(table.surgicalCaseTable.statusId, StatusEnum.DELETED)
	];
	if (input.branchId) {
		conditions.push(
			eq(table.surgicalCaseTable.branchId, input.branchId)
		);
	}
	if (input.scope === 'pending') {
		conditions.push(
			eq(
				table.surgicalCaseTable.statusTaggingId,
				SurgicalCaseStatusTaggingEnum.REQUESTED
			)
		);
	} else if (input.scope === 'booked') {
		conditions.push(
			inArray(
				table.surgicalCaseTable.statusTaggingId,
				[90, 91, 92, 93, 94, 95]
			)
		);
	}
	const search = input.search?.trim();
	if (search) {
		const like = `%${search}%`;
		const expression = or(
			ilike(table.patientTable.code, like),
			ilike(table.patientTable.firstName, like),
			ilike(table.patientTable.lastName, like),
			ilike(table.patientVisitTable.visitNo, like),
			ilike(table.patientTable.phonePrimary, like),
			ilike(table.surgicalCaseTable.procedureName, like),
			ilike(table.surgicalCaseTable.provisionalDiagnosis, like),
			ilike(table.surgicalCaseTable.bookingNo, like),
			ilike(otSurgeon.firstName, like),
			ilike(otSurgeon.lastName, like)
		);
		if (expression) conditions.push(expression);
	}
	return conditions;
}

export async function listOtRequests(input: {
	hospitalId: string;
	branchId?: string | null;
	page?: number;
	pageSize?: number;
	search?: string;
	scope?: 'pending' | 'booked' | 'all';
}): Promise<PaginatedResult<OtRequestRow>> {
	const { page, pageSize, limit, offset } =
		normalizePagination(input);
	const conditions = requestConditions(input);

	const rows = await ensureDb()
		.select({
			sc: table.surgicalCaseTable,
			patient: table.patientTable,
			genderName: table.genderTable.name,
			visitNo: table.patientVisitTable.visitNo,
			admissionNo: table.ipdAdmissionTable.admissionNo,
			roomName: table.otRoomTable.name,
			statusName: table.statusTaggingTable.name,
			statusCode: table.statusTaggingTable.code,
			surgeonName: staffDisplayNameSql(otSurgeon),
			paediatricianName: staffDisplayNameSql(otPaediatrician),
			providerName: staffDisplayNameSql(otProvider),
			serviceName: table.serviceItemTable.serviceName,
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
			otPaediatrician,
			eq(table.surgicalCaseTable.paediatricianId, otPaediatrician.id)
		)
		.leftJoin(
			otProvider,
			eq(table.surgicalCaseTable.providerId, otProvider.id)
		)
		.leftJoin(
			table.serviceItemTable,
			eq(table.surgicalCaseTable.serviceId, table.serviceItemTable.id)
		)
		.where(and(...conditions))
		.orderBy(
			desc(table.surgicalCaseTable.otRequestDate),
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
			hospitalId: r.sc.hospitalId,
			branchId: r.sc.branchId,
			patientId: r.sc.patientId,
			visitId: r.sc.visitId,
			admissionId: r.sc.admissionId,
			hrn: r.patient.code,
			patientCode: r.patient.code,
			encounterNo: r.visitNo,
			ipNo: r.admissionNo,
			patientName: r.patientName ?? '—',
			dateOfBirth: r.patient.dateOfBirth,
			ageGender: ageGenderLabel({
				dateOfBirth: r.patient.dateOfBirth,
				genderName: r.genderName
			}),
			mobileNo: r.patient.phonePrimary,
			surgeonId: r.sc.surgeonId,
			surgeonName: r.surgeonName,
			paediatricianId: r.sc.paediatricianId,
			paediatricianName: r.paediatricianName,
			providerId: r.sc.providerId,
			providerName: r.providerName,
			procedureName: r.sc.procedureName,
			serviceName: r.serviceName,
			provisionalDiagnosis: r.sc.provisionalDiagnosis,
			otRequestDate: r.sc.otRequestDate,
			durationMinutes: r.sc.durationMinutes,
			scheduledStart: r.sc.scheduledStart,
			scheduledEnd: r.sc.scheduledEnd,
			otRoomId: r.sc.otRoomId,
			otRoomName: r.roomName,
			statusTaggingId: r.sc.statusTaggingId,
			statusName: r.statusName,
			statusCode: r.statusCode,
			bookingNo: r.sc.bookingNo,
			priority: r.sc.priority,
			caseType: r.sc.caseType,
			createdAt: r.sc.createdAt
		})),
		total,
		page,
		pageSize,
		totalPages: Math.max(1, Math.ceil(total / pageSize))
	};
}

export async function createOtRequest(input: {
	hospitalId: string;
	visitId: string;
	staffId?: string | null;
	procedureName: string;
	serviceId?: number | null;
	surgeonId?: string | null;
	paediatricianId?: string | null;
	providerId?: string | null;
	provisionalDiagnosis?: string | null;
	otRequestDate?: string | null;
	durationMinutes?: number | null;
	priority?: string;
	notes?: string | null;
}) {
	const db = ensureDb();
	const visitId = input.visitId?.trim();
	if (!visitId) throw error(400, 'Patient encounter is required.');
	const procedureName = input.procedureName?.trim();
	if (!procedureName)
		throw error(400, 'Service / procedure is required.');

	const [visit] = await db
		.select({
			id: table.patientVisitTable.id,
			hospitalId: table.patientVisitTable.hospitalId,
			branchId: table.patientVisitTable.branchId,
			patientId: table.patientVisitTable.patientId
		})
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.id, visitId),
				eq(table.patientVisitTable.hospitalId, input.hospitalId),
				ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!visit) throw error(404, 'Patient encounter not found.');

	const [admission] = await db
		.select({ id: table.ipdAdmissionTable.id })
		.from(table.ipdAdmissionTable)
		.where(
			and(
				eq(table.ipdAdmissionTable.visitId, visitId),
				eq(table.ipdAdmissionTable.hospitalId, input.hospitalId)
			)
		)
		.orderBy(desc(table.ipdAdmissionTable.admittedAt))
		.limit(1);

	const [row] = await db
		.insert(table.surgicalCaseTable)
		.values({
			hospitalId: input.hospitalId,
			branchId: visit.branchId,
			patientId: visit.patientId,
			visitId,
			admissionId: admission?.id ?? null,
			procedureName,
			caseType: 'general',
			priority: input.priority ?? 'elective',
			statusTaggingId: SurgicalCaseStatusTaggingEnum.REQUESTED,
			otRequestDate:
				input.otRequestDate?.trim() ||
				dateOnly(new Date().toISOString()),
			surgeonId: input.surgeonId ?? null,
			paediatricianId: input.paediatricianId ?? null,
			providerId: input.providerId ?? null,
			serviceId: input.serviceId ?? null,
			provisionalDiagnosis:
				input.provisionalDiagnosis?.trim() || null,
			durationMinutes: input.durationMinutes ?? null,
			otRequestedBy: input.staffId ?? null,
			clinicalNotes: input.notes?.trim() || null
		})
		.returning();
	if (!row) throw error(500, 'Unable to create OT request.');
	publishPerioperativeEvent({
		type: PerioperativeSseEventTypeEnum.BOARD_REFRESH,
		hospitalId: input.hospitalId,
		data: { caseId: row.id }
	});
	return row;
}

export async function updateOtRequest(input: {
	hospitalId: string;
	id: number;
	procedureName?: string;
	serviceId?: number | null;
	surgeonId?: string | null;
	paediatricianId?: string | null;
	providerId?: string | null;
	provisionalDiagnosis?: string | null;
	otRequestDate?: string | null;
	durationMinutes?: number | null;
	priority?: string;
	notes?: string | null;
}) {
	const [row] = await ensureDb()
		.update(table.surgicalCaseTable)
		.set({
			procedureName: input.procedureName?.trim() || undefined,
			serviceId: input.serviceId ?? null,
			surgeonId: input.surgeonId ?? null,
			paediatricianId: input.paediatricianId ?? null,
			providerId: input.providerId ?? null,
			provisionalDiagnosis:
				input.provisionalDiagnosis?.trim() || null,
			otRequestDate: input.otRequestDate?.trim() || null,
			durationMinutes: input.durationMinutes ?? null,
			priority: input.priority,
			clinicalNotes: input.notes?.trim() || null,
			updatedAt: new Date().toISOString()
		})
		.where(
			and(
				eq(table.surgicalCaseTable.id, input.id),
				eq(table.surgicalCaseTable.hospitalId, input.hospitalId),
				ne(table.surgicalCaseTable.statusId, StatusEnum.DELETED)
			)
		)
		.returning();
	if (!row) throw error(404, 'OT request not found.');
	return row;
}

export async function cancelOtRequest(input: {
	hospitalId: string;
	id: number;
	staffId?: string | null;
}) {
	const [row] = await ensureDb()
		.update(table.surgicalCaseTable)
		.set({
			statusTaggingId: OtBookingStatusTaggingEnum.ABORTED,
			abortReason: 'Request cancelled',
			updatedAt: new Date().toISOString()
		})
		.where(
			and(
				eq(table.surgicalCaseTable.id, input.id),
				eq(table.surgicalCaseTable.hospitalId, input.hospitalId),
				ne(table.surgicalCaseTable.statusId, StatusEnum.DELETED),
				eq(
					table.surgicalCaseTable.statusTaggingId,
					SurgicalCaseStatusTaggingEnum.REQUESTED
				)
			)
		)
		.returning();
	if (!row) throw error(404, 'OT request not found.');
	await ensureDb()
		.insert(table.surgicalCaseAuditTable)
		.values({
			surgicalCaseId: row.id,
			action: 'request_cancelled',
			staffId: input.staffId ?? null
		});
	return row;
}

export async function listOtRequestVisits(input: {
	hospitalId: string;
	search?: string;
	visitId?: string | null;
	limit?: number;
}) {
	const search = input.search?.trim();
	const conditions: SQL[] = [
		eq(table.patientVisitTable.hospitalId, input.hospitalId),
		ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
	];
	if (input.visitId?.trim()) {
		conditions.push(
			eq(table.patientVisitTable.id, input.visitId.trim())
		);
	}
	if (search) {
		const like = `%${search}%`;
		const expression = or(
			ilike(table.patientTable.code, like),
			ilike(table.patientTable.firstName, like),
			ilike(table.patientTable.lastName, like),
			ilike(table.patientVisitTable.visitNo, like),
			ilike(table.patientTable.phonePrimary, like)
		);
		if (expression) conditions.push(expression);
	}
	const rows = await ensureDb()
		.select({
			visitId: table.patientVisitTable.id,
			visitNo: table.patientVisitTable.visitNo,
			patientId: table.patientTable.id,
			hrn: table.patientTable.code,
			patientName: patientDisplayNameSql(),
			dateOfBirth: table.patientTable.dateOfBirth,
			genderName: table.genderTable.name,
			mobileNo: table.patientTable.phonePrimary,
			admissionId: table.ipdAdmissionTable.id,
			admissionNo: table.ipdAdmissionTable.admissionNo,
			admittedAt: table.ipdAdmissionTable.admittedAt
		})
		.from(table.patientVisitTable)
		.innerJoin(
			table.patientTable,
			eq(table.patientVisitTable.patientId, table.patientTable.id)
		)
		.leftJoin(
			table.genderTable,
			eq(table.patientTable.genderId, table.genderTable.id)
		)
		.leftJoin(
			table.ipdAdmissionTable,
			and(
				eq(
					table.ipdAdmissionTable.visitId,
					table.patientVisitTable.id
				),
				eq(table.ipdAdmissionTable.admissionStatus, 1)
			)
		)
		.where(and(...conditions))
		.orderBy(desc(table.patientVisitTable.createdAt))
		.limit(Math.min(50, Math.max(1, input.limit ?? 20)));
	return rows.map((r) => ({
		...r,
		ageGender: ageGenderLabel({
			dateOfBirth: r.dateOfBirth,
			genderName: r.genderName
		})
	}));
}
