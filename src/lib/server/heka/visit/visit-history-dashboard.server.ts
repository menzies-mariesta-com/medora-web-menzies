import { error, type RequestEvent } from '@sveltejs/kit';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import { getCpoePrescriptionNoteRowsByVisitId } from '$lib/server/heka/consultation/cpoe-prescription-note.server';
import * as obs from '$lib/server/heka/observation/observation-emr.server';
import type {
	ServiceOrderDetailRowForVisit,
	VisitDashboardDiagnosisRow,
	VisitDashboardFormEntryRow,
	VisitDashboardMedicationLineRow,
	VisitDashboardPayload,
	VisitDashboardPrescriptionNoteRow
} from '$lib/model/type/visit-dashboard.type';

const emptyClinicalPayload = {
	chiefComplaintEntries: [] as VisitDashboardFormEntryRow[],
	patientConditionEntries: [] as VisitDashboardFormEntryRow[],
	visitDiagnoses: [] as VisitDashboardDiagnosisRow[],
	vitalSymptoms: [] as string[],
	prescriptionNotes: [] as VisitDashboardPrescriptionNoteRow[],
	medicationLines: [] as VisitDashboardMedicationLineRow[]
};

function activeOnly<T extends { statusId?: number | null }>(
	rows: T[]
): T[] {
	return rows.filter((row) => row.statusId === StatusEnum.ACTIVE);
}

function mapFormEntries(rows: unknown[]): VisitDashboardFormEntryRow[] {
	return activeOnly(rows as { statusId?: number | null }[]).map((row) => {
		const r = row as { id?: number; description?: string | null };
		return {
			id: Number(r.id ?? 0),
			description: r.description ?? null
		};
	});
}

function mapDiagnoses(rows: unknown[]): VisitDashboardDiagnosisRow[] {
	return activeOnly(rows as { statusId?: number | null }[]).map((row) => {
		const r = row as {
			id?: number;
			description?: string | null;
			diagnosisType?: { name?: string | null } | null;
		};
		return {
			id: Number(r.id ?? 0),
			description: r.description ?? null,
			diagnosisTypeName: r.diagnosisType?.name ?? null
		};
	});
}

function uniqueSymptomsFromVitals(rows: unknown[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const row of activeOnly(rows as { statusId?: number | null }[])) {
		const symptom = String(
			(row as { symptom?: string | null }).symptom ?? ''
		).trim();
		if (!symptom) continue;
		const key = symptom.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(symptom);
	}
	return out;
}

async function getMedicationLinesForVisit(
	visitId: number,
	hospitalId: string
): Promise<VisitDashboardMedicationLineRow[]> {
	const db = ensureDb();
	const b = table.medicationOrderBatchTable;
	const l = table.medicationOrderLineTable;
	const im = table.itemMasterTable;
	const du = table.medOrderDoseUnitTable;
	const fr = table.medOrderFrequencyTable;
	const dur = table.medOrderDurationUnitTable;
	const food = table.medOrderFoodRelationTable;

	const rows = await db
		.select({
			id: l.id,
			itemName: im.itemName,
			dose: l.dose,
			doseUnitName: du.name,
			frequencyLabel: fr.label,
			durationValue: l.durationValue,
			durationUnitName: dur.name,
			foodRelationName: food.name,
			lineRemarks: l.lineRemarks,
			batchNo: b.batchNo
		})
		.from(l)
		.innerJoin(b, eq(l.batchId, b.id))
		.innerJoin(im, eq(l.itemMasterId, im.id))
		.leftJoin(du, eq(l.doseUnitId, du.id))
		.leftJoin(fr, eq(l.frequencyId, fr.id))
		.leftJoin(dur, eq(l.durationUnitId, dur.id))
		.leftJoin(food, eq(l.foodRelationId, food.id))
		.where(
			and(
				eq(b.visitId, visitId),
				eq(b.hospitalId, hospitalId),
				isNull(b.deletedAt),
				isNull(l.deletedAt)
			)
		)
		.orderBy(desc(b.id), l.lineNo);

	return rows.map((row) => ({
		id: row.id,
		itemName: row.itemName ?? null,
		dose: row.dose != null ? String(row.dose) : null,
		doseUnitName: row.doseUnitName ?? null,
		frequencyLabel: row.frequencyLabel ?? null,
		durationValue:
			row.durationValue != null ? String(row.durationValue) : null,
		durationUnitName: row.durationUnitName ?? null,
		foodRelationName: row.foodRelationName ?? null,
		lineRemarks: row.lineRemarks ?? null,
		batchNo: row.batchNo ?? null
	}));
}

