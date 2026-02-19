import type { PatientWithRelations } from '$lib/remote/table/information-table/patient.remote';

/** State for the duplicate-patients dialog (used with dialog service). Set before opening. */
export const PatientDuplicateModalState = $state<{
	duplicates: PatientWithRelations[];
}>({ duplicates: [] });
