export const ObservationProgressNoteDialogState = $state<{
	visitId: string | null;
	hospitalId: string | null;
	patientId: string | null;
	progressNoteId: number | null;
	onSaved: (() => void) | null;
}>({
	visitId: null,
	hospitalId: null,
	patientId: null,
	progressNoteId: null,
	onSaved: null
});
