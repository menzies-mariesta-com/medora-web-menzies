export const PatientAttachmentDialogState = $state<{
	pending: {
		patientId: string;
		patientName?: string;
	} | null;
}>({ pending: null });

