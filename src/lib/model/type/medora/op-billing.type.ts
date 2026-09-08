/** GET `/api/medora/hospital/{id}/home/billing/op-billing/visit-lines` */

export type OpBillingCloseBlockReason =
	| 'nursing_incomplete'
	| 'no_billable_lines'
	| 'already_closed'
	| null;

export type OpBillingReadiness = {
	totalServiceLines: number;
	nursingIncompleteCount: number;
	nursingCompleteCount: number;
	medicationLineCount: number;
	pendingBillLineCount: number;
	canCloseBill: boolean;
	blockReasonKey: OpBillingCloseBlockReason;
};

export type OpBillingVisitSummary = {
	id: number;
	visitNo: string;
	hospitalName: string | null;
	branchName: string | null;
	patientName: string | null;
	patientCode: string | null;
	visitDateIso: string | null;
	doctorName: string | null;
};

export type OpBillingStaffSummary = {
	id?: number | string | null;
	userId?: number | string | null;
	title?: { name?: string | null } | null;
	firstName?: string | null;
	middleName?: string | null;
	lastName?: string | null;
};

export type OpBillingMeta = {
	discountTypeId?: number | null;
	discountPercent?: number | string | null;
	discountAmount?: number | string | null;
	linesSubtotal?: number | string | null;
	totalAmount?: number | string | null;
	discountedByStaff?: OpBillingStaffSummary | null;
	discountedAt?: string | null;
	printedByStaff?: OpBillingStaffSummary | null;
	printedAt?: string | null;
};

export type OpBillingLine = {
	id: number;
	lineSource?: 'service_order_detail' | 'medication_order_line';
	serviceId: number;
	serviceName: string | null;
	orderNo: string | null;
	subCategoryId: number | null;
	subCategoryName: string | null;
	serviceAmount: string | number | null;
	serviceTaxAmount: string | number | null;
	discount: string | number | null;
	serviceUnit: number | null;
};

export type OpBillingVisitLinesGetResponse = {
	items: OpBillingLine[];
	visit: OpBillingVisitSummary | null;
	billing: OpBillingMeta | null;
	readiness: OpBillingReadiness | null;
	error?: string;
};
