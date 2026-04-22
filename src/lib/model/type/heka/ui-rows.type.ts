/**
 * JSON / list row shapes for pages & client state (mirrored API).
 * Keep off `$lib/server/db/schema-type`.
 */
import type { PatientRegMasterTimestamps } from './patient-reg-master.type';
import type { PrefixFormatSpec } from './prefix-format.type';
import type { PatientWithRelations } from './patient.type';
import type { StaffWithRelations } from './staff.type';

export type StatusListRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
};

export type CategoryListRow = PatientRegMasterTimestamps & {
	id: number;
	categoryName: string | null;
	statusId: number;
};

export type SubCategoryListRow = PatientRegMasterTimestamps & {
	id: number;
	categoryId: number;
	subCategoryName: string | null;
	statusId: number;
};

export type ServiceItemListRow = PatientRegMasterTimestamps & {
	id: number;
	hospitalId: string;
	subCategoryId: number;
	serviceName: string | null;
	serviceCode: string | null;
	remark: string | null;
	statusId: number;
	subCategory?: SubCategoryListRow | null;
};

export type ServiceTaggingListRow = PatientRegMasterTimestamps & {
	id: number;
	branchId: string;
	serviceId: number;
	validDate: string | null;
	serviceAmount: string | null;
	serviceTaxAmount: string | null;
	allowEdit: boolean;
	statusId: number;
	service?: ServiceItemListRow | null;
};

export type ServiceOrderListRow = PatientRegMasterTimestamps & {
	id: number;
	branchId: string;
	orderDate: string | null;
	orderTime: string | null;
	orderNo: string | null;
	visitId: number;
	statusId: number;
};

export type ServiceOrderDetailListRow = PatientRegMasterTimestamps & {
	id: number;
	serviceOrderId: number;
	serviceId: number;
	advisingDoctorId: string | null;
	instruction: string | null;
	isUrgent: boolean;
	discount: string | null;
	serviceAmount: string | null;
	serviceTaxAmount: string | null;
	serviceUnit: number | null;
	nursingCompleteTime: string | null;
	statusId: number;
	cancelBy: string | null;
	cancelRemark: string | null;
	service?: ServiceItemListRow | null;
	advisingDoctor?: StaffWithRelations | null;
	cancelByUser?: { id?: string; name?: string | null } | null;
	/** True when this line is on a closed OP bill (not editable/removable). */
	lockedByClosedOpBill?: boolean;
};

export type PatientDiagnosisListRow = PatientRegMasterTimestamps & {
	id: number;
	patientId: string;
	hospitalId: string;
	visitId: number;
	statusId: number;
	height: string | null;
	heightUnitId: number | null;
	weight: string | null;
	weightUnitId: number | null;
	bpSystolic: string | null;
	bpDiastolic: string | null;
	bpUnitId: number | null;
	pulse: string | null;
	pulseUnitId: number | null;
	temperature: string | null;
	temperatureUnitId: number | null;
	spO2: string | null;
	spO2UnitId: number | null;
	respiration: string | null;
	respirationUnitId: number | null;
	rbs: string | null;
	rbsUnitId: number | null;
	bmi: string | null;
	symptom: string | null;
	description: string | null;
	remark: string | null;
	vitalDateTime: string | null;
	patient?: PatientWithRelations | null;
};

export type ItemMasterListRow = PatientRegMasterTimestamps & {
	id: number;
	hospitalId: string;
	itemName: string;
	categoryId: number;
	itemCode: string | null;
	barcode: string | null;
	manufacturerId: number | null;
	manufacturerName: string | null;
	pharmacyGenericId: number | null;
	pharmacyGenericName: string | null;
	description: string | null;
	remark: string | null;
	statusId: number;
	/** When true, GRN must send batch_no, expiry_date, purchase_price for this item. */
	isBatchRequired?: boolean;
	/** Unit conversion ids tagged to this item (optional, only on detail fetch). */
	itemUnitMasterIds?: number[];
	/** Which linked conversion is default (detail fetch); null if none. */
	defaultItemUnitMasterId?: number | null;
	category?: CategoryListRow | null;
};

export type PharmacyGenericListRow = PatientRegMasterTimestamps & {
	id: number;
	hospitalId: string;
	name: string;
	code: string | null;
	statusId: number;
};

