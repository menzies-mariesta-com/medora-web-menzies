export const PatientAllergyDialogState = $state<{
	patientId: string | null;
	visitId: number | null;
	/** When set, open in edit mode with existing patient allergy record */
	patientAllergyId: number | null;
}>({
	patientId: null,
	visitId: null,
	patientAllergyId: null
});
