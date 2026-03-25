export const ObservationFormEntryDialogState = $state<{
	entryId: number | null;
	visitId: number | null;
	branchId: string | null;
	patientId: string | null;
	formCode: string | null;
	onSaved: (() => void) | null;
}>({
	entryId: null,
	visitId: null,
	branchId: null,
	patientId: null,
	formCode: null,
	onSaved: null
});
