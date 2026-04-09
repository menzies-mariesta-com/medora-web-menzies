/** Minimal document shape for `resolveDocumentSettingForDoc`. */
export type DocumentForPrintSetting = {
	documentSettingId?: number | null;
	documentTypeId?: number | null;
	documentType?: { documentType?: string | null } | null;
};

/** Master document row from clinical-document bootstrap API (print / preview). */
export type ClinicalDocumentRow = DocumentForPrintSetting & {
	id: number;
	documentNumber?: string | null;
	code?: string | null;
	documentText?: string | null;
};
