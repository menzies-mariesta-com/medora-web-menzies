import { error } from '@sveltejs/kit';
import { and, eq, sql } from 'drizzle-orm';
import { ApiErrorCodeEnum } from '$lib/model/enum/api-error.enum';
import {
	ClinicalFormInstanceStatusTaggingEnum,
	StatusEnum
} from '$lib/model/enum/db-link';
import {
	EdBoardColumnEnum,
	PerioperativeSseEventTypeEnum
} from '$lib/model/enum/perioperative.enum';
import type { EdTriageVitals } from '$lib/model/type/medora/ed-workbench.type';
import { edBoardColumnRequiresErBed } from '$lib/model/const/ed-board-column.const';
import {
	hasTriageVitals,
	planEdTriageSave,
	resolveEdTriageOutcome,
	triageVitalColumns
} from '$lib/tool/ed/ed-triage.util';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { saveFormInstance } from '$lib/server/medora/clinical-form/clinical-form.server';
import { insertPatientVital } from '$lib/server/medora/emr/patient-vital.server';
import { getEdTriageLevelIdByLevel } from '$lib/server/medora/er/ed-triage-level.server';
import { getOrCreateHospitalPerioperativeSetting } from '$lib/server/medora/perioperative/hospital-perioperative-setting.server';
import { publishPerioperativeEvent } from '$lib/server/medora/perioperative/perioperative-event-bus.server';
import { assertEdVisitForHospital } from '$lib/server/medora/ed/ed-visit.server';
import { ensureEdEncounter } from '$lib/server/medora/ed/ed-workbench.server';
import {
	assignErBedToEncounter,
	throwErBedRequired
} from '$lib/server/medora/ed/er-bed-assignment.server';

/** Triage vitals land in patient_diagnosis, where the rest of the app reads them. */
async function writeTriageVitals(input: {
	hospitalId: string;
	visitId: string;
	patientId: string;
	vitals: EdTriageVitals;
	userId: string | null;
}) {
	await insertPatientVital({
		hospitalId: input.hospitalId,
		visitId: input.visitId,
		patientId: input.patientId,
		statusId: StatusEnum.ACTIVE,
		height: null,
		heightUnitId: null,
		weight: null,
		weightUnitId: null,
		...triageVitalColumns(input.vitals),
		bpUnitId: null,
		pulseUnitId: null,
		temperatureUnitId: null,
		spO2UnitId: null,
		respirationUnitId: null,
		rbs: null,
		rbsUnitId: null,
		bmi: null,
		symptom: null,
		description: null,
		remark: null,
		vitalDateTime: new Date().toISOString(),
		userId: input.userId
	});
}

async function isSignedTriageInstance(
	triageFormInstanceId: number | null
): Promise<boolean> {
	if (triageFormInstanceId == null) return false;
	const [row] = await ensureDb()
		.select({ signedAt: table.clinicalFormInstanceTable.signedAt })
		.from(table.clinicalFormInstanceTable)
		.where(
			and(
				eq(table.clinicalFormInstanceTable.id, triageFormInstanceId),
				eq(
					table.clinicalFormInstanceTable.statusTaggingId,
					ClinicalFormInstanceStatusTaggingEnum.COMPLETE
				)
			)
		)
		.limit(1);
	return row?.signedAt != null;
}

export type EdTriageAction = 'triage' | 'draft' | 'amend';

