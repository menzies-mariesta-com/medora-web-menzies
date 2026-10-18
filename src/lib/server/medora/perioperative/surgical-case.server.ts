import { error } from '@sveltejs/kit';
import { and, desc, eq, gte, lte, ne, sql } from 'drizzle-orm';
import {
	SurgicalCaseStatusTaggingEnum,
	StatusEnum
} from '$lib/model/enum/db-link';
import {
	PerioperativeSseEventTypeEnum,
	SurgicalCasePriorityEnum
} from '$lib/model/enum/perioperative.enum';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { getOrCreateHospitalPerioperativeSetting } from './hospital-perioperative-setting.server';
import { publishPerioperativeEvent } from './perioperative-event-bus.server';

async function auditCase(
	surgicalCaseId: number,
	action: string,
	staffId: string | null,
	detail?: Record<string, unknown>
) {
	await ensureDb().insert(table.surgicalCaseAuditTable).values({
		surgicalCaseId,
		action,
		staffId,
		detailJson: detail ?? null
	});
}

async function visitContext(hospitalId: string, visitId: string) {
	const [visit] = await ensureDb()
		.select({
			branchId: table.patientVisitTable.branchId,
			patientId: table.patientVisitTable.patientId
		})
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.id, visitId),
				eq(table.patientVisitTable.hospitalId, hospitalId)
			)
		)
		.limit(1);
	if (!visit) throw error(404, 'Visit not found');
	return visit;
}

