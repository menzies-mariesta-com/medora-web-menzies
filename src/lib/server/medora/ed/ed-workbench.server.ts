import { error } from '@sveltejs/kit';
import { and, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import { StatusEnum, VisitTypeEnum } from '$lib/model/enum/db-link';
import {
	EdBoardColumnEnum,
	PerioperativeSseEventTypeEnum
} from '$lib/model/enum/perioperative.enum';
import { CareSettingEnum } from '$lib/model/enum/care-setting.enum';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { publishPerioperativeEvent } from '$lib/server/medora/perioperative/perioperative-event-bus.server';
import { saveFormInstance } from '$lib/server/medora/clinical-form/clinical-form.server';
import { edBoardColumnRequiresErBed } from '$lib/model/const/ed-board-column.const';
import {
	assignErBedToEncounter,
	assignErBedToEncounterWithCharges,
	releaseErBedOnEdDischarge,
	throwErBedRequired
} from '$lib/server/medora/ed/er-bed-assignment.server';

export async function ensureEdEncounter(input: {
	hospitalId: string;
	visitId: string;
	/** Callers that publish their own board event pass false to keep one event per request. */
	publishEvent?: boolean;
}) {
	const [visit] = await ensureDb()
		.select({
			id: table.patientVisitTable.id,
			visitTypeId: table.patientVisitTable.visitTypeId,
			hospitalId: table.patientVisitTable.hospitalId
		})
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.id, input.visitId),
				eq(table.patientVisitTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!visit) throw error(404, 'Visit not found');
	if (visit.visitTypeId !== VisitTypeEnum.ED) {
		throw error(400, 'Visit is not an ED visit');
	}

	const existing = await ensureDb().query.edEncounterTable.findFirst({
		where: (t, { eq }) => eq(t.visitId, input.visitId)
	});
	if (existing) return existing;

	const [row] = await ensureDb()
		.insert(table.edEncounterTable)
		.values({
			hospitalId: input.hospitalId,
			visitId: input.visitId,
			boardColumn: EdBoardColumnEnum.WAITING_TRIAGE
		})
		.returning();
	if (input.publishEvent !== false) {
		publishPerioperativeEvent({
			type: PerioperativeSseEventTypeEnum.ED_BOARD,
			hospitalId: input.hospitalId,
			data: { visitId: input.visitId }
		});
	}
	return row!;
}

