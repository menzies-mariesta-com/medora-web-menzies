export enum LabSectionEnum {
	HEMATOLOGY = 'hematology',
	CHEMISTRY = 'chemistry',
	MICROBIOLOGY = 'microbiology'
}

export enum LabTestDataTypeEnum {
	NUMERIC = 'numeric',
	TEXT = 'text',
	CODED = 'coded'
}

export enum LabOrderStatusEnum {
	ORDERED = 'ordered',
	CANCELLED = 'cancelled'
}

export enum LabAccessionStatusEnum {
	ORDERED = 'ordered',
	COLLECTION_SCHEDULED = 'collection_scheduled',
	COLLECTED = 'collected',
	IN_TRANSIT = 'in_transit',
	RECEIVED = 'received',
	IN_PROCESS = 'in_process',
	RESULTED = 'resulted',
	VERIFIED = 'verified',
	RELEASED = 'released',
	REJECTED = 'rejected',
	CANCELLED = 'cancelled'
}

export enum LabResultReportStatusEnum {
	PRELIMINARY = 'preliminary',
	FINAL = 'final'
}

export enum LabObservationStatusEnum {
	DRAFT = 'draft',
	VERIFIED = 'verified',
	RELEASED = 'released'
}

export enum LabObservationSourceEnum {
	MANUAL = 'manual',
	ANALYZER = 'analyzer',
	IMPORT = 'import'
}

export enum LabSpecimenTypeEnum {
	SERUM = 'serum',
	EDTA = 'edta',
	CITRATE = 'citrate',
	URINE = 'urine',
	SWAB = 'swab',
	OTHER = 'other'
}

export enum LabSpecimenRejectReasonEnum {
	HEMOLYZED = 'hemolyzed',
	INSUFFICIENT = 'insufficient',
	WRONG_TUBE = 'wrong_tube',
	LEAKED = 'leaked',
	OTHER = 'other'
}

export enum LabCriticalCallbackStatusEnum {
	OPEN = 'open',
	IN_PROGRESS = 'in_progress',
	COMPLETED = 'completed',
	ESCALATED = 'escalated'
}

export enum LabCriticalPolicyEnum {
	CALLBACK_BEFORE_RELEASE = 'callback_before_release',
	CALLBACK_AFTER_RELEASE = 'callback_after_release'
}

export enum LabServiceMapTargetTypeEnum {
	TEST = 'test',
	PANEL = 'panel'
}

export enum LabIntegrationParseStatusEnum {
	PENDING = 'pending',
	PARSED = 'parsed',
	ERROR = 'error',
	APPLIED = 'applied'
}
