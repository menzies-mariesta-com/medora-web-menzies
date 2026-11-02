/**
 * Built-in prefix keys used by {@link generatePrefix} on the server.
 * UI exposes these as fixed “purposes”; users only edit description + format.
 */
export const PREFIX_PURPOSE_STORAGE = {
	PATIENT_CODE: 'PATIENT_CODE',
	/**
	 * Optional separate HRN for External Sales / walk-in patients.
	 * When not configured, registration falls back to {@link PATIENT_CODE}.
	 */
	EXTERNAL_PATIENT_CODE: 'EXTERNAL_PATIENT_CODE',
	/** OPD / ED / IPD visits and IPD admission numbers (one hospital-wide format). */
	ADMISSION_NO: 'ADMISSION_NO',
	ORDER_NO: 'ORDER_NO',
	PURCHASE_REQUISITION_NO: 'PURCHASE_REQUISITION_NO',
	PURCHASE_ORDER_NO: 'PURCHASE_ORDER_NO',
	DEPARTMENT_INDENT_NO: 'DEPARTMENT_INDENT_NO',
	DEPARTMENT_ISSUE_NO: 'DEPARTMENT_ISSUE_NO',
	DEPARTMENT_CONSUMPTION_NO: 'DEPARTMENT_CONSUMPTION_NO',
	/** Internal medication order batch number (all lines in one save share it). */
	MEDICATION_ORDER_BATCH_NO: 'MEDICATION_ORDER_BATCH_NO',
	/** Walk-in external sale receipt number. */
	MEDICATION_ORDER_RECEIPT_NO: 'MEDICATION_ORDER_RECEIPT_NO',
	/** OP and IP final bill numbers (one hospital-wide format). */
	BILL_NO: 'BILL_NO'
} as const;

export type PrefixPurposeStorageKey =
	(typeof PREFIX_PURPOSE_STORAGE)[keyof typeof PREFIX_PURPOSE_STORAGE];

/** Legacy DB / counter keys merged into {@link PREFIX_PURPOSE_STORAGE.ADMISSION_NO} / BILL_NO. */
const LEGACY_ADMISSION_KEYS = new Set(['VISIT_NO', 'IPD_ADMISSION_NO']);
const LEGACY_BILL_KEYS = new Set(['IP_BILL_NO']);

/** Normalize storage keys after unifying visit / IPD admission / bill purposes. */
export function normalizePrefixStorageKey(key: string): string {
	if (LEGACY_ADMISSION_KEYS.has(key)) {
		return PREFIX_PURPOSE_STORAGE.ADMISSION_NO;
	}
	if (LEGACY_BILL_KEYS.has(key)) {
		return PREFIX_PURPOSE_STORAGE.BILL_NO;
	}
	return key;
}

export type PrefixPurposeId =
	| 'patient'
	| 'external_patient'
	| 'admission'
	| 'order'
	| 'pr'
	| 'po'
	| 'di'
	| 'di_issue'
	| 'dc'
	| 'med_order_batch'
	| 'med_order_receipt'
	| 'bill';

export interface PrefixPurposeDefinition {
	readonly id: PrefixPurposeId;
	readonly storageKey: PrefixPurposeStorageKey;
}

export const PREFIX_PURPOSES: readonly PrefixPurposeDefinition[] = [
	{ id: 'patient', storageKey: PREFIX_PURPOSE_STORAGE.PATIENT_CODE },
	{
		id: 'external_patient',
		storageKey: PREFIX_PURPOSE_STORAGE.EXTERNAL_PATIENT_CODE
	},
	{ id: 'admission', storageKey: PREFIX_PURPOSE_STORAGE.ADMISSION_NO },
	{ id: 'order', storageKey: PREFIX_PURPOSE_STORAGE.ORDER_NO },
	{
		id: 'pr',
		storageKey: PREFIX_PURPOSE_STORAGE.PURCHASE_REQUISITION_NO
	},
	{ id: 'po', storageKey: PREFIX_PURPOSE_STORAGE.PURCHASE_ORDER_NO },
	{
		id: 'di',
		storageKey: PREFIX_PURPOSE_STORAGE.DEPARTMENT_INDENT_NO
	},
	{
		id: 'di_issue',
		storageKey: PREFIX_PURPOSE_STORAGE.DEPARTMENT_ISSUE_NO
	},
	{
		id: 'dc',
		storageKey: PREFIX_PURPOSE_STORAGE.DEPARTMENT_CONSUMPTION_NO
	},
	{
		id: 'med_order_batch',
		storageKey: PREFIX_PURPOSE_STORAGE.MEDICATION_ORDER_BATCH_NO
	},
	{
		id: 'med_order_receipt',
		storageKey: PREFIX_PURPOSE_STORAGE.MEDICATION_ORDER_RECEIPT_NO
	},
	{ id: 'bill', storageKey: PREFIX_PURPOSE_STORAGE.BILL_NO }
] as const;

export function findPurposeByStorageKey(
	key: string
): PrefixPurposeDefinition | undefined {
	const normalized = normalizePrefixStorageKey(key);
	return PREFIX_PURPOSES.find((p) => p.storageKey === normalized);
}
