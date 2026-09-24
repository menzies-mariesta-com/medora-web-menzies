export const ObservationFormEntryDialogState = $state<{
	entryId: number | null;
	visitId: number | null;
	branchId: string | null;
	patientId: string | null;
	formCode: string | null;
	/** When set (add mode), show a specialty/type picker instead of a fixed form code. */
	formCodeOptions: { value: string; label: string }[] | null;
	onSaved: (() => void) | null;
}>({
	entryId: null,
	visitId: null,
	branchId: null,
	patientId: null,
	formCode: null,
	formCodeOptions: null,
	onSaved: null
});
