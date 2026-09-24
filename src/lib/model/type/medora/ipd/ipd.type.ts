/** UI / API shapes for IPD ADT (not Drizzle schema). */

export type WardCategoryRow = {
	id: number;
	hospitalId: string;
	name: string;
	code: string | null;
	wardMarkup: string;
	statusId: number;
};

export type RoomCategoryRow = {
	id: number;
	hospitalId: string;
	name: string;
	code: string | null;
	roomMarkup: string;
	statusId: number;
};

export type WardRow = {
	id: number;
	hospitalId: string;
	branchId: string;
	wardCategoryId: number;
	name: string;
	code: string | null;
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
	bedStatus: number;
	statusId: number;
	roomName?: string | null;
	roomCode?: string | null;
	wardId?: number | null;
	wardName?: string | null;
	wardCode?: string | null;
	/** Resolved daily tariff: base × (1+room%/100) × (1+ward%/100). */
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
};

export type IpdCensusRow = {
	admissionId: number;
	admissionNo: string | null;
	visitId: number;
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
};

export type AdmitToIpdPayload = {
	visitId: number;
	/** Preferred: assign by bed only; ward/room resolved from bed. */
	bedId: number;
	/** Optional UI filter; validated against resolved bed context when set. */
	wardId?: number;
	admittingDoctorId?: string | null;
	reasonNotes?: string | null;
	branchId: string;
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

export type IpdAccommodationBillingPolicyRow = {
	id: number;
	hospitalId: string;
	billingMethod: number;
	graceMinutes: number;
	minimumDays: string | null;
	cutoffTime: string;
	accommodationServiceItemId: number | null;
	statusId: number;
};

export type AccommodationChargeLine = {
	segmentId: number;
	label: string;
	days: number;
	dailyTariff: string;
	amount: string;
	bedBasePrice: string;
	roomMarkup: string;
	wardMarkup: string;
	startedAt: string;
	endedAt: string;
};