export async function listEdBoard(input: { hospitalId: string }) {
	const rows = await ensureDb()
		.select({
			encounter: table.edEncounterTable,
			visitNo: table.patientVisitTable.visitNo,
			chiefComplaint: table.patientVisitTable.chiefComplaint,
			patientName: sql<string>`concat(${table.patientTable.firstName}, ' ', coalesce(${table.patientTable.lastName}, ''))`,
			erBedLabel: sql<string | null>`nullif(concat_ws(' / ',
				coalesce(nullif(trim(${table.wardTable.code}), ''), nullif(trim(${table.wardTable.name}), '')),
				coalesce(nullif(trim(${table.roomTable.code}), ''), nullif(trim(${table.roomTable.name}), '')),
				coalesce(nullif(trim(${table.bedTable.code}), ''), nullif(trim(${table.bedTable.name}), ''))
			), '')`
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
			table.bedTable,
			and(
				eq(table.bedTable.id, table.edEncounterTable.erBedId),
				eq(table.bedTable.hospitalId, input.hospitalId),
				eq(table.bedTable.careSetting, CareSettingEnum.ED)
			)
		)
		.leftJoin(table.roomTable, eq(table.bedTable.roomId, table.roomTable.id))
		.leftJoin(table.wardTable, eq(table.roomTable.wardId, table.wardTable.id))
		.where(
			and(
				eq(table.edEncounterTable.hospitalId, input.hospitalId),
				eq(table.edEncounterTable.statusId, StatusEnum.ACTIVE),
				ne(
					table.edEncounterTable.boardColumn,
					EdBoardColumnEnum.DISCHARGED
				)
			)
		)
		.orderBy(table.edEncounterTable.arrivedAt);

	const now = Date.now();
	return rows.map((r) => {
		const arrived = Date.parse(r.encounter.arrivedAt);
		const waitMinutes = Number.isFinite(arrived)
			? Math.max(0, Math.floor((now - arrived) / 60000))
			: 0;
		return {
			...r.encounter,
			visitNo: r.visitNo,
			chiefComplaint: r.chiefComplaint,
			patientName: r.patientName?.trim() || null,
			waitMinutes,
			erBedLabel: r.erBedLabel ?? null
		};
	});
}

export async function updateEdBoardColumn(input: {
	hospitalId: string;
	visitId: string;
	boardColumn: string;
	fastTrack?: boolean;
	assignedDoctorId?: string | null;
	erBedId?: number;
}) {
	await ensureEdEncounter({
		hospitalId: input.hospitalId,
		visitId: input.visitId
	});

	const existing = await ensureDb().query.edEncounterTable.findFirst({
		where: (t, { eq, and }) =>
			and(
				eq(t.visitId, input.visitId),
				eq(t.hospitalId, input.hospitalId)
			)
	});
	if (!existing) throw error(404, 'ED encounter not found');

	if (
		edBoardColumnRequiresErBed(input.boardColumn) &&
		!existing.erBedId &&
		typeof input.erBedId !== 'number'
	) {
		throwErBedRequired();
	}
	if (typeof input.erBedId === 'number') {
		await assignErBedToEncounter({
			hospitalId: input.hospitalId,
			visitId: input.visitId,
			erBedId: input.erBedId
		});
	}

	await releaseErBedOnEdDischarge({
		hospitalId: input.hospitalId,
		visitId: input.visitId,
		boardColumn: input.boardColumn
	});

	const [row] = await ensureDb()
		.update(table.edEncounterTable)
		.set({
			boardColumn: input.boardColumn,
			...(input.fastTrack != null ? { fastTrack: input.fastTrack } : {}),
			...(input.assignedDoctorId !== undefined
				? { assignedDoctorId: input.assignedDoctorId }
				: {})
		})
		.where(
			and(
				eq(table.edEncounterTable.visitId, input.visitId),
				eq(table.edEncounterTable.hospitalId, input.hospitalId)
			)
		)
		.returning();
	publishPerioperativeEvent({
		type: PerioperativeSseEventTypeEnum.ED_BOARD,
		hospitalId: input.hospitalId,
		data: { visitId: input.visitId, boardColumn: input.boardColumn }
	});
	return row!;
}

export async function assignEdErBed(input: {
	hospitalId: string;
	visitId: string;
	erBedId: number;
	userId?: string | null;
}) {
	const row = input.userId
		? await assignErBedToEncounterWithCharges({
				hospitalId: input.hospitalId,
				visitId: input.visitId,
				erBedId: input.erBedId,
				userId: input.userId
			})
		: await assignErBedToEncounter(input);
	publishPerioperativeEvent({
		type: PerioperativeSseEventTypeEnum.ED_BOARD,
		hospitalId: input.hospitalId,
		data: { visitId: input.visitId, erBedId: input.erBedId }
	});
	return row;
}

export async function activateTrauma(input: {
	hospitalId: string;
	visitId: string;
	levelCode: string;
	staffId: string;
	valuesJson?: Record<string, unknown>;
	activationLevelId?: number | null;
}) {
	await ensureEdEncounter({
		hospitalId: input.hospitalId,
		visitId: input.visitId
	});

	let formInstanceId: number | null = null;
	if (input.valuesJson) {
		const inst = await saveFormInstance({
			hospitalId: input.hospitalId,
			visitId: input.visitId,
			templateCode: 'trauma_activation_v1',
			contextType: 'trauma',
			valuesJson: input.valuesJson,
			sign: true,
			staffId: input.staffId
		});
		formInstanceId = inst.id;
	}

	const [row] = await ensureDb()
		.insert(table.traumaActivationTable)
		.values({
			hospitalId: input.hospitalId,
			visitId: input.visitId,
			levelCode: input.levelCode,
			activationLevelId: input.activationLevelId ?? null,
			formInstanceId,
			activatedBy: input.staffId
		})
		.returning();

	await updateEdBoardColumn({
		hospitalId: input.hospitalId,
		visitId: input.visitId,
		boardColumn: EdBoardColumnEnum.RESUS,
		erBedId:
			typeof input.valuesJson?.er_bed_id === 'number'
				? Number(input.valuesJson.er_bed_id)
				: undefined
	});

	publishPerioperativeEvent({
		type: PerioperativeSseEventTypeEnum.TRAUMA_ACTIVATED,
		hospitalId: input.hospitalId,
		data: { visitId: input.visitId, level: input.levelCode }
	});
	return row!;
}

export async function listTraumaActivations(input: {
	hospitalId: string;
	limit?: number;
}) {
	return ensureDb()
		.select()
		.from(table.traumaActivationTable)
		.where(
			and(
				eq(table.traumaActivationTable.hospitalId, input.hospitalId),
				eq(table.traumaActivationTable.statusId, StatusEnum.ACTIVE),
				isNull(table.traumaActivationTable.deactivatedAt)
			)
		)
		.orderBy(desc(table.traumaActivationTable.activatedAt))
		.limit(input.limit ?? 50);
}

export async function deactivateTrauma(input: {
	hospitalId: string;
	id: number;
	deactivateReason?: string | null;
}) {
	await ensureDb()
		.update(table.traumaActivationTable)
		.set({
			deactivatedAt: new Date().toISOString(),
			deactivateReason: input.deactivateReason?.trim() || null
		})
		.where(
			and(
				eq(table.traumaActivationTable.id, input.id),
				eq(table.traumaActivationTable.hospitalId, input.hospitalId)
			)
		);
}
