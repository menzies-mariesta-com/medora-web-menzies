/** Set before opening Admit to IPD dialog. */
export const AdmitToIpdDialogState = $state<{
	visitId: number | null;
	branchId: string | null;
	admittingDoctorId: string | null;
}>({
	visitId: null,
	branchId: null,
	admittingDoctorId: null
});