/** Manufacturer / supplier grid + detail (mirrors API JSON; geography is FK ids + joined labels). */
export type ManufacturerListRow = PatientRegMasterTimestamps & {
	id: number;
	hospitalId: string;
	name: string;
	code: string | null;
	address: string | null;
	countryId: number | null;
	stateId: number | null;
	cityId: number | null;
	postalCodeId: number | null;
	phone: string | null;
	phoneCountryId: number | null;
	email: string | null;
	remark: string | null;
	statusId: number;
	cityName?: string | null;
	countryName?: string | null;
	postalCodeLabel?: string | null;
};

export type SupplierListRow = ManufacturerListRow;

export type UnitTypeListRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
	statusId: number;
};

export type UnitListRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
	unitTypeId: number | null;
	statusId: number;
	unitType?: UnitTypeListRow | null;
};

/** Unit master grid row (joined unit type name). */
export type UnitMasterListRow = UnitListRow & {
	unitTypeName: string | null;
};

/** Purchase/issue unit conversion definition (not tagged to item). */
export type ItemUnitMasterListRow = PatientRegMasterTimestamps & {
	id: number;
	hospitalId: string;
	purchaseUnitId: number;
	purchaseUnitName: string | null;
	purchaseConversionFactor: string;
	issueUnitId: number;
	issueUnitName: string | null;
	issueConversionFactor: string;
	conversionDisplay: string;
	statusId: number;
};

export type StoreListRow = PatientRegMasterTimestamps & {
	id: number;
	branchId: string;
	userGroupId: number | null;
	departmentId: number | null;
	storeName: string | null;
	remark: string | null;
	statusId: number;
	branch?: { id: string; name: string | null; code: string | null } | null;
	userGroup?: { id: number; name: string | null } | null;
	department?: { id: number; name: string | null; code: string | null } | null;
};

export type PatientAttachmentListRow = PatientRegMasterTimestamps & {
	id: number;
	patientId: string;
	fileUrl: string | null;
	description: string | null;
	statusId: number;
};

export type SupportTicketListRow = PatientRegMasterTimestamps & {
	id: number;
	subject: string;
	description: string;
	status: string;
	priority: number;
	requesterId: string;
	hospitalId: string | null;
	contextUrl: string | null;
	assignedToUserId: string | null;
	resolution: string | null;
	requester?: { id?: string; name?: string | null; email?: string | null } | null;
	hospital?: { id?: string; name?: string | null } | null;
};

export type FinancialYearListRow = PatientRegMasterTimestamps & {
	id: number;
	hospitalId: string;
	code: string | null;
	startDate: string | null;
	endDate: string | null;
	statusId: number;
};

export type DoctorScheduleListRow = PatientRegMasterTimestamps & {
	id: number;
	staffId: string;
	hospitalId: string;
	branchId: string;
	weekdayId: number;
	fromDate: string | null;
	toDate: string | null;
	fromShiftTime: string | null;
	toShiftTime: string | null;
	slotDurationMinutes: number | null;
	statusId: number;
};

export type AppointmentBlockListRow = PatientRegMasterTimestamps & {
	id: number;
	staffId: string;
	hospitalId: string | null;
	blockDate: string;
	fromTime: string;
	toTime: string;
	remark: string | null;
	statusId: number;
};

export type PrefixFormatListRow = PatientRegMasterTimestamps & {
	id: number;
	hospitalId: string;
	key: string;
	description: string | null;
	format: PrefixFormatSpec;
	counterIncludeBranch: number;
	counterIncludeFinancialYear: number;
	counterIncludeVisitType: number;
	counterIncludeVisit: number;
};

/** `user` table (Better Auth); no deletedAt on this row. */
export type UserListRow = {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	image: string | null;
	roleId: number | null;
	createdAt: string;
	updatedAt: string;
};

export type ReferTypeListRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
	code: string | null;
	statusId: number;
};

export type ExternalReferListRow = PatientRegMasterTimestamps & {
	id: number;
	referTypeId: number | null;
	hospitalId: string | null;
	titleId: number | null;
	name: string | null;
	address: string | null;
	countryId: number | null;
	stateId: number | null;
	cityId: number | null;
	postalCodeId: number | null;
	phoneCountryId: number | null;
	phone: string | null;
	email: string | null;
	statusId: number;
};

export type StatusTaggingListRow = PatientRegMasterTimestamps & {
	id: number;
	name: string | null;
	code: string | null;
	sequenceNo: number | null;
	statusTaggingTypeId: number | null;
	statusId: number;
};
