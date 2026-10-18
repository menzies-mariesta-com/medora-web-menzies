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
