/** UI / API shapes for ADT module (not Drizzle schema). */

export type AdtBedStatusRow = {
	id: number;
	name: string | null;
	code: string | null;
	bedStatus: number;
	wardId: number | null;
	wardName: string | null;
	roomId: number;
	roomName: string | null;
	dailyTariff?: string | null;
	/** When occupied — active admission if any */
	admissionId?: number | null;
	visitId?: number | null;
	patientName?: string | null;
};

export type AdtBookingRow = {
	id: number;
	hospitalId: string;
	branchId: string;
	patientId: string | null;
	patientTitleId: number | null;
	patientName: string | null;
	patientDateOfBirth: string | null;
	patientAgeYear: number | null;
	patientAgeMonth: number | null;
	patientAgeDay: number | null;
	phone: string | null;
	email: string | null;
	preferredWardId: number | null;
	preferredBedId: number | null;
	preferredWardName?: string | null;
	preferredBedName?: string | null;
	expectedAdmitAt: string | null;
	admittingDoctorId: string | null;
	remark: string | null;
	statusTaggingId: number;
	statusId: number;
};

export type AdtBookingCreatePayload = {
	branchId: string;
	patientId?: string | null;
	patientTitleId?: number | null;
	patientName?: string | null;
	patientDateOfBirth?: string | null;
	patientAgeYear?: number | null;
	patientAgeMonth?: number | null;
	patientAgeDay?: number | null;
	phone?: string | null;
	email?: string | null;
	preferredWardId?: number | null;
	preferredBedId?: number | null;
	expectedAdmitAt?: string | null;
	admittingDoctorId?: string | null;
	remark?: string | null;
	statusTaggingId?: number | null;
};

export type AdtTransferReqRow = {
	id: number;
	hospitalId: string;
	admissionId: number;
	admissionNo: string | null;
	patientName: string | null;
	fromBedId: number;
	fromBedName: string | null;
	toBedId: number | null;
	toBedName: string | null;
	toWardId: number | null;
	toWardName: string | null;
	requestedByStaffId: string | null;
	remark: string | null;
	statusTaggingId: number;
	statusId: number;
};

export type AdtTransferReqCreatePayload = {
	admissionId: number;
	fromBedId: number;
	toBedId?: number | null;
	toWardId?: number | null;
	remark?: string | null;
	statusTaggingId?: number | null;
};
