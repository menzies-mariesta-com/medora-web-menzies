/** GET `/api/heka/hospital/{id}/home/nursing-workbench/emr/case-sheet` */
export type NursingCaseSheetPayload = {
	visitRow: unknown | null;
	allergies: unknown[];
	vitals: unknown[];
	orderLines: unknown[];
	visitDiagnoses: unknown[];
	chiefComplaintEntries: unknown[];
	patientConditionEntries: unknown[];
	userDisplayById: Record<string, string>;
};

/** @deprecated Use `NursingCaseSheetPayload` */
export type CaseSheetGetResponse = NursingCaseSheetPayload;
