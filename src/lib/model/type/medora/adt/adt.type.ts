/** UI / API shapes for ADT module (not Drizzle schema). */
import type { CareSettingEnum } from '$lib/model/enum/care-setting.enum';
import type { AdtBedOccupancySource } from '$lib/model/type/medora/ipd/ipd.type';

export type AdtBedStatusRow = {
	id: number;
	name: string | null;
	code: string | null;
	bedStatus: number;
	/** Care setting of the bed (IPD / ED / ICU / OT). */
	careSetting: CareSettingEnum;
	wardId: number | null;
	wardName: string | null;
	roomId: number;
	roomName: string | null;
	dailyTariff?: string | null;
	/** Occupying record, when occupied. */
	occupancySource: AdtBedOccupancySource | null;
	/** IPD admission id (IPD / ICU / OT beds). */
	admissionId?: number | null;
	/** ED encounter id (ED beds). */
	encounterId?: number | null;
	/** Active surgical case id (OT rooms in use). */
	surgicalCaseId?: number | null;
	visitId?: string | null;
	visitNo?: string | null;
	patientName?: string | null;
	/** ED only: patient discharged but the bed is held. */
	dischargedInBed?: boolean;
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