export async function listSurgicalCases(input: {
	hospitalId: string;
	branchId?: string | null;
	date?: string;
	otRoomId?: number;
	statusTaggingId?: number;
}) {
	const conditions = [
		eq(table.surgicalCaseTable.hospitalId, input.hospitalId),
		ne(table.surgicalCaseTable.statusId, StatusEnum.DELETED)
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
	if (input.statusTaggingId) {
		conditions.push(
			eq(
				table.surgicalCaseTable.statusTaggingId,
				input.statusTaggingId
			)
		);
	}
	if (input.date) {
		const dayStart = `${input.date}T00:00:00.000Z`;
		const dayEnd = `${input.date}T23:59:59.999Z`;
		conditions.push(
			gte(table.surgicalCaseTable.scheduledStart, dayStart),
			lte(table.surgicalCaseTable.scheduledStart, dayEnd)
		);
	}

	const rows = await ensureDb()
		.select({
			case: table.surgicalCaseTable,
			otRoomName: table.otRoomTable.name,
			patientName: sql<string>`concat(${table.patientTable.firstName}, ' ', coalesce(${table.patientTable.lastName}, ''))`,
			visitNo: table.patientVisitTable.visitNo
		})
		.from(table.surgicalCaseTable)
		.leftJoin(
			table.otRoomTable,
			eq(table.surgicalCaseTable.otRoomId, table.otRoomTable.id)
		)
		.innerJoin(
			table.patientTable,
			eq(table.surgicalCaseTable.patientId, table.patientTable.id)
		)
		.innerJoin(
			table.patientVisitTable,
			eq(table.surgicalCaseTable.visitId, table.patientVisitTable.id)
		)
		.where(and(...conditions))
		.orderBy(table.surgicalCaseTable.scheduledStart);

	return rows.map((r) => ({
		...r.case,
		otRoomName: r.otRoomName,
		patientName: r.patientName?.trim() || null,
		visitNo: r.visitNo
	}));
}

export async function getSurgicalCaseById(input: {
	hospitalId: string;
	id: number;
}) {
	const [row] = await ensureDb()
		.select()
		.from(table.surgicalCaseTable)
		.where(
			and(
				eq(table.surgicalCaseTable.id, input.id),
				eq(table.surgicalCaseTable.hospitalId, input.hospitalId),
				ne(table.surgicalCaseTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!row) throw error(404, 'Surgical case not found');
	return row;
}

export async function createSurgicalCase(input: {
	hospitalId: string;
	visitId: string;
	procedureName: string;
	caseType?: string;
	priority?: string;
	serviceOrderDetailId?: number | null;
	staffId?: string | null;
}) {
	const visit = await visitContext(input.hospitalId, input.visitId);
	const [row] = await ensureDb()
		.insert(table.surgicalCaseTable)
		.values({
			hospitalId: input.hospitalId,
			branchId: visit.branchId,
			patientId: visit.patientId,
			visitId: input.visitId,
			procedureName: input.procedureName.trim(),
			caseType: input.caseType ?? 'general',
			priority: input.priority ?? SurgicalCasePriorityEnum.ELECTIVE,
			serviceOrderDetailId: input.serviceOrderDetailId ?? null,
			statusTaggingId: SurgicalCaseStatusTaggingEnum.REQUESTED
		})
		.returning();
	await auditCase(row!.id, 'created', input.staffId ?? null);
	publishPerioperativeEvent({
		type: PerioperativeSseEventTypeEnum.BOARD_REFRESH,
		hospitalId: input.hospitalId,
		data: { caseId: row!.id }
	});
	return row!;
}

export async function scheduleSurgicalCase(input: {
	hospitalId: string;
	caseId: number;
	otRoomId: number;
	scheduledStart: string;
	scheduledEnd: string;
	staffId?: string | null;
	bumpMode?: 'none' | 'add_on' | 'bump';
}) {
	const settings = await getOrCreateHospitalPerioperativeSetting(
		input.hospitalId
	);
	void settings;

	const existing = await getSurgicalCaseById({
		hospitalId: input.hospitalId,
		id: input.caseId
	});

	if (input.bumpMode === 'bump') {
		const conflicts = await ensureDb()
			.select()
			.from(table.surgicalCaseTable)
			.where(
				and(
					eq(table.surgicalCaseTable.hospitalId, input.hospitalId),
					eq(table.surgicalCaseTable.otRoomId, input.otRoomId),
					eq(
						table.surgicalCaseTable.statusTaggingId,
						SurgicalCaseStatusTaggingEnum.SCHEDULED
					),
					ne(table.surgicalCaseTable.id, input.caseId),
					lte(
						table.surgicalCaseTable.scheduledStart,
						input.scheduledEnd
					),
					gte(
						table.surgicalCaseTable.scheduledEnd,
						input.scheduledStart
					)
				)
			);
		for (const c of conflicts) {
			if (c.priority === SurgicalCasePriorityEnum.ELECTIVE) {
				await ensureDb()
					.update(table.surgicalCaseTable)
					.set({
						statusTaggingId:
							SurgicalCaseStatusTaggingEnum.PENDING_RESCHEDULE,
						displacedByCaseId: input.caseId,
						scheduledStart: null,
						scheduledEnd: null,
						otRoomId: null
					})
					.where(eq(table.surgicalCaseTable.id, c.id));
				await auditCase(c.id, 'bumped', input.staffId ?? null, {
					byCaseId: input.caseId
				});
				publishPerioperativeEvent({
					type: PerioperativeSseEventTypeEnum.CASE_BUMPED,
					hospitalId: input.hospitalId,
					data: { caseId: c.id, displacedBy: input.caseId }
				});
			}
		}
	}

	const [row] = await ensureDb()
		.update(table.surgicalCaseTable)
		.set({
			otRoomId: input.otRoomId,
			scheduledStart: input.scheduledStart,
			scheduledEnd: input.scheduledEnd,
			statusTaggingId: SurgicalCaseStatusTaggingEnum.SCHEDULED
		})
		.where(
			and(
				eq(table.surgicalCaseTable.id, input.caseId),
				eq(table.surgicalCaseTable.hospitalId, input.hospitalId)
			)
		)
		.returning();

	await auditCase(input.caseId, 'scheduled', input.staffId ?? null, {
		otRoomId: input.otRoomId,
		scheduledStart: input.scheduledStart
	});
	publishPerioperativeEvent({
		type: PerioperativeSseEventTypeEnum.CASE_SCHEDULED,
		hospitalId: input.hospitalId,
		data: { caseId: input.caseId }
	});
	return row!;
}

export async function markPreOpComplete(input: {
	hospitalId: string;
	caseId: number;
	staffId?: string | null;
}) {
	const [row] = await ensureDb()
		.update(table.surgicalCaseTable)
		.set({
			preOpCompleteAt: new Date().toISOString(),
			statusTaggingId: SurgicalCaseStatusTaggingEnum.PRE_OP_COMPLETE
		})
		.where(
			and(
				eq(table.surgicalCaseTable.id, input.caseId),
				eq(table.surgicalCaseTable.hospitalId, input.hospitalId)
			)
		)
		.returning();
	if (!row) throw error(404, 'Case not found');
	await auditCase(input.caseId, 'pre_op_complete', input.staffId ?? null);
	publishPerioperativeEvent({
		type: PerioperativeSseEventTypeEnum.CASE_STATUS,
		hospitalId: input.hospitalId,
		data: { caseId: input.caseId, status: 'pre_op_complete' }
	});
	return row;
}

export async function updateCaseStatus(input: {
	hospitalId: string;
	caseId: number;
	statusTaggingId: number;
	staffId?: string | null;
	actualStart?: string | null;
	actualEnd?: string | null;
}) {
	const settings = await getOrCreateHospitalPerioperativeSetting(
		input.hospitalId
	);
	if (
		settings.preOpMandatory &&
		input.statusTaggingId === SurgicalCaseStatusTaggingEnum.IN_OR
	) {
		const current = await getSurgicalCaseById({
			hospitalId: input.hospitalId,
			id: input.caseId
		});
		if (!current.preOpCompleteAt) {
			throw error(
				400,
				'Pre-operative assessment must be complete before entering OR'
			);
		}
	}

	const patch: Record<string, unknown> = {
		statusTaggingId: input.statusTaggingId
	};
	if (input.actualStart != null) patch.actualStart = input.actualStart;
	if (input.actualEnd != null) patch.actualEnd = input.actualEnd;

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
	if (!row) throw error(404, 'Case not found');
	await auditCase(input.caseId, 'status_change', input.staffId ?? null, {
		statusTaggingId: input.statusTaggingId
	});
	publishPerioperativeEvent({
		type: PerioperativeSseEventTypeEnum.CASE_STATUS,
		hospitalId: input.hospitalId,
		data: { caseId: input.caseId, statusTaggingId: input.statusTaggingId }
	});
	return row;
}

export async function listCaseAudit(input: {
	hospitalId: string;
	caseId: number;
}) {
	await getSurgicalCaseById(input);
	return ensureDb()
		.select()
		.from(table.surgicalCaseAuditTable)
		.where(eq(table.surgicalCaseAuditTable.surgicalCaseId, input.caseId))
		.orderBy(desc(table.surgicalCaseAuditTable.createdAt));
}

export async function addCaseImplant(input: {
	hospitalId: string;
	caseId: number;
	itemBatchId?: number | null;
	udiRaw?: string | null;
	quantity?: string;
}) {
	await getSurgicalCaseById({
		hospitalId: input.hospitalId,
		id: input.caseId
	});
	const [row] = await ensureDb()
		.insert(table.surgicalCaseImplantTable)
		.values({
			hospitalId: input.hospitalId,
			surgicalCaseId: input.caseId,
			itemBatchId: input.itemBatchId ?? null,
			udiRaw: input.udiRaw?.trim() || null,
			quantity: input.quantity ?? '1'
		})
		.returning();
	return row!;
}

export async function listCaseImplants(input: {
	hospitalId: string;
	caseId: number;
}) {
	await getSurgicalCaseById(input);
	return ensureDb()
		.select({
			implant: table.surgicalCaseImplantTable,
			batchNo: table.itemBatchTable.batchNo,
			udiDi: table.itemBatchTable.udiDi,
			serialNo: table.itemBatchTable.serialNo
		})
		.from(table.surgicalCaseImplantTable)
		.leftJoin(
			table.itemBatchTable,
			eq(
				table.surgicalCaseImplantTable.itemBatchId,
				table.itemBatchTable.id
			)
		)
		.where(
			and(
				eq(
					table.surgicalCaseImplantTable.surgicalCaseId,
					input.caseId
				),
				eq(
					table.surgicalCaseImplantTable.hospitalId,
					input.hospitalId
				)
			)
		);
}
