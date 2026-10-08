export const ObservationPatientDocumentDialogState = $state<{
	visitId: string | null;
	patientId: string | null;
	patientDocumentId: number | null;
	onSaved: (() => void) | null;
}>({
	visitId: null,
	patientId: null,
	patientDocumentId: null,
	onSaved: null
});
