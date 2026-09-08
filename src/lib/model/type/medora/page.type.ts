import type { PatientRegMasterTimestamps } from './patient-reg-master.type';

/** Page row (+ module bar / nav); JSON from API / layout data. */
export type MedoraPageModuleRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
	imageUrl: string | null;
	moduleUrl: string | null;
	sequenceNo: number | null;
	statusId: number;
};

export type MedoraPageStatusRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
};

export type MedoraPageRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
	parentId: number | null;
	imageUrl: string | null;
	pageUrl: string | null;
	sequenceNo: number | null;
	moduleId: number | null;
	statusId: number;
};

export type PageWithRelations = MedoraPageRow & {
	module: MedoraPageModuleRow | null;
	status: MedoraPageStatusRow | null;
};
