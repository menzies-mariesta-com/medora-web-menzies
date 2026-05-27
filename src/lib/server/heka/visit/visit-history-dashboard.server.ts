import { error, type RequestEvent } from '@sveltejs/kit';
import { and, desc, eq, ne } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import { getNursingCaseSheetPayload } from '$lib/server/heka/emr/nursing-case-sheet.server';
import { getCpoePrescriptionNoteRowsByVisitId } from '$lib/server/heka/consultation/cpoe-prescription-note.server';
import { listMedicationOrderLineRowsByVisitId } from '$lib/server/heka/medication-order/medication-order-internal.server';
import type {
	ServiceOrderDetailRowForVisit,
	VisitDashboardPayload
} from '$lib/model/type/visit-dashboard.type';
import type { CpoePrescriptionNoteListRow } from '$lib/model/type/heka/cpoe-prescription-note.type';

const emptyCaseSheet = (): VisitDashboardPayload['caseSheet'] => ({
	visitRow: null,
	allergies: [],
	vitals: [],
	orderLines: [],
	visitDiagnoses: [],
	chiefComplaintEntries: [],
	patientConditionEntries: [],
	userDisplayById: {}
});

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
			caseSheet: null,
			prescriptionNotes: [],
			medicationLines: []
		};
	}

	const patientId = selectedVisit.patientId ?? null;
	if (!patientId) {
		return {
			selectedVisit,
			patientVisits: [],
			orderLines: [],
			caseSheet: emptyCaseSheet(),
			prescriptionNotes: [],
			medicationLines: []
		};
	}

	const [
		patientVisits,
		orderLines,
		caseSheet,
		prescriptionNoteRows,
		medicationLines
	] = await Promise.all([
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
		getNursingCaseSheetPayload(event, {
			hospitalId: input.hospitalId,
			visitId: input.visitId
		}),
		getCpoePrescriptionNoteRowsByVisitId({
			visitId: input.visitId,
			hospitalId: input.hospitalId
		}),
		listMedicationOrderLineRowsByVisitId(
			event,
			input.hospitalId,
			input.visitId
		)
	]);

	const prescriptionNotes: CpoePrescriptionNoteListRow[] =
		prescriptionNoteRows
			.filter(
				(row) =>
					row.statusId == null || row.statusId === StatusEnum.ACTIVE
			)
			.map((row) => ({
				id: row.id,
				visitId: row.visitId,
				note: row.note,
				deleteRemark: row.deleteRemark,
				statusId: row.statusId,
				doctorId: row.doctorId,
				sequenceNo: row.sequenceNo,
				createdAt: row.createdAt ?? null,
				updatedAt: row.updatedAt ?? null,
				doctor: row.doctor ?? null
			}));

	return {
		selectedVisit,
		patientVisits,
		orderLines,
		caseSheet,
		prescriptionNotes,
		medicationLines
	};
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
				serviceAmount: (d as { serviceAmount?: number | null }).serviceAmount ?? null,
				serviceUnit: (d as { serviceUnit?: number | null }).serviceUnit ?? null,
				instruction: (d as { instruction?: string | null }).instruction ?? null,
				createdAt: (d as { createdAt?: string | Date | null }).createdAt ?? null
			});
		}
	}
	out.sort((a, b) => b.id - a.id);
	return out;
}
