export const DeleteStaffConfirmState = $state<{
	pending: { id: string; email: string } | null;
}>({ pending: null });
