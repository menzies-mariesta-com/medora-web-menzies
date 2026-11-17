/** Fixed `document_type.id` rows from master-table-seed — not user-creatable. */
export const DocumentTypeId = {
	CLINICAL_DOCUMENT: 1,
	BILL_PRINT: 2,
	NURSING_COMPLETE_PRINT: 3,
	CASE_SHEET_PRINT: 4,
	DISCHARGE_SUMMARY_PRINT: 5,
	MED_ORDER_RECEIPT_PRINT: 6,
	APPOINTMENT_SLIP_PRINT: 7,
	VISIT_LABEL_PRINT: 8,
	IPD_WRISTBAND_PRINT: 9
} as const;

export type DocumentTypeIdValue =
	(typeof DocumentTypeId)[keyof typeof DocumentTypeId];
