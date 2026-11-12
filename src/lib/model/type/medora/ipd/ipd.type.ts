/** UI / API shapes for IPD ADT (not Drizzle schema). */

export type WardCategoryRow = {
	id: number;
	hospitalId: string;
	name: string;
	code: string | null;
	wardMarkup: string;
	isEr?: boolean;
	statusId: number;
};

export type RoomCategoryRow = {
	id: number;
	hospitalId: string;
	name: string;
	code: string | null;
	roomMarkup: string;
	isEr?: boolean;
	statusId: number;
};

export type WardRow = {
	id: number;
	hospitalId: string;
	branchId: string;
	wardCategoryId: number;
	name: string;
	code: string | null;
	isEr?: boolean;
	statusId: number;
	branchName?: string | null;
	wardCategoryName?: string | null;
	wardMarkup?: string | null;
};

export type RoomRow = {
	id: number;
	hospitalId: string;
	wardId: number;
	roomCategoryId: number;
	name: string;
	code: string | null;
	capacity: number;
	amenities: string | null;
	isEr?: boolean;
	statusId: number;
	wardName?: string | null;
	wardCode?: string | null;
	roomCategoryName?: string | null;
	roomMarkup?: string | null;
	bedCount?: number;
};

export type BedRow = {
	id: number;
	roomId: number;
	hospitalId: string;
	name: string;
	code: string | null;
	basePrice: string;
	basePriceUnitId?: number | null;
	basePriceUnitName?: string | null;
	timelineDurationDays?: string | null;
	bedStatus: number;
	isEr?: boolean;
	statusId: number;
	roomName?: string | null;
	roomCode?: string | null;
	wardId?: number | null;
	wardName?: string | null;
	wardCode?: string | null;
	/** Auto: (base price × markups) ÷ base price unit duration. */
	dailyTariff?: string | null;
};

export type BedTariffContext = {
	bedId: number;
	roomId: number;
	wardId: number;
	branchId: string;
	bedName: string | null;
	roomName: string | null;
	wardName: string | null;
	bedBasePrice: string;
	/** Room markup percent. */
	roomMarkup: string;
	/** Ward-category markup percent. */
	wardMarkup: string;
	dailyTariff: string;
	basePriceUnitId: number | null;
	basePriceUnitName: string;
	timelineDurationDays: number;
};

export type IpdCensusRow = {
	admissionId: number;
	admissionNo: string | null;
	visitId: string;
	visitNo: string | null;
	patientId: string;
	patientCode: string | null;
	patientName: string;
	branchId: string;
	wardId: number;
	wardName: string | null;
	roomId: number;
	roomName: string | null;
	bedId: number;
	bedName: string | null;
	admittedAt: string;
	admittingDoctorName: string | null;
	admissionStatus: number;
	otHoldLocation: string | null;
	dailyTariff?: string | null;
	/** Prior visit this IPD admission continues from */
	sourceVisitId?: string | null;
	sourceVisitNo?: string | null;
};

/** Unfinished OPD visit eligible as ADT admission source */
export type AdtSourceOpdVisitRow = {
	visitId: string;
	visitNo: string | null;
	hasOpenOpBill: boolean;
};

export type AdmitToIpdPayload = {
	/** Patient to admit — creates a new IPD visit (does not convert an OPD visit). */
	patientId: string;
	/** Preferred: assign by bed only; ward/room resolved from bed. */
	bedId: number;
	/** Optional UI filter; validated against resolved bed context when set. */
	wardId?: number;
	admittingDoctorId?: string | null;
	reasonNotes?: string | null;
	branchId: string;
	/** When admitting from a prior visit (e.g. OPD). */
	sourceVisitId?: string | null;
	/** @deprecated use sourceVisitId */
	sourceOpdVisitId?: string | null;
	/** When fulfilling a doctor admission order. */
	admissionOrderId?: number | null;
};

export type IpdAdmissionOrderRow = {
	id: number;
	hospitalId: string;
	branchId: string;
	sourceVisitId: string;
	sourceVisitNo: string | null;
	patientId: string;
	patientCode: string | null;
	patientName: string;
	orderingDoctorId: string | null;
	orderingDoctorName: string | null;
	careLevel: number;
	urgency: number;
	preferredWardId: number | null;
	preferredWardName: string | null;
	notes: string | null;
	admissionId: number | null;
	statusTaggingId: number;
	createdAt: string;
};

export type CreateIpdAdmissionOrderPayload = {
	sourceVisitId: string;
	/** @deprecated use sourceVisitId */
	sourceOpdVisitId?: string;
	careLevel: number;
	urgency: number;
	preferredWardId?: number | null;
	notes?: string | null;
	orderingDoctorId?: string | null;
	branchId: string;
};

export type IpAdvanceDepositRow = {
	id: number;
	hospitalId: string;
	admissionId: number;
	visitId: string;
	amount: string;
	paymentMethod: string;
	receiptNo: string | null;
	paidAt: string;
	notes: string | null;
	paidByStaffId: string | null;
	paidByStaffName: string | null;
	visitNo: string | null;
	admissionNo: string | null;
	patientName: string | null;
	patientCode: string | null;
};

export type CreateIpAdvanceDepositPayload = {
	admissionId?: number;
	visitId?: string;
	amount: string;
	paymentMethod?: string;
	notes?: string | null;
};

export type TransferBedPayload = {
	admissionId: number;
	toBedId: number;
	/** Optional; validated against resolved destination when set. */
	toWardId?: number;
	remark?: string | null;
	movedByStaffId?: string | null;
};

export type DischargePayload = {
	admissionId: number;
};

export type OtHoldPayload = {
	admissionId: number;
	/** Non-empty location starts hold; null/empty clears hold. */
	otHoldLocation: string | null;
};

export type AccommodationBillingCareSetting = 'IP' | 'ED';

export type AccommodationBillingPolicyRow = {
	id: number;
	hospitalId: string;
	careSetting: AccommodationBillingCareSetting | string;
	leastBillDuration: string | null;
	accommodationServiceItemId: number | null;
	accommodationBillUnitId: number | null;
	statusId: number;
};

/** @deprecated Use {@link AccommodationBillingPolicyRow} */
export type IpdAccommodationBillingPolicyRow = AccommodationBillingPolicyRow;

export type AccommodationChargeLine = {
	segmentId: number;
	label: string;
	/** Billable day-equivalents from accommodation policy. */
	days: number;
	dailyTariff: string;
	amount: string;
	bedBasePrice: string;
	roomMarkup: string;
	wardMarkup: string;
	startedAt: string;
	endedAt: string;
	basePriceUnitLabel: string;
	/** Qty on bill line (days ÷ timeline duration). */
	billableUnits: number;
	/** Unit price on bill line (daily tariff × timeline duration). */
	unitPrice: string;
	actualHours?: number;
	billableHours?: number;
};