export async function saveEdTriage(input: {
	hospitalId: string;
	visitId: string;
	action: EdTriageAction;
	triageSystem?: string;
	templateCode: string;
	valuesJson: Record<string, unknown>;
	staffId?: string | null;
	userId?: string | null;
	triageSystemOverrideReason?: string | null;
	erBedId?: number;
	vitals?: EdTriageVitals;
}) {
	const visit = await assertEdVisitForHospital({
		hospitalId: input.hospitalId,
		visitId: input.visitId
	});
	const encounter = await ensureEdEncounter({
		hospitalId: input.hospitalId,
		visitId: input.visitId,
		publishEvent: false
	});
	const settings = await getOrCreateHospitalPerioperativeSetting(
		input.hospitalId
	);
	const system = (input.triageSystem?.trim() || 'esi').toLowerCase();

	const plan = planEdTriageSave({
		action: input.action,
		system,
		defaultSystem: (
			settings.defaultEdTriageSystem ?? 'esi'
		).toLowerCase(),
		overrideReason: input.triageSystemOverrideReason,
		alreadySigned:
			encounter.triagedAt != null ||
			(await isSignedTriageInstance(encounter.triageFormInstanceId))
	});
	if (!plan.ok) {
		throw error(plan.status, {
			code: plan.code,
			message: plan.message
		});
	}

	const outcome = plan.sign
		? resolveEdTriageOutcome({ system, values: input.valuesJson })
		: null;

	// The bed gate only bites for resus; the page opens the assign dialog and retries.
	if (
		outcome &&
		edBoardColumnRequiresErBed(outcome.boardColumn) &&
		!encounter.erBedId &&
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

	const instance = await saveFormInstance({
		id: encounter.triageFormInstanceId ?? undefined,
		hospitalId: input.hospitalId,
		visitId: input.visitId,
		templateCode: input.templateCode,
		contextType: 'triage',
		valuesJson: {
			...input.valuesJson,
			...(input.triageSystemOverrideReason?.trim()
				? {
						triage_system_override_reason:
							input.triageSystemOverrideReason.trim()
					}
				: {})
		},
		sign: plan.sign,
		draft: !plan.sign,
		staffId: input.staffId
	});

	await ensureDb()
		.update(table.edEncounterTable)
		.set({
			triageSystem: system,
			triageFormInstanceId: instance.id,
			...(outcome
				? {
						acuityLevel: outcome.acuityLevel,
						edTriageLevelId: await getEdTriageLevelIdByLevel({
							hospitalId: input.hospitalId,
							level: outcome.triageLevel
						}),
						fastTrack: outcome.fastTrack,
						boardColumn: outcome.boardColumn,
						triagedAt: new Date().toISOString(),
						triagedBy: input.staffId ?? null
					}
				: {})
		})
		.where(
			and(
				eq(table.edEncounterTable.visitId, input.visitId),
				eq(table.edEncounterTable.hospitalId, input.hospitalId)
			)
		);

	if (plan.sign && hasTriageVitals(input.vitals)) {
		await writeTriageVitals({
			hospitalId: input.hospitalId,
			visitId: input.visitId,
			patientId: visit.patientId,
			vitals: input.vitals ?? {},
			userId: input.userId ?? null
		});
	}

	publishPerioperativeEvent({
		type: PerioperativeSseEventTypeEnum.ED_BOARD,
		hospitalId: input.hospitalId,
		data: {
			visitId: input.visitId,
			triage: true,
			boardColumn: outcome?.boardColumn ?? encounter.boardColumn
		}
	});

	return instance;
}

/** Current triage panel state for the page (the queue reuses `listEdBoard`). */
export async function getEdTriageCurrent(input: {
	hospitalId: string;
	visitId: string;
}) {
	const [encounter] = await ensureDb()
		.select({
			boardColumn: table.edEncounterTable.boardColumn,
			triageSystem: table.edEncounterTable.triageSystem,
			acuityLevel: table.edEncounterTable.acuityLevel,
			triagedAt: table.edEncounterTable.triagedAt,
			arrivedAt: table.edEncounterTable.arrivedAt,
			triageFormInstanceId:
				table.edEncounterTable.triageFormInstanceId,
			triagedByName: sql<
				string | null
			>`nullif(trim(concat_ws(' ', ${table.staffTable.firstName}, ${table.staffTable.lastName})), '')`
		})
		.from(table.edEncounterTable)
		.leftJoin(
			table.staffTable,
			eq(table.edEncounterTable.triagedBy, table.staffTable.id)
		)
		.where(
			and(
				eq(table.edEncounterTable.hospitalId, input.hospitalId),
				eq(table.edEncounterTable.visitId, input.visitId)
			)
		)
		.limit(1);

	if (!encounter) {
		return {
			boardColumn: null,
			triageSystem: null,
			acuityLevel: null,
			triagedAt: null,
			triagedByName: null,
			arrivedAt: null,
			instanceId: null,
			signed: false,
			values: {} as Record<string, unknown>
		};
	}

	const instance =
		encounter.triageFormInstanceId != null
			? await ensureDb().query.clinicalFormInstanceTable.findFirst({
					where: (t, { eq }) =>
						eq(t.id, encounter.triageFormInstanceId!)
				})
			: undefined;

	return {
		boardColumn: encounter.boardColumn,
		triageSystem: encounter.triageSystem,
		acuityLevel: encounter.acuityLevel,
		triagedAt: encounter.triagedAt,
		triagedByName: encounter.triagedByName ?? null,
		arrivedAt: encounter.arrivedAt,
		instanceId: instance?.id ?? null,
		signed: instance?.signedAt != null,
		values: (instance?.valuesJson as Record<string, unknown>) ?? {}
	};
}

/** Queue columns for the triage workbench band. */
export const ED_TRIAGE_QUEUE_COLUMNS: readonly string[] = [
	EdBoardColumnEnum.WAITING_TRIAGE,
	EdBoardColumnEnum.TRIAGE
];
