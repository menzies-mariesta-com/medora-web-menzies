export const ObservationPlanOfCareDialogState = $state<{
	visitId: number | null;
	hospitalId: string | null;
	patientId: string | null;
	planOfCareId: number | null;
	onSaved: (() => void) | null;
}>({
	visitId: null,
	hospitalId: null,
	patientId: null,
	planOfCareId: null,
	onSaved: null
});
