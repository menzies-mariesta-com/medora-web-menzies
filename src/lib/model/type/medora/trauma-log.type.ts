export type TraumaActivationLevelRow = {
	id: number;
	hospitalId: string;
	code: string;
	name: string;
	description: string | null;
	color: string;
	sortOrder: number;
	statusId: number;
};

export type TraumaMilestoneTemplateRow = {
	id: number;
	hospitalId: string;
	code: string;
	label: string;
	sortOrder: number;
	statusId: number;
};

export type TraumaTeamRoleRow = {
	id: number;
	hospitalId: string;
	code: string;
	label: string;
	sortOrder: number;
	statusId: number;
};

export type TraumaActivationRichRow = {
	id: number;
	visitId: string;
	levelCode: string;
	activationLevelId: number | null;
	levelName: string | null;
	levelColor: string | null;
	activatedAt: string;
	deactivatedAt: string | null;
	deactivateReason: string | null;
	patientName: string | null;
	visitNo: string | null;
	chiefComplaint: string | null;
	erBedLabel: string | null;
	activatedByName: string | null;
};

export type TraumaMilestoneProgressRow = {
	templateId: number;
	code: string;
	label: string;
	sortOrder: number;
	completedAt: string | null;
	completedByName: string | null;
};

export type TraumaTeamAckProgressRow = {
	roleId: number;
	code: string;
	label: string;
	sortOrder: number;
	notified: boolean;
	acknowledgedAt: string | null;
	staffId: string | null;
};

export type TraumaActivationDetailPayload = {
	activation: TraumaActivationRichRow;
	milestones: TraumaMilestoneProgressRow[];
	teamAcks: TraumaTeamAckProgressRow[];
	formValues: Record<string, unknown> | null;
};

export type TraumaVisitContextRow = {
	visitId: string;
	visitNo: string | null;
	patientName: string | null;
	patientCode: string | null;
	chiefComplaint: string | null;
	activeActivationId: number | null;
};