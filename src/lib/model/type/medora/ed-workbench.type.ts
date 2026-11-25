export type EdEncounterBoardRow = {
	id: number;
	visitId: string;
	hospitalId: string;
	boardColumn: string;
	fastTrack: boolean;
	triageSystem: string | null;
	acuityLevel: string | null;
	assignedDoctorId: string | null;
	arrivedAt: string;
	patientName: string | null;
	visitNo: string | null;
	chiefComplaint: string | null;
	waitMinutes: number;
	erBedLabel?: string | null;
	erWardId?: number | null;
	erRoomId?: number | null;
	erBedId?: number | null;
};

export type TraumaActivationRow = {
	id: number;
	visitId: string;
	levelCode: string;
	activatedAt: string;
	deactivatedAt: string | null;
};

export type HospitalPerioperativeSettingRow = {
	hospitalId: string;
	defaultEdTriageSystem: string;
	preOpMandatory: boolean;
	whoBlockWithoutTimeout: boolean;
};

/** Minimal ED triage vitals block; GCS and pain live in the form instance values. */
export type EdTriageVitals = {
	pulse?: number | null;
	respiration?: number | null;
	bpSystolic?: number | null;
	bpDiastolic?: number | null;
	spO2?: number | null;
	temperature?: number | null;
};

/** `mode=current` payload for the triage workbench. */
export type EdTriageCurrentRow = {
	boardColumn: string | null;
	triageSystem: string | null;
	acuityLevel: string | null;
	triagedAt: string | null;
	triagedByName: string | null;
	arrivedAt: string | null;
	instanceId: number | null;
	signed: boolean;
	values: Record<string, unknown>;
};
