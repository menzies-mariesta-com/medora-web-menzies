export const DeletePatientConfirmState = $state<{
	pending: { id: string; email: string } | null;
}>({ pending: null });
