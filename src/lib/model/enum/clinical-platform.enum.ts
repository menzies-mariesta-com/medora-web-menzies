/** Formulary tier for hospital pharmacy items. */
export enum FormularyTierEnum {
	PREFERRED = 'preferred',
	RESTRICTED = 'restricted',
	NON_FORMULARY = 'non_formulary'
}

export enum ClinicalOrderSetLineTypeEnum {
	MEDICATION = 'medication',
	SERVICE = 'service',
	NURSING_TASK = 'nursing_task',
	CLINICAL_FORM = 'clinical_form'
}

export enum ClinicalOrderSetTriggerTypeEnum {
	DIAGNOSIS = 'diagnosis',
	SPECIALTY = 'specialty',
	MANUAL = 'manual'
}

export enum PharmacyProductIdentifierTypeEnum {
	GTIN = 'gtin',
	HOSPITAL = 'hospital',
	NDC = 'ndc'
}

export enum PrescribingAlertSeverityEnum {
	INFO = 'info',
	MILD = 'mild',
	MODERATE = 'moderate',
	SEVERE = 'severe'
}

export enum MedicationAdministrationStatusEnum {
	GIVEN = 'given',
	HELD = 'held',
	REFUSED = 'refused',
	NOT_GIVEN = 'not_given',
	/** Running-infusion markers: no due dose, only a start/stop on the line. */
	INFUSION_START = 'infusion_start',
	INFUSION_STOP = 'infusion_stop'
}

export enum MedicationInfusionTypeEnum {
	BOLUS = 'bolus',
	CONTINUOUS = 'continuous',
	PIGGYBACK = 'piggyback'
}

export enum ClinicalAlertStatusEnum {
	OPEN = 'open',
	ACKNOWLEDGED = 'acknowledged',
	SNOOZED = 'snoozed',
	RESOLVED = 'resolved'
}

export enum RoiRequestStatusEnum {
	INTAKE = 'intake',
	VERIFICATION = 'verification',
	IN_PROGRESS = 'in_progress',
	DELIVERED = 'delivered',
	DENIED = 'denied'
}

export enum RegistryMemberStatusEnum {
	ACTIVE = 'active',
	INACTIVE = 'inactive',
	PENDING_REVIEW = 'pending_review'
}

export enum CosignWorkItemTypeEnum {
	PROGRESS_NOTE = 'progress_note',
	MEDICATION_ORDER = 'medication_order',
	DISCHARGE_SUMMARY = 'discharge_summary'
}

/** Why a scheduled dose was held or refused (eMAR hold branch). */
export enum MedicationHoldReasonEnum {
	PATIENT_REFUSED = 'patient_refused',
	VITALS_OUT_OF_RANGE = 'vitals_out_of_range',
	NPO_FOR_SURGERY = 'npo_for_surgery',
	DRUG_UNAVAILABLE = 'drug_unavailable',
	PATIENT_ABSENT = 'patient_absent',
	ORDER_DISCONTINUED = 'order_discontinued',
	OTHER = 'other'
}
