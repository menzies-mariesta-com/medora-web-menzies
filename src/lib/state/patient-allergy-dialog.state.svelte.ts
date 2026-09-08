export const PatientAllergyDialogState = $state<{
	patientId: string | null;
	visitId: number | null;
	/** Hospital scope for `/api/medora/hospital/.../consultation/emr` */
	hospitalId: string | null;
	/** When set, open in edit mode with existing patient allergy record */
	patientAllergyId: number | null;
	/** Called when the dialog saves successfully. Used to refresh the list when nested dialogs replace DialogState (e.g. deactivation remark). */
	onSaved: (() => void) | null;
	/**
	 * When true, allergy mutations POST to nursing-workbench EMR (still clinically signed)
	 * instead of observation EMR, which stays locked after “Save as signed”.
	 */
	emrMutationViaNursingWorkbench: boolean;
}>({
	patientId: null,
	visitId: null,
	hospitalId: null,
	patientAllergyId: null,
	onSaved: null,
	emrMutationViaNursingWorkbench: false
});
