export enum StatusEnum {
	ACTIVE = 1,
	INACTIVE = 2,
	LOCKED = 3,
	DELETED = 4,
	PENDING = 5
}

export enum RoleEnum {
	SYSTEM_ADMIN = 1,
	OWNER = 2,
	STAFF = 3
}

/** Matches `staff_type` master seed (e.g. NURSE=1, EMPLOYEE=2, DOCTOR=3). */
export enum StaffTypeEnum {
	NURSE = 1,
	EMPLOYEE = 2,
	DOCTOR = 3
}

export enum YesNoEnum {
	YES = 1,
	NO = 0
}

export enum ReferTypeEnum {
	EXTERNAL = 1,
	INTERNAL = 2
}

export enum VisitTypeEnum {
	OPD = 1,
	IPD = 2,
	ED = 3,
	DAY_CARE = 4,
	PACKAGE = 5
}

export enum UnitTypeEnum {
	LENGTH = 1,
	WEIGHT = 2,
	PRESSURE = 3,
	RATE = 4,
	TEMPERATURE = 5,
	PERCENTAGE = 6,
	RESPIRATION = 7,
	BLOOD_SUGAR = 8,
	/** Count / pack (tablets, boxes, etc.) — Item Master / inventory. */
	COUNT_PACK = 9,
	/** Volume (ml, L) — Item Master / inventory. */
	VOLUME = 10
}

export enum UnitEnum {
	CM = 1,
	IN = 2,
	KG = 3,
	LB = 4,
	MMHG = 5,
	BPM = 6,
	CELSIUS = 7,
	FAHRENHEIT = 8,
	PERCENT = 9,
	PER_MIN = 10,
	MG_DL = 11,
	MMOL_L = 12,
	TABLET = 13,
	CAPSULE = 14,
	AMPOULE = 15,
	VIAL = 16,
	STRIP = 17,
	BOX = 18,
	BOTTLE = 19,
	PIECE = 20,
	ML = 21,
	LITER = 22
}

export enum SeverityEnum {
	MAJOR = 1,
	MODERATE = 2,
	MINOR = 3,
	NO_ALERT = 4
}

export enum AllergyEnum {
	NO_KNOWN_ALLERGY = 1
}

export enum CategoryEnum {
	RADIOLOGY = 1,
	NURSING_PROCEDURE = 2,
	LABORATORY = 5,
	/** Item Master: `category` rows for supply type (see item_master). */
	GENERAL_SUPPLY = 11,
	PHARMACY_SUPPLY = 12,
	MEDICAL_SUPPLY = 13
}

export enum StatusTaggingTypeEnum {
	DOCTOR_APPOINTMENT = 1,
	VISIT = 2,
	/** @see information-table-seed: status_tagging_type */
	INV_PURCHASE_REQUISITION = 3,
	INV_PURCHASE_ORDER = 4,
	INV_GOODS_RECEIPT = 5,
	INV_STORE_TRANSFER = 6,
	INV_STOCK_ISSUE = 7
}

/**
 * `status_tagging.id` for Purchase Requisition workflow.
 * @see information-table-seed.ts
 */
export enum InvPrStatusTaggingEnum {
	DRAFT = 9,
	PENDING = 10,
	APPROVED = 11,
	REJECTED = 12,
	SENT_BACK = 13,
	CANCELLED = 31
}

/**
 * `status_tagging.id` for Purchase Order workflow.
 * @see information-table-seed.ts
 */
export enum InvPoStatusTaggingEnum {
	DRAFT = 14,
	PENDING = 15,
	APPROVED = 16,
	REJECTED = 17,
	SENT_BACK = 18,
	SENT_TO_SUPPLIER = 19,
	PARTIALLY_RECEIVED = 20,
	CLOSED = 21
}

/**
 * `status_tagging.id` for GRN header.
 * @see information-table-seed.ts
 */
export enum InvGrnStatusTaggingEnum {
	DRAFT = 22,
	POSTED = 23,
	CANCELLED = 24
}

/**
 * `status_tagging.id` for store transfer.
 * @see information-table-seed.ts
 */
export enum InvStoreTransferStatusTaggingEnum {
	DRAFT = 25,
	POSTED = 26,
	CANCELLED = 27
}

/**
 * `status_tagging.id` for stock issue.
 * @see information-table-seed.ts
 */
export enum InvStockIssueStatusTaggingEnum {
	DRAFT = 28,
	POSTED = 29,
	CANCELLED = 30
}

/** Values persisted on `inv_approval_log.action`. */
export enum InvApprovalActionEnum {
	APPROVED = 1,
	REJECTED = 2,
	SENT_BACK = 3
}