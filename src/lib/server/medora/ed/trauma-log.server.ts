import { error } from '@sveltejs/kit';
import {
	and,
	desc,
	eq,
	gte,
	ilike,
	isNotNull,
	isNull,
	lt,
	or,
	sql
} from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	TraumaActivationDetailPayload,
	TraumaActivationRichRow,
	TraumaVisitContextRow
} from '$lib/model/type/medora/trauma-log.type';
import {
	activateTrauma,
	deactivateTrauma
} from '$lib/server/medora/ed/ed-workbench.server';
import {
	ensureTraumaMastersForHospital,
	getTraumaLevelByCode,
	listActiveMilestoneTemplates,
	listActiveTeamRoles
} from '$lib/server/medora/ed/trauma-activation-setup.server';
import { toUtcIsoString } from '$lib/util/utc-instant.util';

async function erBedLabel(
	hospitalId: string,
	erBedId: number | null
): Promise<string | null> {
	if (erBedId == null) return null;
	const [row] = await ensureDb()
		.select({
			wardCode: table.wardTable.code,
			wardName: table.wardTable.name,
			roomCode: table.roomTable.code,
			roomName: table.roomTable.name,
			bedCode: table.bedTable.code,
			bedName: table.bedTable.name
		})
		.from(table.bedTable)
		.innerJoin(table.roomTable, eq(table.bedTable.roomId, table.roomTable.id))
		.innerJoin(table.wardTable, eq(table.roomTable.wardId, table.wardTable.id))
		.where(
			and(
				eq(table.bedTable.id, erBedId),
				eq(table.bedTable.hospitalId, hospitalId),
				eq(table.bedTable.isEr, true)
			)
		)
		.limit(1);
	if (!row) return null;
	const ward = row.wardCode?.trim() || row.wardName?.trim() || '';
	const room = row.roomCode?.trim() || row.roomName?.trim() || '';
	const bed = row.bedCode?.trim() || row.bedName?.trim() || '';
	return [ward, room, bed].filter(Boolean).join(' / ') || null;
}

async function mapRichRow(input: {
	hospitalId: string;
	activation: typeof table.traumaActivationTable.$inferSelect;
	visitNo: string | null;
	patientName: string | null;
	chiefComplaint: string | null;
	erBedId: number | null;
	levelName: string | null;
	levelColor: string | null;
	activatedByName: string | null;
}): Promise<TraumaActivationRichRow> {
	return {
		id: input.activation.id,
		visitId: input.activation.visitId,
		levelCode: input.activation.levelCode,
		activationLevelId: input.activation.activationLevelId,
		levelName: input.levelName,
		levelColor: input.levelColor,
		activatedAt: input.activation.activatedAt,
		deactivatedAt: input.activation.deactivatedAt,
		deactivateReason: input.activation.deactivateReason,
		patientName: input.patientName,
		visitNo: input.visitNo,
		chiefComplaint: input.chiefComplaint,
		erBedLabel: await erBedLabel(input.hospitalId, input.erBedId),
		activatedByName: input.activatedByName
	};
}

async function selectActivationBase(hospitalId: string, activeOnly: boolean) {
	const conditions = [
		eq(table.traumaActivationTable.hospitalId, hospitalId),
		eq(table.traumaActivationTable.statusId, StatusEnum.ACTIVE)
	];
	if (activeOnly) {
		conditions.push(isNull(table.traumaActivationTable.deactivatedAt));
	} else {
		conditions.push(isNotNull(table.traumaActivationTable.deactivatedAt));
	}
	return ensureDb()
		.select({
			activation: table.traumaActivationTable,
			visitNo: table.patientVisitTable.visitNo,
			chiefComplaint: table.patientVisitTable.chiefComplaint,
			patientName: sql<string>`trim(concat(${table.patientTable.firstName}, ' ', coalesce(${table.patientTable.lastName}, '')))`,
			erBedId: table.edEncounterTable.erBedId,
			levelName: table.hospitalTraumaActivationLevelTable.name,
			levelColor: table.hospitalTraumaActivationLevelTable.color,
			activatedByName: sql<string>`trim(concat(${table.staffTable.firstName}, ' ', coalesce(${table.staffTable.lastName}, '')))`
		})
		.from(table.traumaActivationTable)
		.innerJoin(
			table.patientVisitTable,
			eq(table.traumaActivationTable.visitId, table.patientVisitTable.id)
		)
		.innerJoin(
			table.patientTable,
			eq(table.patientVisitTable.patientId, table.patientTable.id)
		)
		.leftJoin(
			table.edEncounterTable,
			eq(table.edEncounterTable.visitId, table.traumaActivationTable.visitId)
		)
		.leftJoin(
			table.hospitalTraumaActivationLevelTable,
			eq(
				table.traumaActivationTable.activationLevelId,
				table.hospitalTraumaActivationLevelTable.id
			)
		)
		.leftJoin(
			table.staffTable,
			eq(table.traumaActivationTable.activatedBy, table.staffTable.id)
		)
		.where(and(...conditions))
		.orderBy(desc(table.traumaActivationTable.activatedAt));
}

