/** Set before opening ATD Admit dialog (optional branch filter / doctor). */
export const AdmitToIpdDialogState = $state<{
	patientId: string | null;
	branchId: string | null;
	admittingDoctorId: string | null;
}>({
	patientId: null,
	branchId: null,
	admittingDoctorId: null
});
