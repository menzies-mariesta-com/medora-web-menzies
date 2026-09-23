/** Set before opening IPD transfer dialog. */
export const IpdTransferDialogState = $state<{
	admissionId: number | null;
	branchId: string | null;
	fromWardId: number | null;
	fromBedId: number | null;
}>({
	admissionId: null,
	branchId: null,
	fromWardId: null,
	fromBedId: null
});
