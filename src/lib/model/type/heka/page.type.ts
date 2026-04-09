import type { PatientRegMasterTimestamps } from './patient-reg-master.type';

/** Page row (+ module bar / nav); JSON from API / layout data. */
export type HekaPageModuleRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
	imageUrl: string | null;
	moduleUrl: string | null;
	sequenceNo: number | null;
	statusId: number;
};

export type HekaPageStatusRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
};

export type HekaPageRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
	parentId: number | null;
	imageUrl: string | null;
	pageUrl: string | null;
	sequenceNo: number | null;
	moduleId: number | null;
	statusId: number;
};

export type PageWithRelations = HekaPageRow & {
	module: HekaPageModuleRow | null;
	status: HekaPageStatusRow | null;
};
