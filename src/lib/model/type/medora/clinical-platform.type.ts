import type { ClinicalOrderSetLineTypeEnum } from '$lib/model/enum/clinical-platform.enum';
import type { ClinicalFormTemplateSchema } from '$lib/model/type/medora/clinical-form.type';

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
	orderTypeName?: string | null;
};

export type MedicationAdministrationRow = {
	id: number;
	scheduleId: number | null;
	lineId: number;
	administrationStatus: string;
	administeredAt: string;
	nurseInitials?: string | null;
	displayReason?: string | null;
};

/** One nursing care plan answers one problem: these are its four fields. */
export type CarePlanFieldId =
	| 'problem'
	| 'goal'
	| 'interventions'
	| 'evaluation';

/** `nursing_care_plan_instance.content_json`. Interventions are one per line. */
export type CarePlanContent = Partial<
	Record<CarePlanFieldId, string>
>;

/** `nursing_care_plan_template.sections_json`: the form schema plus prefill values. */
export type CarePlanTemplateSchema = ClinicalFormTemplateSchema & {
	defaults?: CarePlanContent;
};

export type NursingCarePlanTemplateRow = {
	id: number;
	title: string;
	nandaLabel: string | null;
	sectionsJson: CarePlanTemplateSchema;
};

export type NursingCarePlanInstanceRow = {
	id: number;
	visitId: string;
	templateId: number | null;
	templateTitle: string | null;
	nandaLabel: string | null;
	contentJson: CarePlanContent;
	signedAt: string | null;
	signedByName: string | null;
	/** Derived server-side from `signedAt` so the page never re-derives it. */
	isSigned: boolean;
	createdAt: string;
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

/** Medication order line as eMAR scheduling sees it (one row per order line). */
export type MedicationLineRow = {
	lineId: number;
	lineNo: number;
	itemName: string;
	doseText: string;
	routeName: string | null;
	instructions: string | null;
	orderTypeName: string | null;
	frequencyAbbreviation: string | null;
	/** Decimal comes back as a string from the driver; `dosesPerDay` normalizes it. */
	frequencyPerDay: string | number | null;
	infusionType: string | null;
	rateMlHr: string | null;
};

/** Bed location of the patient for the active admission (eMAR dose dialog). */
export type EmarBedLocation = {
	wardName: string | null;
	roomName: string | null;
	bedName: string | null;
};

/** One visit's whole medication chart, as the eMAR page receives it. */
export type EmarMarPayload = {
	patient: {
		name: string;
		code: string | null;
		visitNo: string | null;
	};
	bedLocation: EmarBedLocation | null;
	lines: MedicationLineRow[];
	schedules: (MedicationScheduleRow & MedicationLineRow)[];
	administrations: MedicationAdministrationRow[];
};