export async function listActiveTraumaRich(input: {
	hospitalId: string;
	limit?: number;
}): Promise<TraumaActivationRichRow[]> {
	await ensureTraumaMastersForHospital(input.hospitalId);
	const rows = await selectActivationBase(input.hospitalId, true).limit(
		input.limit ?? 50
	);
	return Promise.all(
		rows.map((r) =>
			mapRichRow({
				hospitalId: input.hospitalId,
				activation: r.activation,
				visitNo: r.visitNo,
				patientName: r.patientName?.trim() || null,
				chiefComplaint: r.chiefComplaint,
				erBedId: r.erBedId,
				levelName: r.levelName,
				levelColor: r.levelColor,
				activatedByName: r.activatedByName?.trim() || null
			})
		)
	);
}

export async function listTraumaHistory(input: {
	hospitalId: string;
	dateFrom?: string;
	dateTo?: string;
	levelCode?: string;
	page?: number;
	pageSize?: number;
}): Promise<{ rows: TraumaActivationRichRow[]; total: number }> {
	const page = Math.max(1, input.page ?? 1);
	const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));
	const offset = (page - 1) * pageSize;

	const conditions = [
		eq(table.traumaActivationTable.hospitalId, input.hospitalId),
		eq(table.traumaActivationTable.statusId, StatusEnum.ACTIVE),
		isNotNull(table.traumaActivationTable.deactivatedAt)
	];
	if (input.levelCode?.trim()) {
		conditions.push(
			eq(table.traumaActivationTable.levelCode, input.levelCode.trim())
		);
	}
	if (input.dateFrom) {
		conditions.push(
			gte(table.traumaActivationTable.activatedAt, `${input.dateFrom}T00:00:00.000Z`)
		);
	}
	if (input.dateTo) {
		conditions.push(
			lt(
				table.traumaActivationTable.activatedAt,
				`${input.dateTo}T23:59:59.999Z`
			)
		);
	}

	const base = ensureDb()
		.select({
			activation: table.traumaActivationTable,
			visitNo: table.patientVisitTable.visitNo,
			chiefComplaint: table.patientVisitTable.chiefComplaint,
			patientName: sql<string>`trim(concat(${table.patientTable.firstName}, ' ', coalesce(${table.patientTable.lastName}, '')))`,
			erBedId: table.edEncounterTable.erBedId,
			levelName: table.hospitalTraumaActivationLevelTable.name,
			levelColor: table.hospitalTraumaActivationLevelTable.color,
			activatedByName: sql<string>`trim(concat(${table.staffTable.firstName}, ' ', coalesce(${table.staffTable.lastName}, '')))`
		})
		.from(table.traumaActivationTable)
		.innerJoin(
			table.patientVisitTable,
			eq(table.traumaActivationTable.visitId, table.patientVisitTable.id)
		)
		.innerJoin(
			table.patientTable,
			eq(table.patientVisitTable.patientId, table.patientTable.id)
		)
		.leftJoin(
			table.edEncounterTable,
			eq(table.edEncounterTable.visitId, table.traumaActivationTable.visitId)
		)
		.leftJoin(
			table.hospitalTraumaActivationLevelTable,
			eq(
				table.traumaActivationTable.activationLevelId,
				table.hospitalTraumaActivationLevelTable.id
			)
		)
		.leftJoin(
			table.staffTable,
			eq(table.traumaActivationTable.activatedBy, table.staffTable.id)
		)
		.where(and(...conditions))
		.orderBy(desc(table.traumaActivationTable.deactivatedAt));

	const [rows, countRow] = await Promise.all([
		base.limit(pageSize).offset(offset),
		ensureDb()
			.select({ n: sql<number>`count(*)::int` })
			.from(table.traumaActivationTable)
			.where(and(...conditions))
	]);

	const mapped = await Promise.all(
		rows.map((r) =>
			mapRichRow({
				hospitalId: input.hospitalId,
				activation: r.activation,
				visitNo: r.visitNo,
				patientName: r.patientName?.trim() || null,
				chiefComplaint: r.chiefComplaint,
				erBedId: r.erBedId,
				levelName: r.levelName,
				levelColor: r.levelColor,
				activatedByName: r.activatedByName?.trim() || null
			})
		)
	);
	return { rows: mapped, total: countRow[0]?.n ?? 0 };
}

