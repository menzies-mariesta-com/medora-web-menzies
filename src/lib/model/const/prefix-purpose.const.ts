/**
 * Built-in prefix keys used by {@link generatePrefix} on the server.
 * UI exposes these as fixed “purposes”; users only edit description + format.
 */
export const PREFIX_PURPOSE_STORAGE = {
	PATIENT_CODE: 'PATIENT_CODE',
	VISIT_NO: 'VISIT_NO',
	ORDER_NO: 'ORDER_NO',
	PURCHASE_REQUISITION_NO: 'PURCHASE_REQUISITION_NO',
	PURCHASE_ORDER_NO: 'PURCHASE_ORDER_NO'
} as const;

export type PrefixPurposeStorageKey =
	(typeof PREFIX_PURPOSE_STORAGE)[keyof typeof PREFIX_PURPOSE_STORAGE];

export type PrefixPurposeId = 'patient' | 'visit' | 'order' | 'pr' | 'po';

export interface PrefixPurposeDefinition {
	readonly id: PrefixPurposeId;
	readonly storageKey: PrefixPurposeStorageKey;
}

export const PREFIX_PURPOSES: readonly PrefixPurposeDefinition[] = [
	{ id: 'patient', storageKey: PREFIX_PURPOSE_STORAGE.PATIENT_CODE },
	{ id: 'visit', storageKey: PREFIX_PURPOSE_STORAGE.VISIT_NO },
	{ id: 'order', storageKey: PREFIX_PURPOSE_STORAGE.ORDER_NO },
	{ id: 'pr', storageKey: PREFIX_PURPOSE_STORAGE.PURCHASE_REQUISITION_NO },
	{ id: 'po', storageKey: PREFIX_PURPOSE_STORAGE.PURCHASE_ORDER_NO }
] as const;

export function findPurposeByStorageKey(
	key: string
): PrefixPurposeDefinition | undefined {
	return PREFIX_PURPOSES.find((p) => p.storageKey === key);
}
