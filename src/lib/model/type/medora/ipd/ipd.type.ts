/** UI / API shapes for IPD ADT (not Drizzle schema). */

export type WardRow = {
	id: number;
	hospitalId: string;
	branchId: string;
	name: string;
	code: string | null;
	statusId: number;
	branchName?: string | null;
};

export type BedRow = {
	id: number;
	wardId: number;
	hospitalId: string;
	name: string;
	code: string | null;
	bedStatus: number;
	statusId: number;
	wardName?: string | null;
	wardCode?: string | null;
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
	bedId: number;
	bedName: string | null;
	admittedAt: string;
	admittingDoctorName: string | null;
	admissionStatus: number;
};

export type AdmitToIpdPayload = {
	visitId: number;
	wardId: number;
	bedId: number;
	admittingDoctorId?: string | null;
	reasonNotes?: string | null;
	branchId: string;
};

export type TransferBedPayload = {
	admissionId: number;
	toWardId: number;
	toBedId: number;
	remark?: string | null;
	movedByStaffId?: string | null;
};

export type DischargePayload = {
	admissionId: number;
};
