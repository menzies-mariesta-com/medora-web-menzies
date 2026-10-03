/**
 * Hospital-bound diagnosis coding standard.
 *
 * Product defaults (ICD hospital binding):
 * - One system per hospital (ICD-10 XOR ICD-11).
 * - Catalogs are WHO ICD-10 and WHO ICD-11 MMS (not ICD-10-CM).
 * - Changing coding_system is blocked once the hospital has coded diagnoses.
 */
export enum DiagnosisCodingSystemEnum {
	ICD10 = 'ICD10',
	ICD11 = 'ICD11'
}

export const DIAGNOSIS_CODING_SYSTEM_VALUES = [
	DiagnosisCodingSystemEnum.ICD10,
	DiagnosisCodingSystemEnum.ICD11
] as const;

export type DiagnosisCodingSystem =
	(typeof DIAGNOSIS_CODING_SYSTEM_VALUES)[number];

export function isDiagnosisCodingSystem(
	value: unknown
): value is DiagnosisCodingSystem {
	return (
		typeof value === 'string' &&
		(DIAGNOSIS_CODING_SYSTEM_VALUES as readonly string[]).includes(
			value
		)
	);
}

export function parseDiagnosisCodingSystem(
	value: unknown,
	fallback: DiagnosisCodingSystem = DiagnosisCodingSystemEnum.ICD10
): DiagnosisCodingSystem {
	return isDiagnosisCodingSystem(value) ? value : fallback;
}
