import { error, type RequestEvent } from '@sveltejs/kit';
import { and, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';
import { StatusEnum, VisitTypeEnum } from '$lib/model/enum/db-link';
import { EdBoardColumnEnum } from '$lib/model/enum/perioperative.enum';
import type {
	EdRegistrationDetailRow,
	EdRegistrationListRow
} from '$lib/model/type/medora/ed-admission.type';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { acuityDisplayForTriageLevelId } from '$lib/server/medora/er/ed-triage-level.server';
import { assignErBedToEncounter } from '$lib/server/medora/ed/er-bed-assignment.server';
import { ensureEdEncounter } from '$lib/server/medora/ed/ed-workbench.server';
import { createPatientVisitInHospital } from '$lib/server/medora/patient-visit/patient-visit.server';

export type RegisterEdArrivalPayload = {
	hospitalId: string;
	patientId: string;
	branchId: string;
	chiefComplaint?: string | null;
	doctorId?: string | null;
	sourceOpdVisitId?: string | null;
	edTriageLevelId?: number | null;
	isMlc?: boolean;
	registrationRemarks?: string | null;
	arrivedAt?: string | null;
	erBedId?: number | null;
};

export type RegisterEdArrivalResult = {
	visitId: string;
	visitNo: string | null;
	edEncounterId: number;
};

export type UpdateEdRegistrationPayload = {
	hospitalId: string;
	visitId: string;
	branchId?: string;
	chiefComplaint?: string | null;
	doctorId?: string | null;
	edTriageLevelId?: number | null;
	isMlc?: boolean;
	registrationRemarks?: string | null;
	arrivedAt?: string | null;
};

function mapRegistrationRow(r: {
	edEncounterId: number;
	visitId: string;
	visitNo: string | null;
	boardColumn: string;
	acuityLevel: string | null;
	edTriageLevelId: number | null;
	edTriageLevel: number | null;
	edTriageLevelName: string | null;
	edTriageLevelColor: string | null;
	isMlc: boolean;
	fastTrack: boolean;
	arrivedAt: string;
	chiefComplaint: string | null;
	patientId: string;
	patientCode: string | null;
	patientFirst: string | null;
	patientMiddle: string | null;
	patientLast: string | null;
	branchId: string | null;
	erBedId: number | null;
	wardName: string | null;
	wardCode: string | null;
	roomName: string | null;
	roomCode: string | null;
	bedName: string | null;
	bedCode: string | null;
	assignedDoctorId: string | null;
	registrationRemarks: string | null;
}): EdRegistrationListRow {
	const ward = r.wardCode?.trim() || r.wardName?.trim() || '';
	const room = r.roomCode?.trim() || r.roomName?.trim() || '';
	const bed = r.bedCode?.trim() || r.bedName?.trim() || '';
	const erBedLabel =
		r.erBedId != null
			? [ward, room, bed].filter(Boolean).join(' / ') || null
			: null;
	return {
		edEncounterId: r.edEncounterId,
		visitId: r.visitId,
		visitNo: r.visitNo,
		boardColumn: r.boardColumn,
		acuityLevel: r.acuityLevel,
		edTriageLevelId: r.edTriageLevelId,
		edTriageLevel: r.edTriageLevel,
		edTriageLevelName: r.edTriageLevelName,
		edTriageLevelColor: r.edTriageLevelColor,
		isMlc: r.isMlc,
		fastTrack: r.fastTrack,
		arrivedAt: r.arrivedAt,
		chiefComplaint: r.chiefComplaint,
		patientId: r.patientId,
		patientCode: r.patientCode,
		patientName: [r.patientFirst, r.patientMiddle, r.patientLast]
			.filter(Boolean)
			.join(' ')
			.trim(),
		branchId: r.branchId,
		erBedId: r.erBedId,
		erBedLabel,
		assignedDoctorId: r.assignedDoctorId,
		registrationRemarks: r.registrationRemarks
	};
}

const registrationSelect = {
	edEncounterId: table.edEncounterTable.id,
	visitId: table.edEncounterTable.visitId,
	visitNo: table.patientVisitTable.visitNo,
	boardColumn: table.edEncounterTable.boardColumn,
	acuityLevel: table.edEncounterTable.acuityLevel,
	edTriageLevelId: table.edEncounterTable.edTriageLevelId,
	edTriageLevel: table.edTriageLevelTable.level,
	edTriageLevelName: table.edTriageLevelTable.name,
	edTriageLevelColor: table.edTriageLevelTable.color,
	isMlc: table.edEncounterTable.isMlc,
	fastTrack: table.edEncounterTable.fastTrack,
	arrivedAt: table.edEncounterTable.arrivedAt,
	chiefComplaint: table.patientVisitTable.chiefComplaint,
	patientId: table.patientTable.id,
	patientCode: table.patientTable.code,
	patientFirst: table.patientTable.firstName,
	patientMiddle: table.patientTable.middleName,
	patientLast: table.patientTable.lastName,
	branchId: table.patientVisitTable.branchId,
	erBedId: table.edEncounterTable.erBedId,
	wardName: table.erWardTable.name,
	wardCode: table.erWardTable.code,
	roomName: table.erRoomTable.name,
	roomCode: table.erRoomTable.code,
	bedName: table.erBedTable.name,
	bedCode: table.erBedTable.code,
	assignedDoctorId: table.edEncounterTable.assignedDoctorId,
	registrationRemarks: table.edEncounterTable.registrationRemarks
};

function registrationFromClause() {
	const db = ensureDb();
	return db
		.select(registrationSelect)
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
			table.edTriageLevelTable,
			eq(
				table.edEncounterTable.edTriageLevelId,
				table.edTriageLevelTable.id
			)
		)
		.leftJoin(
			table.erBedTable,
			eq(table.edEncounterTable.erBedId, table.erBedTable.id)
		)
		.leftJoin(
			table.erRoomTable,
			eq(table.edEncounterTable.erRoomId, table.erRoomTable.id)
		)
		.leftJoin(
			table.erWardTable,
			eq(table.edEncounterTable.erWardId, table.erWardTable.id)
		);
}

