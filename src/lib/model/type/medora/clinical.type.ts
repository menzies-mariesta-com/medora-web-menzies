export type DiagnosisCodeOption = {
	id: number;
	code: string;
	system: string;
	description: string;
};

export type ProblemListRow = {
	id: number;
	visitId: number;
	visitNo: string | null;
	diagnosisType: string | null;
	code: string | null;
	description: string | null;
	createdAt: string | null;
};

export type DischargeSummaryRow = {
	id: number;
	visitId: number;
	hospitalCourse: string;
	dischargeMedications: string;
	followUp: string;
	redFlags: string;
	draftedBy: string | null;
	signedBy: string | null;
	signedAt: string | null;
};

export type LabResultRow = {
	id: number;
	visitId: number;
	serviceOrderDetailId: number | null;
	resultText: string;
	resultJson: string | null;
	isCritical: boolean;
	enteredBy: string | null;
	endorsedAt: string | null;
	endorsedBy: string | null;
};

export type ImagingResultRow = {
	id: number;
	visitId: number;
	serviceOrderDetailId: number | null;
	findings: string;
	attachmentUrl: string | null;
	enteredBy: string | null;
	endorsedAt: string | null;
	endorsedBy: string | null;
};

export type ClinicalProcedureRow = {
	id: number;
	visitId: number;
	procedureType: string;
	notes: string;
	performedAt: string | null;
	doctorId: string | null;
};

export type OperativeNoteRow = {
	id: number;
	visitId: number;
	preOp: string;
	findings: string;
	technique: string;
	bloodLoss: string | null;
	specimens: string;
	postOp: string;
	surgeonId: string | null;
};

export type ConsultationWorkspaceRow = {
	admissionId: number;
	visitId: number;
	visitNo: string | null;
	patientId: string;
	patientName: string;
	admissionNo: string;
	wardName: string | null;
	bedName: string | null;
	admittedAt: string | null;
	admittingDoctorId: string | null;
};
