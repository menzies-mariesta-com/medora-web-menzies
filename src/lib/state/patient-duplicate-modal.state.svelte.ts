import type { PatientWithRelations } from '$lib/model/type/heka/patient.type';

/** State for the duplicate-patients dialog (used with dialog service). Set before opening. */
export const PatientDuplicateModalState = $state<{
	duplicates: PatientWithRelations[];
}>({ duplicates: [] });
