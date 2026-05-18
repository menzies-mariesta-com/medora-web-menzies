/**
 * Built-in prefix keys used by {@link generatePrefix} on the server.
 * UI exposes these as fixed “purposes”; users only edit description + format.
 */
export const PREFIX_PURPOSE_STORAGE = {
	PATIENT_CODE: 'PATIENT_CODE',
	VISIT_NO: 'VISIT_NO',
	ORDER_NO: 'ORDER_NO',
	PURCHASE_REQUISITION_NO: 'PURCHASE_REQUISITION_NO',
	PURCHASE_ORDER_NO: 'PURCHASE_ORDER_NO',
	DEPARTMENT_INDENT_NO: 'DEPARTMENT_INDENT_NO',
	DEPARTMENT_ISSUE_NO: 'DEPARTMENT_ISSUE_NO',
	DEPARTMENT_CONSUMPTION_NO: 'DEPARTMENT_CONSUMPTION_NO',
	/** Internal medication order batch number (all lines in one save share it). */
	MEDICATION_ORDER_BATCH_NO: 'MEDICATION_ORDER_BATCH_NO',
	/** Walk-in external sale receipt number. */
	MEDICATION_ORDER_RECEIPT_NO: 'MEDICATION_ORDER_RECEIPT_NO'
} as const;

export type PrefixPurposeStorageKey =
	(typeof PREFIX_PURPOSE_STORAGE)[keyof typeof PREFIX_PURPOSE_STORAGE];

export type PrefixPurposeId =
	| 'patient'
	| 'visit'
	| 'order'
	| 'pr'
	| 'po'
	| 'di'
	| 'di_issue'
	| 'dc'
	| 'med_order_batch'
	| 'med_order_receipt';

export interface PrefixPurposeDefinition {
	readonly id: PrefixPurposeId;
	readonly storageKey: PrefixPurposeStorageKey;
}

export const PREFIX_PURPOSES: readonly PrefixPurposeDefinition[] = [
	{ id: 'patient', storageKey: PREFIX_PURPOSE_STORAGE.PATIENT_CODE },
	{ id: 'visit', storageKey: PREFIX_PURPOSE_STORAGE.VISIT_NO },
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
	}
] as const;

export function findPurposeByStorageKey(
	key: string
): PrefixPurposeDefinition | undefined {
	return PREFIX_PURPOSES.find((p) => p.storageKey === key);
}
