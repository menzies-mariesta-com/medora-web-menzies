import type { ClinicalOrderSetLineTypeEnum } from '$lib/model/enum/clinical-platform.enum';

export type ClinicalOrderSetRow = {
	id: number;
	hospitalId: string;
	name: string;
	specialtyTag: string | null;
	version: number;
	statusId: number;
	createdAt: string;
	updatedAt: string;
};

export type ClinicalOrderSetLineRow = {
	id: number;
	orderSetId: number;
	lineNo: number;
	lineType: ClinicalOrderSetLineTypeEnum | string;
	payloadJson: Record<string, unknown>;
	statusId: number;
};

export type PrescribingAlertRow = {
	id: number;
	alertType: string;
	severity: string;
	message: string;
	overridden: boolean;
	batchId: number | null;
};

export type FormularyItemRow = {
	id: number;
	itemMasterId: number;
	itemName?: string;
	tier: string;
};

export type PharmacyProductIdentifierRow = {
	id: number;
	itemMasterId: number;
	itemName?: string;
	barcodeValue: string;
	identifierType: string;
	isPrimary: boolean;
};

export type MedicationScheduleRow = {
	id: number;
	visitId: string;
	lineId: number;
	scheduledAt: string;
	doseLabel: string | null;
	itemName?: string;
	lineNo?: number;
};

export type MedicationAdministrationRow = {
	id: number;
	scheduleId: number | null;
	lineId: number;
	administrationStatus: string;
	administeredAt: string;
};

export type NursingCarePlanTemplateRow = {
	id: number;
	title: string;
	nandaLabel: string | null;
	sectionsJson: unknown[];
};

export type NursingCarePlanInstanceRow = {
	id: number;
	visitId: string;
	templateId: number | null;
	contentJson: Record<string, unknown>;
	signedAt: string | null;
};

export type ClinicalAlertRow = {
	id: number;
	patientId: string;
	visitId: string | null;
	ruleCode: string;
	severity: string;
	title: string;
	message: string;
	alertStatus: string;
	createdAt: string;
};

export type CosignWorkItemRow = {
	workType: string;
	entityId: number;
	visitId: string | null;
	title: string;
	createdAt: string;
	deepLink: string;
};

export type RoiRequestRow = {
	id: number;
	patientId: string;
	requesterName: string;
	requestStatus: string;
	dueDate: string | null;
	scopeDescription: string;
};

export type ImmunizationMasterRow = {
	id: number;
	cvxCode: string;
	name: string;
};

export type PatientImmunizationRow = {
	id: number;
	immunizationMasterId: number;
	vaccineName?: string;
	administeredOn: string;
	doseSequence: number;
};

export type RegistryDefinitionRow = {
	id: number;
	code: string;
	name: string;
	recallIntervalDays: number | null;
};

export type RegistryMemberRow = {
	id: number;
	patientId: string;
	patientName?: string;
	nextRecallDate: string | null;
	memberStatus: string;
};

export type CdsScreenResult = {
	alerts: PrescribingAlertRow[];
	hasBlocking: boolean;
};
