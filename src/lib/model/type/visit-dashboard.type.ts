import type { NursingCaseSheetPayload } from '$lib/model/type/heka/case-sheet.type';
import type { CpoePrescriptionNoteListRow } from '$lib/model/type/heka/cpoe-prescription-note.type';
import type { MedicationOrderLineForVisitRow } from '$lib/model/type/heka/medication-order.type';

export type PatientVisitWithRelationsLite = {
	id: number;
	patientId: string | null;
	hospitalId: string | null;
	branchId?: string | null;
	doctorId?: string | null;
	visitNo: string | null;
	diagnosisNotes?: string | null;
	createdAt: string | Date | null;
	patient?: {
		code?: string | null;
		firstName?: string | null;
		middleName?: string | null;
		lastName?: string | null;
		dateOfBirth?: string | Date | null;
		title?: unknown;
		gender?: unknown;
	} | null;
	hospital?: { name?: string | null } | null;
	branch?: { name?: string | null } | null;
	visitType?: { name?: string | null } | null;
	doctor?: unknown;
	diagnoses?: { description?: string | null; statusId?: number | null }[];
};

export type ServiceOrderDetailRowForVisit = {
	id: number;
	serviceId?: number | null;
	serviceName: string | null;
	serviceAmount?: number | null;
	serviceUnit?: number | null;
	instruction?: string | null;
	createdAt?: string | Date | null;
};

export type VisitDashboardPayload = {
	selectedVisit: PatientVisitWithRelationsLite | null;
	patientVisits: PatientVisitWithRelationsLite[];
	orderLines: ServiceOrderDetailRowForVisit[];
	caseSheet: NursingCaseSheetPayload | null;
	prescriptionNotes: CpoePrescriptionNoteListRow[];
	medicationLines: MedicationOrderLineForVisitRow[];
};
