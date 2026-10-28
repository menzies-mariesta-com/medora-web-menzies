import { and, desc, eq, isNull, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PatientPortalContext } from './require-patient-context.server';

const MAX_ROWS = 100;

function limitFor(value: number | undefined): number {
	return Math.min(Math.max(value ?? 50, 1), MAX_ROWS);
}

function text(value: string | null | undefined): string | null {
	return value?.trim() ? value : null;
}

/**
 * Longitudinal vitals for the signed-in patient. `patient_diagnosis` stores
 * both the vital measurements and the free-text symptom/remark for a visit.
 */
export async function listPatientVitals(
	ctx: PatientPortalContext,
	options?: { visitId?: string; limit?: number }
) {
	const limit = limitFor(options?.limit);
	const rows = await ensureDb().query.patientDiagnosisTable.findMany({
		where: and(
			eq(table.patientDiagnosisTable.patientId, ctx.patientId),
			eq(table.patientDiagnosisTable.hospitalId, ctx.hospitalId),
			ne(table.patientDiagnosisTable.statusId, StatusEnum.DELETED),
			options?.visitId
				? eq(table.patientDiagnosisTable.visitId, options.visitId)
				: undefined
		),
		orderBy: [desc(table.patientDiagnosisTable.createdAt)],
		limit,
		with: {
			visit: { columns: { id: true, visitNo: true } },
			heightUnit: { columns: { name: true } },
			weightUnit: { columns: { name: true } },
			bpUnit: { columns: { name: true } },
			pulseUnit: { columns: { name: true } },
			temperatureUnit: { columns: { name: true } },
			spO2Unit: { columns: { name: true } },
			respirationUnit: { columns: { name: true } },
			rbsUnit: { columns: { name: true } }
		}
	});

	return rows
		.map((row) => ({
			recordedAt: row.vitalDateTime ?? row.createdAt,
			visitId: row.visitId,
			visitNo: row.visit?.visitNo ?? null,
			height: row.height,
			heightUnit: row.heightUnit?.name ?? null,
			weight: row.weight,
			weightUnit: row.weightUnit?.name ?? null,
			bmi: row.bmi,
			bpSystolic: row.bpSystolic,
			bpDiastolic: row.bpDiastolic,
			bpUnit: row.bpUnit?.name ?? null,
			pulse: row.pulse,
			pulseUnit: row.pulseUnit?.name ?? null,
			temperature: row.temperature,
			temperatureUnit: row.temperatureUnit?.name ?? null,
			spO2: row.spO2,
			spO2Unit: row.spO2Unit?.name ?? null,
			respiration: row.respiration,
			respirationUnit: row.respirationUnit?.name ?? null,
			rbs: row.rbs,
			rbsUnit: row.rbsUnit?.name ?? null,
			symptom: text(row.symptom),
			remark: text(row.remark)
		}))
		.sort((a, b) =>
			String(b.recordedAt ?? '').localeCompare(
				String(a.recordedAt ?? '')
			)
		);
}

/** Active and historical allergy entries for the patient. */
export async function listPatientAllergies(
	ctx: PatientPortalContext,
	options?: { limit?: number }
) {
	const rows = await ensureDb().query.patientAllergyTable.findMany({
		where: and(
			eq(table.patientAllergyTable.patientId, ctx.patientId),
			ne(table.patientAllergyTable.statusId, StatusEnum.DELETED)
		),
		orderBy: [desc(table.patientAllergyTable.createdAt)],
		limit: limitFor(options?.limit),
		with: {
			allergy: { columns: { name: true } },
			severity: { columns: { name: true } },
			status: { columns: { name: true } },
			visit: { columns: { id: true, visitNo: true } }
		}
	});

	return rows
		.map((row) => ({
			id: row.id,
			name: text(row.allergy?.name),
			severity: text(row.severity?.name),
			reaction: text(row.reaction),
			remark: text(row.remark),
			status: text(row.status?.name),
			active: row.statusId === StatusEnum.ACTIVE,
			recordedAt: row.createdAt,
			visitNo: row.visit?.visitNo ?? null
		}))
		.sort((a, b) => Number(b.active) - Number(a.active));
}

/**
 * Medication order lines for the patient, optionally scoped to one visit.
 * Only lines that belong to this patient's visits in this hospital are
 * returned.
 */
