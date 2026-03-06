export const PatientAllergyDialogState = $state<{
	patientId: string | null;
	visitId: number | null;
	/** When set, open in edit mode with existing patient allergy record */
	patientAllergyId: number | null;
	/** Called when the dialog saves successfully. Used to refresh the list when nested dialogs replace DialogState (e.g. deactivation remark). */
	onSaved: (() => void) | null;
}>({
	patientId: null,
	visitId: null,
	patientAllergyId: null,
	onSaved: null
});
