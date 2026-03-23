export type ObservationVisitTextField =
	| 'chiefComplaint'
	| 'patientCondition'
	| 'diagnosisNotes';

export const ObservationVisitTextDialogState = $state<{
	visitId: number | null;
	field: ObservationVisitTextField | null;
	onSaved: (() => void) | null;
}>({
	visitId: null,
	field: null,
	onSaved: null
});
