import type { BillingVisitOpenModeEnum } from '$lib/model/enum/billing-visit-open-mode.enum';

export type PatientOpenBillRow = {
	visitId: string;
	visitNo: string | null;
	visitTypeId: number | null;
	billKind: 'op' | 'ip';
	billId: number;
	billNo: string | null;
	/** Open draft payable (total after discount, or lines subtotal when total is zero). */
	draftTotal: string;
};

export type BillingBillContextResponse = {
	visitOpenMode: BillingVisitOpenModeEnum;
	patientId: string | null;
	openBills: PatientOpenBillRow[];
	/** Sum of `draftTotal` across open bills. */
	openBillsGrandTotal: string;
	suggestedVisitId: string | null;
};

export type HospitalBillingSettingResponse = {
	visitOpenMode: BillingVisitOpenModeEnum;
};
