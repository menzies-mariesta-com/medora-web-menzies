/**
 * Built-in prefix keys used by {@link generatePrefix} in remotes.
 * UI exposes these as fixed “purposes”; users only edit description + format.
 */
export const PREFIX_PURPOSE_STORAGE = {
	PATIENT_CODE: 'PATIENT_CODE',
	VISIT_NO: 'VISIT_NO'
} as const;

export type PrefixPurposeStorageKey =
	(typeof PREFIX_PURPOSE_STORAGE)[keyof typeof PREFIX_PURPOSE_STORAGE];

export type PrefixPurposeId = 'patient' | 'visit';

export interface PrefixPurposeDefinition {
	readonly id: PrefixPurposeId;
	readonly storageKey: PrefixPurposeStorageKey;
}

export const PREFIX_PURPOSES: readonly PrefixPurposeDefinition[] = [
	{ id: 'patient', storageKey: PREFIX_PURPOSE_STORAGE.PATIENT_CODE },
	{ id: 'visit', storageKey: PREFIX_PURPOSE_STORAGE.VISIT_NO }
] as const;

export function findPurposeByStorageKey(
	key: string
): PrefixPurposeDefinition | undefined {
	return PREFIX_PURPOSES.find((p) => p.storageKey === key);
}
