export type OtBookingStatus = {
	id: number;
	name: string;
	code: string;
};

export type OtMasterRow = {
	id: number;
	hospitalId: string;
	branchId: string;
	name: string;
	sequenceNo: number;
	freezeMinutes: number;
	otAdvanceMandatory: boolean;
	statusId: number;
	branchName: string | null;
};

export type OtRequestRow = {
	id: number;
	hospitalId: string;
	branchId: string;
	patientId: string;
	visitId: string;
	admissionId: number | null;
	hrn: string | null;
	encounterNo: string | null;
	ipNo: string | null;
	patientName: string;
	ageGender: string;
	dateOfBirth: string | null;
	mobileNo: string | null;
	patientCode: string | null;
	surgeonId: string | null;
	surgeonName: string | null;
	paediatricianId: string | null;
	paediatricianName: string | null;
	providerId: string | null;
	providerName: string | null;
	procedureName: string;
	serviceName: string | null;
	provisionalDiagnosis: string | null;
	otRequestDate: string | null;
	durationMinutes: number | null;
	scheduledStart: string | null;
	scheduledEnd: string | null;
	otRoomId: number | null;
	otRoomName: string | null;
	statusTaggingId: number;
	statusName: string | null;
	statusCode: string | null;
	bookingNo: string | null;
	priority: string;
	caseType: string;
	createdAt: string;
};

export type OtSchedulerRoom = {
	id: number;
	name: string;
	freezeMinutes: number;
	otAdvanceMandatory: boolean;
};

export type OtSchedulerBooking = {
	id: number;
	bookingNo: string | null;
	patientName: string;
	hrn: string | null;
	visitNo: string | null;
	otRoomId: number;
	otRoomName: string | null;
	scheduledStart: string;
	scheduledEnd: string;
	statusTaggingId: number;
	statusName: string | null;
	statusCode: string | null;
	procedureName: string;
	surgeonName: string | null;
	specialtyName: string | null;
	priority: string;
};

export type OtSchedulerResult = {
	date: string;
	rooms: OtSchedulerRoom[];
	bookings: OtSchedulerBooking[];
};

export type OtBookingRow = {
	id: number;
	bookingNo: string | null;
	otRoomId: number | null;
	theatreName: string | null;
	scheduledStart: string | null;
	scheduledEnd: string | null;
	hrn: string | null;
	ipNo: string | null;
	visitNo: string | null;
	patientId: string;
	visitId: string;
	patientName: string;
	ageGender: string;
	wardName: string | null;
	bedNo: string | null;
	admittingDoctorName: string | null;
	procedureName: string;
	statusTaggingId: number;
	statusName: string | null;
	statusCode: string | null;
	surgeonId: string | null;
	surgeonName: string | null;
	providerId: string | null;
	providerName: string | null;
	paediatricianId: string | null;
	paediatricianName: string | null;
	provisionalDiagnosis: string | null;
	durationMinutes: number | null;
	clinicalNotes: string | null;
	priority: string;
	branchId: string;
	branchName: string | null;
	admissionId: number | null;
};

export type OtHandoffStage =
	| 'from_ward'
	| 'pre_op'
	| 'in_ot'
	| 'post_op';

export type OtHandoffRow = {
	id: number;
	bookingNo: string | null;
	theatreName: string | null;
	hrn: string | null;
	encounterNo: string | null;
	patientName: string;
	ageGender: string;
	dateOfBirth: string | null;
	bedNo: string | null;
	wardName: string | null;
	wardRemarks: string | null;
	wardToOtByName: string | null;
	wardToOtAt: string | null;
	otDate: string | null;
	preOpAcknowledgedAt: string | null;
	inOtAt: string | null;
	postOpAt: string | null;
	returnedToWardAt: string | null;
	statusTaggingId: number;
	statusName: string | null;
	statusCode: string | null;
	admissionId: number | null;
	surgicalCaseId: number;
};