async function seedMilestoneAndAckRows(
	traumaActivationId: number,
	hospitalId: string
): Promise<void> {
	const [milestones, roles] = await Promise.all([
		listActiveMilestoneTemplates({ hospitalId }),
		listActiveTeamRoles({ hospitalId })
	]);
	if (milestones.length > 0) {
		await ensureDb()
			.insert(table.traumaActivationMilestoneTable)
			.values(
				milestones.map((m) => ({
					traumaActivationId,
					milestoneTemplateId: m.id
				}))
			)
			.onConflictDoNothing();
	}
	if (roles.length > 0) {
		await ensureDb()
			.insert(table.traumaActivationTeamAckTable)
			.values(
				roles.map((r) => ({
					traumaActivationId,
					teamRoleId: r.id
				}))
			)
			.onConflictDoNothing();
	}
}

export async function activateTraumaForVisit(input: {
	hospitalId: string;
	visitId: string;
	levelCode: string;
	staffId: string;
	valuesJson: Record<string, unknown>;
	erBedId?: number;
}): Promise<TraumaActivationRichRow> {
	await ensureTraumaMastersForHospital(input.hospitalId);
	const level = await getTraumaLevelByCode({
		hospitalId: input.hospitalId,
		code: input.levelCode
	});
	if (!level || level.statusId !== StatusEnum.ACTIVE) {
		throw error(400, 'Invalid trauma activation level');
	}

	const mechanism = String(input.valuesJson.mechanism ?? '').trim();
	if (!mechanism) {
		throw error(400, 'Mechanism of injury is required');
	}

	const existing = await ensureDb()
		.select({ id: table.traumaActivationTable.id })
		.from(table.traumaActivationTable)
		.where(
			and(
				eq(table.traumaActivationTable.hospitalId, input.hospitalId),
				eq(table.traumaActivationTable.visitId, input.visitId),
				isNull(table.traumaActivationTable.deactivatedAt),
				eq(table.traumaActivationTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.limit(1);
	if (existing[0]) {
		throw error(409, 'Trauma activation already active for this visit');
	}

	const payload = {
		...input.valuesJson,
		...(input.erBedId != null ? { er_bed_id: input.erBedId } : {})
	};

	const row = await activateTrauma({
		hospitalId: input.hospitalId,
		visitId: input.visitId,
		levelCode: level.code,
		staffId: input.staffId,
		valuesJson: payload,
		activationLevelId: level.id
	});

	await seedMilestoneAndAckRows(row.id, input.hospitalId);

	const detail = await getTraumaActivationDetail({
		hospitalId: input.hospitalId,
		id: row.id
	});
	return detail.activation;
}

export async function deactivateTraumaWithReason(input: {
	hospitalId: string;
	id: number;
	reason: string;
}): Promise<void> {
	const reason = input.reason.trim();
	if (!reason) throw error(400, 'Stand-down reason is required');
	await deactivateTrauma({
		hospitalId: input.hospitalId,
		id: input.id,
		deactivateReason: reason
	});
}

export async function getTraumaActivationDetail(input: {
	hospitalId: string;
	id: number;
}): Promise<TraumaActivationDetailPayload> {
	const [base] = await ensureDb()
		.select({
			activation: table.traumaActivationTable,
			visitNo: table.patientVisitTable.visitNo,
			chiefComplaint: table.patientVisitTable.chiefComplaint,
			patientName: sql<string>`trim(concat(${table.patientTable.firstName}, ' ', coalesce(${table.patientTable.lastName}, '')))`,
			erBedId: table.edEncounterTable.erBedId,
			levelName: table.hospitalTraumaActivationLevelTable.name,
			levelColor: table.hospitalTraumaActivationLevelTable.color,
			activatedByName: sql<string>`trim(concat(${table.staffTable.firstName}, ' ', coalesce(${table.staffTable.lastName}, '')))`
		})
		.from(table.traumaActivationTable)
		.innerJoin(
			table.patientVisitTable,
			eq(table.traumaActivationTable.visitId, table.patientVisitTable.id)
		)
		.innerJoin(
			table.patientTable,
			eq(table.patientVisitTable.patientId, table.patientTable.id)
		)
		.leftJoin(
			table.edEncounterTable,
			eq(table.edEncounterTable.visitId, table.traumaActivationTable.visitId)
		)
		.leftJoin(
			table.hospitalTraumaActivationLevelTable,
			eq(
				table.traumaActivationTable.activationLevelId,
				table.hospitalTraumaActivationLevelTable.id
			)
		)
		.leftJoin(
			table.staffTable,
			eq(table.traumaActivationTable.activatedBy, table.staffTable.id)
		)
		.where(
			and(
				eq(table.traumaActivationTable.id, input.id),
				eq(table.traumaActivationTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!base) throw error(404, 'Activation not found');

	const activation = await mapRichRow({
		hospitalId: input.hospitalId,
		activation: base.activation,
		visitNo: base.visitNo,
		patientName: base.patientName?.trim() || null,
		chiefComplaint: base.chiefComplaint,
		erBedId: base.erBedId,
		levelName: base.levelName,
		levelColor: base.levelColor,
		activatedByName: base.activatedByName?.trim() || null
	});

	const milestones = await ensureDb()
		.select({
			templateId: table.hospitalTraumaMilestoneTemplateTable.id,
			code: table.hospitalTraumaMilestoneTemplateTable.code,
			label: table.hospitalTraumaMilestoneTemplateTable.label,
			sortOrder: table.hospitalTraumaMilestoneTemplateTable.sortOrder,
			completedAt: table.traumaActivationMilestoneTable.completedAt,
			completedByName: sql<string>`trim(concat(${table.staffTable.firstName}, ' ', coalesce(${table.staffTable.lastName}, '')))`
		})
		.from(table.traumaActivationMilestoneTable)
		.innerJoin(
			table.hospitalTraumaMilestoneTemplateTable,
			eq(
				table.traumaActivationMilestoneTable.milestoneTemplateId,
				table.hospitalTraumaMilestoneTemplateTable.id
			)
		)
		.leftJoin(
			table.staffTable,
			eq(table.traumaActivationMilestoneTable.completedBy, table.staffTable.id)
		)
		.where(
			eq(table.traumaActivationMilestoneTable.traumaActivationId, input.id)
		)
		.orderBy(table.hospitalTraumaMilestoneTemplateTable.sortOrder);

	const teamAcks = await ensureDb()
		.select({
			roleId: table.hospitalTraumaTeamRoleTable.id,
			code: table.hospitalTraumaTeamRoleTable.code,
			label: table.hospitalTraumaTeamRoleTable.label,
			sortOrder: table.hospitalTraumaTeamRoleTable.sortOrder,
			notified: table.traumaActivationTeamAckTable.notified,
			acknowledgedAt: table.traumaActivationTeamAckTable.acknowledgedAt,
			staffId: table.traumaActivationTeamAckTable.staffId
		})
		.from(table.traumaActivationTeamAckTable)
		.innerJoin(
			table.hospitalTraumaTeamRoleTable,
			eq(
				table.traumaActivationTeamAckTable.teamRoleId,
				table.hospitalTraumaTeamRoleTable.id
			)
		)
		.where(eq(table.traumaActivationTeamAckTable.traumaActivationId, input.id))
		.orderBy(table.hospitalTraumaTeamRoleTable.sortOrder);

	let formValues: Record<string, unknown> | null = null;
	if (base.activation.formInstanceId != null) {
		const [inst] = await ensureDb()
			.select({ valuesJson: table.clinicalFormInstanceTable.valuesJson })
			.from(table.clinicalFormInstanceTable)
			.where(eq(table.clinicalFormInstanceTable.id, base.activation.formInstanceId))
			.limit(1);
		if (inst?.valuesJson && typeof inst.valuesJson === 'object') {
			formValues = inst.valuesJson as Record<string, unknown>;
		}
	}

	return {
		activation,
		milestones: milestones.map((m) => ({
			templateId: m.templateId,
			code: m.code,
			label: m.label,
			sortOrder: m.sortOrder,
			completedAt: m.completedAt,
			completedByName: m.completedByName?.trim() || null
		})),
		teamAcks,
		formValues
	};
}

export async function completeTraumaMilestone(input: {
	hospitalId: string;
	activationId: number;
	templateId: number;
	staffId: string;
}): Promise<void> {
	const [row] = await ensureDb()
		.select({ id: table.traumaActivationTable.id })
		.from(table.traumaActivationTable)
		.where(
			and(
				eq(table.traumaActivationTable.id, input.activationId),
				eq(table.traumaActivationTable.hospitalId, input.hospitalId),
				isNull(table.traumaActivationTable.deactivatedAt)
			)
		)
		.limit(1);
	if (!row) throw error(404, 'Active activation not found');

	await ensureDb()
		.update(table.traumaActivationMilestoneTable)
		.set({
			completedAt: toUtcIsoString(),
			completedBy: input.staffId
		})
		.where(
			and(
				eq(
					table.traumaActivationMilestoneTable.traumaActivationId,
					input.activationId
				),
				eq(
					table.traumaActivationMilestoneTable.milestoneTemplateId,
					input.templateId
				)
			)
		);
}

export async function ackTraumaTeamRole(input: {
	hospitalId: string;
	activationId: number;
	roleId: number;
	staffId: string;
	notified: boolean;
}): Promise<void> {
	const [row] = await ensureDb()
		.select({ id: table.traumaActivationTable.id })
		.from(table.traumaActivationTable)
		.where(
			and(
				eq(table.traumaActivationTable.id, input.activationId),
				eq(table.traumaActivationTable.hospitalId, input.hospitalId),
				isNull(table.traumaActivationTable.deactivatedAt)
			)
		)
		.limit(1);
	if (!row) throw error(404, 'Active activation not found');

	await ensureDb()
		.update(table.traumaActivationTeamAckTable)
		.set({
			notified: input.notified,
			acknowledgedAt: toUtcIsoString(),
			staffId: input.staffId
		})
		.where(
			and(
				eq(
					table.traumaActivationTeamAckTable.traumaActivationId,
					input.activationId
				),
				eq(table.traumaActivationTeamAckTable.teamRoleId, input.roleId)
			)
		);
}

export async function getTraumaVisitContext(input: {
	hospitalId: string;
	visitId: string;
}): Promise<TraumaVisitContextRow> {
	const [row] = await ensureDb()
		.select({
			visitId: table.patientVisitTable.id,
			visitNo: table.patientVisitTable.visitNo,
			chiefComplaint: table.patientVisitTable.chiefComplaint,
			patientCode: table.patientTable.code,
			patientName: sql<string>`trim(concat(${table.patientTable.firstName}, ' ', coalesce(${table.patientTable.lastName}, '')))`
		})
		.from(table.patientVisitTable)
		.innerJoin(
			table.patientTable,
			eq(table.patientVisitTable.patientId, table.patientTable.id)
		)
		.where(
			and(
				eq(table.patientVisitTable.id, input.visitId),
				eq(table.patientVisitTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!row) throw error(404, 'Visit not found');

	const [active] = await ensureDb()
		.select({ id: table.traumaActivationTable.id })
		.from(table.traumaActivationTable)
		.where(
			and(
				eq(table.traumaActivationTable.visitId, input.visitId),
				eq(table.traumaActivationTable.hospitalId, input.hospitalId),
				isNull(table.traumaActivationTable.deactivatedAt),
				eq(table.traumaActivationTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.limit(1);

	return {
		visitId: row.visitId,
		visitNo: row.visitNo,
		patientName: row.patientName?.trim() || null,
		patientCode: row.patientCode,
		chiefComplaint: row.chiefComplaint,
		activeActivationId: active?.id ?? null
	};
}

export async function searchTraumaVisits(input: {
	hospitalId: string;
	q: string;
	limit?: number;
}): Promise<TraumaVisitContextRow[]> {
	const term = input.q.trim();
	if (term.length < 2) return [];
	const pattern = `%${term}%`;
	const rows = await ensureDb()
		.select({
			visitId: table.patientVisitTable.id,
			visitNo: table.patientVisitTable.visitNo,
			chiefComplaint: table.patientVisitTable.chiefComplaint,
			patientCode: table.patientTable.code,
			patientName: sql<string>`trim(concat(${table.patientTable.firstName}, ' ', coalesce(${table.patientTable.lastName}, '')))`
		})
		.from(table.patientVisitTable)
		.innerJoin(
			table.patientTable,
			eq(table.patientVisitTable.patientId, table.patientTable.id)
		)
		.where(
			and(
				eq(table.patientVisitTable.hospitalId, input.hospitalId),
				eq(table.patientVisitTable.statusId, StatusEnum.ACTIVE),
				or(
					ilike(table.patientVisitTable.visitNo, pattern),
					ilike(table.patientTable.code, pattern),
					ilike(table.patientTable.firstName, pattern),
					ilike(table.patientTable.lastName, pattern)
				)
			)
		)
		.limit(input.limit ?? 15);

	const out: TraumaVisitContextRow[] = [];
	for (const row of rows) {
		const ctx = await getTraumaVisitContext({
			hospitalId: input.hospitalId,
			visitId: row.visitId
		});
		out.push(ctx);
	}
	return out;
}