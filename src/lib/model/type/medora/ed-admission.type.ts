export type EdRegistrationListRow = {
	edEncounterId: number;
	visitId: string;
	visitNo: string | null;
	boardColumn: string;
	acuityLevel: string | null;
	edTriageLevelId: number | null;
	edTriageLevel: number | null;
	edTriageLevelName: string | null;
	edTriageLevelColor: string | null;
	isMlc: boolean;
	fastTrack: boolean;
	arrivedAt: string;
	chiefComplaint: string | null;
	patientId: string;
	patientCode: string | null;
	patientName: string;
	branchId: string | null;
	erBedId: number | null;
	erBedLabel: string | null;
	assignedDoctorId: string | null;
	registrationRemarks: string | null;
};

export type EdRegistrationDetailRow = EdRegistrationListRow & {
	doctorName: string | null;
};
