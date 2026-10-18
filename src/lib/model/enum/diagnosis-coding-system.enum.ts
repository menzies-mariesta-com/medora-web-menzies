/**
 * Hospital-bound diagnosis coding standard.
 *
 * Product defaults (ICD hospital binding):
 * - One system per hospital (pick exactly one catalogue).
 * - Catalogues are stored separately under `diagnosis_code.system`:
 *   - ICD10: WHO ICD-10 (international, 2019 via WHO ICD-API)
 *   - ICD10_CM: US ICD-10-CM clinical modification (CDC/NCHS flat files)
 *   - ICD11: WHO ICD-11 MMS (via WHO ICD-API)
 * - Changing coding_system is blocked once the hospital has coded diagnoses.
 */
export enum DiagnosisCodingSystemEnum {
	ICD10 = 'ICD10',
	ICD10_CM = 'ICD10_CM',
	ICD11 = 'ICD11'
}

export const DIAGNOSIS_CODING_SYSTEM_VALUES = [
	DiagnosisCodingSystemEnum.ICD10,
	DiagnosisCodingSystemEnum.ICD10_CM,
	DiagnosisCodingSystemEnum.ICD11
] as const;

export type DiagnosisCodingSystem =
	(typeof DIAGNOSIS_CODING_SYSTEM_VALUES)[number];

/** WHO ICD-API backed catalogues (not CDC ICD-10-CM). */
export const WHO_DIAGNOSIS_CODING_SYSTEM_VALUES = [
	DiagnosisCodingSystemEnum.ICD10,
	DiagnosisCodingSystemEnum.ICD11
] as const;

export type WhoDiagnosisCodingSystem =
	(typeof WHO_DIAGNOSIS_CODING_SYSTEM_VALUES)[number];

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

export function isWhoDiagnosisCodingSystem(
	value: unknown
): value is WhoDiagnosisCodingSystem {
	return (
		typeof value === 'string' &&
		(WHO_DIAGNOSIS_CODING_SYSTEM_VALUES as readonly string[]).includes(
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

export function diagnosisCodingSystemLabelKey(
	system: DiagnosisCodingSystem
): string {
	switch (system) {
		case DiagnosisCodingSystemEnum.ICD10_CM:
			return 'hospital_coding_system_icd10_cm';
		case DiagnosisCodingSystemEnum.ICD11:
			return 'hospital_coding_system_icd11';
		case DiagnosisCodingSystemEnum.ICD10:
		default:
			return 'hospital_coding_system_icd10';
	}
}