async function applyEncounterRegistrationFields(input: {
	hospitalId: string;
	visitId: string;
	edTriageLevelId?: number | null;
	isMlc?: boolean;
	registrationRemarks?: string | null;
	arrivedAt?: string | null;
	doctorId?: string | null;
}) {
	const acuityLevel = await acuityDisplayForTriageLevelId(
		input.edTriageLevelId ?? undefined
	);
	await ensureDb()
		.update(table.edEncounterTable)
		.set({
			...(input.edTriageLevelId !== undefined
				? { edTriageLevelId: input.edTriageLevelId }
				: {}),
			...(input.isMlc !== undefined ? { isMlc: input.isMlc } : {}),
			...(input.registrationRemarks !== undefined
				? {
						registrationRemarks: input.registrationRemarks?.trim()
							? input.registrationRemarks.trim()
							: null
					}
				: {}),
			...(input.arrivedAt !== undefined && input.arrivedAt
				? { arrivedAt: input.arrivedAt }
				: {}),
			...(input.doctorId !== undefined
				? {
						assignedDoctorId: input.doctorId?.trim()
							? input.doctorId.trim()
							: null
					}
				: {}),
			...(acuityLevel != null ? { acuityLevel } : {})
		})
		.where(
			and(
				eq(table.edEncounterTable.visitId, input.visitId),
				eq(table.edEncounterTable.hospitalId, input.hospitalId)
			)
		);
}

export async function registerEdArrival(
	event: RequestEvent,
	payload: RegisterEdArrivalPayload
): Promise<RegisterEdArrivalResult> {
	const patientId = String(payload.patientId ?? '').trim();
	const branchId = String(payload.branchId ?? '').trim();
	if (!patientId) throw error(400, 'patientId is required');
	if (!branchId) throw error(400, 'branchId is required');

	const sourceRaw = payload.sourceOpdVisitId;
	const sourceOpdVisitId =
		typeof sourceRaw === 'string' && sourceRaw.trim() !== ''
			? sourceRaw.trim()
			: null;

	const visit = await createPatientVisitInHospital(event, {
		hospitalId: payload.hospitalId,
		branchId,
		patientId,
		visitTypeId: VisitTypeEnum.ED,
		doctorId: payload.doctorId?.trim() ? payload.doctorId.trim() : null,
		chiefComplaint: payload.chiefComplaint?.trim()
			? payload.chiefComplaint.trim()
			: null,
		...(sourceOpdVisitId != null
			? { convertFromOpdVisitId: sourceOpdVisitId }
			: {})
	});

	const encounter = await ensureEdEncounter({
		hospitalId: payload.hospitalId,
		visitId: visit.id
	});

	await applyEncounterRegistrationFields({
		hospitalId: payload.hospitalId,
		visitId: visit.id,
		edTriageLevelId: payload.edTriageLevelId ?? null,
		isMlc: payload.isMlc ?? false,
		registrationRemarks: payload.registrationRemarks ?? null,
		arrivedAt: payload.arrivedAt ?? null,
		doctorId: payload.doctorId ?? null
	});

	if (typeof payload.erBedId === 'number' && payload.erBedId > 0) {
		await assignErBedToEncounter({
			hospitalId: payload.hospitalId,
			visitId: visit.id,
			erBedId: payload.erBedId
		});
	}

	return {
		visitId: visit.id,
		visitNo: visit.visitNo,
		edEncounterId: encounter.id
	};
}

