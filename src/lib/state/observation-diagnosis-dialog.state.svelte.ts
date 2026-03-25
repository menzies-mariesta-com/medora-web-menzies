export const ObservationDiagnosisDialogState = $state<{
	visitId: number | null;
	branchId: string | null;
	patientId: string | null;
	diagnosisId: number | null;
	onSaved: (() => void) | null;
}>({
	visitId: null,
	branchId: null,
	patientId: null,
	diagnosisId: null,
	onSaved: null
});