export async function listPatientMedications(
	ctx: PatientPortalContext,
	options?: { visitId?: string; limit?: number }
) {
	const rows = await ensureDb()
		.select({
			lineId: table.medicationOrderLineTable.id,
			itemName: table.itemMasterTable.itemName,
			dose: table.medicationOrderLineTable.dose,
			doseUnitName: table.medOrderDoseUnitTable.name,
			frequencyName: table.medOrderFrequencyTable.label,
			duration: table.medicationOrderLineTable.durationValue,
			durationUnit: table.medOrderDurationUnitTable.name,
			route: table.medOrderRouteTable.name,
			form: table.medOrderFormTable.name,
			startAt: table.medicationOrderLineTable.startAt,
			instruction: table.medicationOrderLineTable.lineRemarks,
			advisingDoctor: table.medicationOrderBatchTable.advisingDoctor,
			visitId: table.medicationOrderBatchTable.visitId,
			visitNo: table.patientVisitTable.visitNo
		})
		.from(table.medicationOrderLineTable)
		.innerJoin(
			table.medicationOrderBatchTable,
			eq(
				table.medicationOrderLineTable.batchId,
				table.medicationOrderBatchTable.id
			)
		)
		.innerJoin(
			table.patientVisitTable,
			eq(
				table.medicationOrderBatchTable.visitId,
				table.patientVisitTable.id
			)
		)
		.innerJoin(
			table.itemMasterTable,
			eq(
				table.medicationOrderLineTable.itemMasterId,
				table.itemMasterTable.id
			)
		)
		.innerJoin(
			table.medOrderFrequencyTable,
			eq(
				table.medicationOrderLineTable.frequencyId,
				table.medOrderFrequencyTable.id
			)
		)
		.innerJoin(
			table.medOrderDoseUnitTable,
			eq(
				table.medicationOrderLineTable.doseUnitId,
				table.medOrderDoseUnitTable.id
			)
		)
		.leftJoin(
			table.medOrderDurationUnitTable,
			eq(
				table.medicationOrderLineTable.durationUnitId,
				table.medOrderDurationUnitTable.id
			)
		)
		.leftJoin(
			table.medOrderRouteTable,
			eq(
				table.medicationOrderLineTable.routeId,
				table.medOrderRouteTable.id
			)
		)
		.leftJoin(
			table.medOrderFormTable,
			eq(
				table.medicationOrderLineTable.formId,
				table.medOrderFormTable.id
			)
		)
		.where(
			and(
				eq(table.patientVisitTable.patientId, ctx.patientId),
				eq(
					table.medicationOrderBatchTable.hospitalId,
					ctx.hospitalId
				),
				ne(table.patientVisitTable.statusId, StatusEnum.DELETED),
				isNull(table.medicationOrderBatchTable.deletedAt),
				isNull(table.medicationOrderLineTable.deletedAt),
				options?.visitId
					? eq(
							table.medicationOrderBatchTable.visitId,
							options.visitId
						)
					: undefined
			)
		)
		.orderBy(desc(table.medicationOrderLineTable.startAt))
		.limit(limitFor(options?.limit));

	return rows.map((row) => ({
		lineId: row.lineId,
		itemName: text(row.itemName),
		dose: row.dose,
		doseUnitName: text(row.doseUnitName),
		frequencyName: text(row.frequencyName),
		duration: row.duration,
		durationUnit: text(row.durationUnit),
		route: text(row.route),
		form: text(row.form),
		startAt: row.startAt,
		instruction: text(row.instruction),
		advisingDoctor: text(row.advisingDoctor),
		visitId: row.visitId,
		visitNo: row.visitNo
	}));
}

/**
 * Latest diagnosis rows, de-duplicated by description + type so a chronic
 * condition does not repeat once for every visit.
 */
export async function listPatientConditions(
	ctx: PatientPortalContext,
	options?: { limit?: number }
) {
	const rows = await ensureDb()
		.select({
			description: table.diagnosisTable.description,
			code: table.diagnosisCodeTable.code,
			codeSystem: table.diagnosisCodeTable.system,
			typeName: table.diagnosisTypeTable.name,
			statusName: table.statusTable.name,
			statusId: table.diagnosisTable.statusId,
			diagnosedAt: table.diagnosisTable.createdAt,
			visitNo: table.patientVisitTable.visitNo
		})
		.from(table.diagnosisTable)
		.innerJoin(
			table.patientVisitTable,
			eq(table.diagnosisTable.visitId, table.patientVisitTable.id)
		)
		.leftJoin(
			table.diagnosisTypeTable,
			eq(
				table.diagnosisTable.diagnosisTypeId,
				table.diagnosisTypeTable.id
			)
		)
		.leftJoin(
			table.statusTable,
			eq(table.diagnosisTable.statusId, table.statusTable.id)
		)
		.leftJoin(
			table.diagnosisCodeTable,
			eq(
				table.diagnosisTable.diagnosisCodeId,
				table.diagnosisCodeTable.id
			)
		)
		.where(
			and(
				eq(table.diagnosisTable.patientId, ctx.patientId),
				eq(table.patientVisitTable.hospitalId, ctx.hospitalId),
				ne(table.diagnosisTable.statusId, StatusEnum.DELETED),
				ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
			)
		)
		.orderBy(desc(table.diagnosisTable.createdAt))
		.limit(limitFor(options?.limit));

	const seen = new Set<string>();
	const out: {
		description: string | null;
		code: string | null;
		codeSystem: string | null;
		typeName: string | null;
		statusName: string | null;
		active: boolean;
		diagnosedAt: string | null;
		visitNo: string | null;
	}[] = [];

	for (const row of rows) {
		const description = text(row.description);
		const key = `${description?.toLowerCase() ?? ''}|${row.typeName ?? ''}`;
		if (!description || seen.has(key)) continue;
		seen.add(key);
		out.push({
			description,
			code: text(row.code),
			codeSystem: text(row.codeSystem),
			typeName: text(row.typeName),
			statusName: text(row.statusName),
			active: row.statusId === StatusEnum.ACTIVE,
			diagnosedAt: row.diagnosedAt,
			visitNo: row.visitNo
		});
	}

	return out;
}
