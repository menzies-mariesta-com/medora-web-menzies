/** Set before opening branch modal: hospitalId required; branchId null = create, string = edit. */
export const BranchModalState = $state<{
	hospitalId: string;
	branchId: string | null;
}>({ hospitalId: '', branchId: null });