async function getSelectedVisitClinicalData(
	input: { hospitalId: string; visitId: number }
): Promise<typeof emptyClinicalPayload> {
	const [
		vitals,
		visitDiagnosesRaw,
		chiefComplaintRaw,
		patientConditionRaw,
		prescriptionNotesRaw,
		medicationLines
	] = await Promise.all([
		obs.getPatientVitalsByVisitId({ visitId: input.visitId }),
		obs.getDiagnosesByVisitId({ visitId: input.visitId }),
		obs
			.getPatientFormEntriesByVisitIdAndFormCode({
				visitId: input.visitId,
				formCode: 'chief_complaint'
			})
			.catch(() => []),
		obs
			.getPatientFormEntriesByVisitIdAndFormCode({
				visitId: input.visitId,
				formCode: 'patient_condition'
			})
			.catch(() => []),
		getCpoePrescriptionNoteRowsByVisitId({
			visitId: input.visitId,
			hospitalId: input.hospitalId
		}),
		getMedicationLinesForVisit(input.visitId, input.hospitalId)
	]);

	const prescriptionNotes: VisitDashboardPrescriptionNoteRow[] =
		prescriptionNotesRaw
			.filter(
				(row) =>
					row.statusId == null ||
					row.statusId === StatusEnum.ACTIVE
			)
			.map((row) => ({
				id: row.id,
				note: row.note ?? null,
				sequenceNo: row.sequenceNo ?? null
			}));

	return {
		chiefComplaintEntries: mapFormEntries(chiefComplaintRaw),
		patientConditionEntries: mapFormEntries(patientConditionRaw),
		visitDiagnoses: mapDiagnoses(visitDiagnosesRaw),
		vitalSymptoms: uniqueSymptomsFromVitals(vitals),
		prescriptionNotes,
		medicationLines
	};
}

export async function getVisitDashboardPayload(
	event: RequestEvent,
	input: { hospitalId: string; visitId: number }
): Promise<VisitDashboardPayload> {
	await ensureCanAccessHospital(event, input.hospitalId);

	if (!Number.isFinite(input.visitId) || input.visitId <= 0) {
		throw error(400, 'visitId is required');
	}

	const selectedVisit =
		(await ensureDb().query.patientVisitTable.findFirst({
			where: (t, { and, eq, ne }) =>
				and(
					eq(t.id, input.visitId),
					eq(t.hospitalId, input.hospitalId),
					ne(t.statusId, StatusEnum.DELETED)
				),
			with: {
				patient: { with: { title: true, gender: true } },
				status: true,
				visitType: true,
				hospital: true,
				branch: true,
				doctor: {
					with: {
						title: true,
						specialization: true,
						staffDetail: true
					}
				},
				appointment: true,
				diagnoses: true,
				patientDocuments: true
			}
		})) as VisitDashboardPayload['selectedVisit'] | null;

	if (!selectedVisit) {
		return {
			selectedVisit: null,
			patientVisits: [],
			orderLines: [],
			...emptyClinicalPayload
		};
	}

	const patientId = selectedVisit.patientId ?? null;
	if (!patientId) {
		const clinical = await getSelectedVisitClinicalData(input);
		return {
			selectedVisit,
			patientVisits: [],
			orderLines: [],
			...clinical
		};
	}

	const [patientVisits, orderLines, clinical] = await Promise.all([
		ensureDb().query.patientVisitTable.findMany({
			where: (t, { and, eq, ne }) =>
				and(
					eq(t.patientId, patientId),
					eq(t.hospitalId, input.hospitalId),
					ne(t.statusId, StatusEnum.DELETED)
				),
			with: {
				patient: { with: { title: true, gender: true } },
				status: true,
				visitType: true,
				hospital: true,
				branch: true,
				doctor: {
					with: {
						title: true,
						specialization: true,
						staffDetail: true
					}
				},
				appointment: true,
				diagnoses: true,
				patientDocuments: true
			},
			orderBy: (t) => desc(t.createdAt)
		}) as Promise<VisitDashboardPayload['patientVisits']>,
		getOrderLinesForVisit(input.visitId),
		getSelectedVisitClinicalData(input)
	]);

	return { selectedVisit, patientVisits, orderLines, ...clinical };
}

async function getOrderLinesForVisit(
	visitId: number
): Promise<ServiceOrderDetailRowForVisit[]> {
	const orders = await ensureDb().query.serviceOrderTable.findMany({
		where: (t, { and, eq, ne }) =>
			and(eq(t.visitId, visitId), ne(t.statusId, StatusEnum.DELETED)),
		columns: { id: true, orderNo: true },
		with: {
			details: {
				where: (d, { ne }) => ne(d.statusId, StatusEnum.DELETED),
				with: { serviceItem: true }
			}
		}
	});

	const out: ServiceOrderDetailRowForVisit[] = [];
	for (const ord of orders) {
		for (const d of ord.details) {
			out.push({
				id: d.id,
				serviceId: d.serviceId ?? null,
				serviceName: d.serviceItem?.serviceName ?? null,
				serviceAmount: (d as { serviceAmount?: number | null })
					.serviceAmount ?? null,
				serviceUnit: (d as { serviceUnit?: number | null })
					.serviceUnit ?? null,
				instruction: (d as { instruction?: string | null })
					.instruction ?? null,
				createdAt: (d as { createdAt?: string | Date | null })
					.createdAt ?? null
			});
		}
	}
	out.sort((a, b) => b.id - a.id);
	return out;
}
