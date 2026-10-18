export type SurgicalCaseListRow = {
	id: number;
	hospitalId: string;
	branchId: string;
	patientId: string;
	visitId: string;
	procedureName: string;
	caseType: string;
	priority: string;
	statusTaggingId: number;
	otRoomId: number | null;
	otRoomName: string | null;
	scheduledStart: string | null;
	scheduledEnd: string | null;
	actualStart: string | null;
	actualEnd: string | null;
	preOpCompleteAt: string | null;
	patientName?: string | null;
	visitNo?: string | null;
};

export type OtRoomRow = {
	id: number;
	hospitalId: string;
	branchId: string;
	name: string;
	sequenceNo: number;
	statusId: number;
};

export type SurgicalCaseImplantRow = {
	id: number;
	surgicalCaseId: number;
	itemBatchId: number | null;
	udiRaw: string | null;
	quantity: string;
	batchNo?: string | null;
};
