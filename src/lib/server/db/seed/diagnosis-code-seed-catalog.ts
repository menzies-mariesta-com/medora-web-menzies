/**
 * Legacy curated ICD sample rows (not used by seed or admin reseed anymore).
 *
 * Full ICD-10 / ICD-11 catalogs come from the WHO ICD-API via
 * `$lib/server/medora/clinical/who-icd-import.server.ts`
 * (`pnpm db:import:icd`, information seed, admin Reseed).
 *
 * Kept for reference / tests that may import sample codes.
 */

import { DiagnosisCodingSystemEnum } from '$lib/model/enum/diagnosis-coding-system.enum';
import { StatusEnum } from '$lib/model/enum/db-link';

export type DiagnosisCodeSeedRow = {
	code: string;
	system: string;
	description: string;
	statusId: number;
	releaseId: string;
};

/** Marker release id for Medora's curated seed set (not a WHO release). */
export const DIAGNOSIS_CODE_SEED_RELEASE_ID = 'seed-standard';

export const DIAGNOSIS_CODE_SEED_SOURCE = 'MEDORA_SEED';

export const ICD10_SEED_ROWS: DiagnosisCodeSeedRow[] = [
	{
		code: 'I10',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Essential (primary) hypertension',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'E11.9',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Type 2 diabetes mellitus without complications',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'E78.5',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Hyperlipidemia, unspecified',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'J06.9',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Acute upper respiratory infection, unspecified',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'J18.9',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Pneumonia, unspecified organism',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'J44.9',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Chronic obstructive pulmonary disease, unspecified',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'J45.909',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Unspecified asthma, uncomplicated',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'K21.9',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Gastro-esophageal reflux disease without esophagitis',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'K52.9',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Noninfective gastroenteritis and colitis, unspecified',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'N39.0',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Urinary tract infection, site not specified',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'N18.9',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Chronic kidney disease, unspecified',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'I25.10',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Atherosclerotic heart disease without angina',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'I50.9',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Heart failure, unspecified',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'I48.91',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Unspecified atrial fibrillation',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'I63.9',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Cerebral infarction, unspecified',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'D64.9',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Anemia, unspecified',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'R50.9',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Fever, unspecified',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'R51.9',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Headache, unspecified',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'R07.9',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Chest pain, unspecified',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'R10.9',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Unspecified abdominal pain',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'R11.2',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Nausea with vomiting, unspecified',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'R42',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Dizziness and giddiness',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'M54.5',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Low back pain',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'M19.90',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Osteoarthritis, unspecified site',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'G43.909',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Migraine, unspecified, not intractable',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'F41.9',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Anxiety disorder, unspecified',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'F32.A',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Depression, unspecified',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'L03.90',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Cellulitis, unspecified',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'A09',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'Infectious gastroenteritis and colitis, unspecified',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'U07.1',
		system: DiagnosisCodingSystemEnum.ICD10,
		description: 'COVID-19',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	}
];

export const ICD11_SEED_ROWS: DiagnosisCodeSeedRow[] = [
	{
		code: 'BA00',
		system: DiagnosisCodingSystemEnum.ICD11,
		description: 'Essential hypertension',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: '5A11',
		system: DiagnosisCodingSystemEnum.ICD11,
		description: 'Type 2 diabetes mellitus',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'CA40',
		system: DiagnosisCodingSystemEnum.ICD11,
		description: 'Pneumonia',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'CA23',
		system: DiagnosisCodingSystemEnum.ICD11,
		description: 'Asthma',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'MD81',
		system: DiagnosisCodingSystemEnum.ICD11,
		description: 'Abdominal or pelvic pain',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'MG22',
		system: DiagnosisCodingSystemEnum.ICD11,
		description: 'Fever of other or unknown origin',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: '8A80',
		system: DiagnosisCodingSystemEnum.ICD11,
		description: 'Migraine',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'MB24',
		system: DiagnosisCodingSystemEnum.ICD11,
		description: 'Dizziness or giddiness',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: '1A40',
		system: DiagnosisCodingSystemEnum.ICD11,
		description: 'Gastroenteritis or colitis of infectious origin',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	},
	{
		code: 'RA01',
		system: DiagnosisCodingSystemEnum.ICD11,
		description: 'COVID-19',
		statusId: StatusEnum.ACTIVE,
		releaseId: DIAGNOSIS_CODE_SEED_RELEASE_ID
	}
];

export const ALL_DIAGNOSIS_CODE_SEED_ROWS: DiagnosisCodeSeedRow[] = [
	...ICD10_SEED_ROWS,
	...ICD11_SEED_ROWS
];

export function diagnosisCodeSeedRowsForSystem(
	system: string | null | undefined
): DiagnosisCodeSeedRow[] {
	if (system === DiagnosisCodingSystemEnum.ICD10) return ICD10_SEED_ROWS;
	if (system === DiagnosisCodingSystemEnum.ICD10_CM) return [];
	if (system === DiagnosisCodingSystemEnum.ICD11) return ICD11_SEED_ROWS;
	return ALL_DIAGNOSIS_CODE_SEED_ROWS;
}
