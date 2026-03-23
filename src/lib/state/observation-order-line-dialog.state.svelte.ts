export const ObservationOrderLineDialogState = $state<{
	visitId: number | null;
	hospitalId: string | null;
	branchId: string | null;
	detailId: number | null;
	onSaved: (() => void) | null;
}>({
	visitId: null,
	hospitalId: null,
	branchId: null,
	detailId: null,
	onSaved: null
});
