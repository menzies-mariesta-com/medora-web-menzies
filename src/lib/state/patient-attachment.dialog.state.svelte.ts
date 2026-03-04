/** Staged item when registering a new patient (no id yet). */
export type StagedPatientAttachment = { file: File; description: string };

export const PatientAttachmentDialogState = $state<{
	pending:
		| { patientId: string }
		| { mode: 'staging' }
		| null;
	/** Used in create flow: attachments to upload after patient is created. */
	stagedAttachments: StagedPatientAttachment[];
	/** When true, dialog shows attachments as view-only (no add/remove). */
	viewOnly: boolean;
}>({ pending: null, stagedAttachments: [], viewOnly: false });