export async function updateEdRegistration(
	payload: UpdateEdRegistrationPayload
): Promise<void> {
	const visitId = payload.visitId.trim();
	if (!visitId) throw error(400, 'visitId is required');

	if (payload.branchId != null || payload.chiefComplaint !== undefined) {
		await ensureDb()
			.update(table.patientVisitTable)
			.set({
				...(payload.branchId != null
					? { branchId: payload.branchId }
					: {}),
				...(payload.chiefComplaint !== undefined
					? {
							chiefComplaint: payload.chiefComplaint?.trim()
								? payload.chiefComplaint.trim()
								: null
						}
					: {}),
				...(payload.doctorId !== undefined
					? {
							doctorId: payload.doctorId?.trim()
								? payload.doctorId.trim()
								: null
						}
					: {})
			})
			.where(
				and(
					eq(table.patientVisitTable.id, visitId),
					eq(table.patientVisitTable.hospitalId, payload.hospitalId)
				)
			);
	}

	await applyEncounterRegistrationFields({
		hospitalId: payload.hospitalId,
		visitId,
		edTriageLevelId: payload.edTriageLevelId,
		isMlc: payload.isMlc,
		registrationRemarks: payload.registrationRemarks,
		arrivedAt: payload.arrivedAt,
		doctorId: payload.doctorId
	});
}

export async function getEdRegistrationByVisitId(input: {
	hospitalId: string;
	visitId: string;
}): Promise<EdRegistrationDetailRow | null> {
	const [row] = await registrationFromClause()
		.where(
			and(
				eq(table.edEncounterTable.visitId, input.visitId),
				eq(table.edEncounterTable.hospitalId, input.hospitalId),
				eq(table.edEncounterTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.limit(1);
	if (!row) return null;

	let doctorName: string | null = null;
	if (row.assignedDoctorId) {
		const [staff] = await ensureDb()
			.select({
				name: sql<string>`concat(${table.staffTable.firstName}, ' ', coalesce(${table.staffTable.lastName}, ''))`
			})
			.from(table.staffTable)
			.where(eq(table.staffTable.id, row.assignedDoctorId))
			.limit(1);
		doctorName = staff?.name?.trim() || null;
	}

	return { ...mapRegistrationRow(row), doctorName };
}

export async function listEdRegistrationsPaginated(
	params: PaginationParams & {
		hospitalId: string;
		search?: string;
		boardColumn?: string;
	}
): Promise<PaginatedResult<EdRegistrationListRow>> {
	const { page, pageSize, limit, offset } =
		normalizePagination(params);
	const conditions = [
		eq(table.edEncounterTable.hospitalId, params.hospitalId),
		eq(table.edEncounterTable.statusId, StatusEnum.ACTIVE),
		ne(
			table.edEncounterTable.boardColumn,
			EdBoardColumnEnum.DISCHARGED
		),
		ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
	];

	const boardColumn = params.boardColumn?.trim();
	if (boardColumn) {
		conditions.push(
			eq(table.edEncounterTable.boardColumn, boardColumn)
		);
	}

	const search = params.search?.trim();
	if (search) {
		conditions.push(
			or(
				ilike(table.patientTable.code, `%${search}%`),
				ilike(table.patientTable.firstName, `%${search}%`),
				ilike(table.patientTable.lastName, `%${search}%`),
				ilike(table.patientVisitTable.visitNo, `%${search}%`),
				ilike(table.patientVisitTable.chiefComplaint, `%${search}%`)
			)!
		);
	}

	const whereClause = and(...conditions);

	const db = ensureDb();
	const [countRow] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(table.edEncounterTable)
		.innerJoin(
			table.patientVisitTable,
			eq(table.edEncounterTable.visitId, table.patientVisitTable.id)
		)
		.innerJoin(
			table.patientTable,
			eq(table.patientVisitTable.patientId, table.patientTable.id)
		)
		.where(whereClause);
	const total = countRow?.count ?? 0;

	const rows = await registrationFromClause()
		.where(whereClause)
		.orderBy(desc(table.edEncounterTable.arrivedAt))
		.limit(limit)
		.offset(offset);

	const data = rows.map(mapRegistrationRow);

	return {
		data,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize) || 1
	};
}