export type OtReportRow = {
	id: number;
	bookingNo: string | null;
	otDate: string | null;
	theatreName: string | null;
	facilityName: string | null;
	hrn: string | null;
	patientName: string;
	surgeonName: string | null;
	serviceName: string | null;
	statusName: string | null;
	statusCode: string | null;
	startTime: string | null;
	endTime: string | null;
	priority: string;
};

export type OtBloodRequisitionRow = {
	id: number;
	surgicalCaseId: number;
	bloodGroup: string | null;
	component: string;
	units: number;
	urgency: string;
	notes: string | null;
	requestedAt: string;
	requestedByName: string | null;
};

export type OtOption = {
	id: string;
	name: string;
	specialty?: string | null;
};

export type OtNumberOption = { id: number; name: string };

export type OtOptions = {
	branches: OtOption[];
	rooms: OtMasterRow[];
	surgeons: OtOption[];
	services: OtNumberOption[];
	genders: OtNumberOption[];
	statuses: OtBookingStatus[];
	currentStaffId: string | null;
};

export type OtCaseSheetCase = {
	id: number;
	bookingNo: string | null;
	procedureName: string;
	serviceName: string | null;
	otDate: string | null;
	scheduledStart: string | null;
	scheduledEnd: string | null;
	actualStart: string | null;
	actualEnd: string | null;
	theatreName: string | null;
	surgeonName: string | null;
	providerName: string | null;
	paediatricianName: string | null;
	priority: string;
	statusTaggingId: number;
	statusName: string | null;
	statusCode: string | null;
	wardName: string | null;
	bedNo: string | null;
	wardRemarks: string | null;
	provisionalDiagnosis: string | null;
	clinicalNotes: string | null;
	wardToOtAt: string | null;
	preOpAcknowledgedAt: string | null;
	inOtAt: string | null;
	postOpAt: string | null;
	returnedToWardAt: string | null;
	procedureSignedAt: string | null;
	procedureSignedByName: string | null;
	procedureNote: Record<string, unknown> | null;
};

export type OtCaseSheet = {
	visitId: string;
	visitNo: string | null;
	patientId: string;
	hrn: string | null;
	patientName: string;
	ageGender: string;
	dateOfBirth: string | null;
	mobileNo: string | null;
	address: string | null;
	branchName: string | null;
	admissionId: number | null;
	admissionNo: string | null;
	admittedAt: string | null;
	dischargedAt: string | null;
	wardName: string | null;
	bedNo: string | null;
	attendingDoctorName: string | null;
	visitDate: string | null;
	visitStatus: string | null;
	cases: OtCaseSheetCase[];
	bloodRequisitions: OtBloodRequisitionRow[];
	bill: OtBillingSummary | null;
};

export type OtBillingLine = {
	id: number;
	surgicalCaseId: number | null;
	serviceId: number | null;
	serviceName: string | null;
	serviceAmount: string;
	serviceTaxAmount: string;
	quantity: number;
	lineTotal: string;
};

export type OtBillingSummary = {
	id: number;
	billNo: string | null;
	linesSubtotal: string;
	discountTypeId: number;
	discountPercent: string | null;
	discountAmount: string;
	totalAmount: string;
	statusTaggingId: number;
	statusName: string | null;
	transferredAt: string | null;
	closedAt: string | null;
};

export type OtBillingCase = OtCaseSheetCase & {
	serviceId: number | null;
	serviceAmount: string;
	alreadyBilled: boolean;
};

export type OtBillingContext = {
	visitId: string;
	visitNo: string | null;
	patientName: string;
	hrn: string | null;
	ageGender: string;
	branchName: string | null;
	admissionId: number | null;
	admissionNo: string | null;
	admittedAt: string | null;
	dischargedAt: string | null;
	wardName: string | null;
	bedNo: string | null;
	cases: OtBillingCase[];
	bill: OtBillingSummary | null;
	lines: OtBillingLine[];
	canTransfer: boolean;
	canClose: boolean;
	canDischarge: boolean;
	blockReasons: string[];
};
