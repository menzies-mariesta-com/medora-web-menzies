import type { PatientRegMasterTimestamps } from './heka/patient-reg-master.type';

export type CraftGroupRow = PatientRegMasterTimestamps & {
	id: number;
	name: string;
	statusId: number;
};

export type SpecializationRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
	craftGroupId: number | null;
	statusId: number;
};

export type SpecializationStatusRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
};

export type SpecializationWithRelations = SpecializationRow & {
	craftGroup: CraftGroupRow;
	status: SpecializationStatusRow;
};
