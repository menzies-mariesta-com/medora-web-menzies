export const VitalRecordDialogState = $state<{
	patientId: string | null;
	hospitalId: string | null;
	visitId: number | null;
	/** When set, open in edit mode with existing vital data */
	vitalId: number | null;
}>({
	patientId: null,
	hospitalId: null,
	visitId: null,
	vitalId: null
});
