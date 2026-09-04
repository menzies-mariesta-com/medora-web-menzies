import type { PaginatedResult } from '$lib/model/type/pagination.type';
import type { ConsumptionBatchAllocationDraft } from '$lib/model/type/heka/department-consumption-detail.type';
import type { ConsumptionDraftLineIum } from '$lib/model/type/heka/department-consumption-detail.type';

export type MedicationOrderLineAllocationInput = {
	batchId: number;
	qtyPurchase: string;
};

export type MedicationOrderLineInput = {
	itemMasterId: number;
	dose: string;
	doseUnitId: number;
	frequencyId: number;
	durationValue: string;
	durationUnitId: number;
	formId: number | null;
	routeId: number | null;
	orderTypeId: number | null;
	foodRelationId: number | null;
	startAt: string;
	testDose: string | null;
	substituteNotAllowed: boolean;
	unitSalePrice: string;
	qtyOut: string;
	outUnitId: number;
	itemUnitMasterId: number;
	allocations: MedicationOrderLineAllocationInput[];
};

export type MedicationOrderBatchSaveResponse = {
	batch: {
		id: number;
		batchNo: string;
		visitId: number | null;
		storeId: number;
	};
	batchNo: string;
};

export type MedicationOrderMastersResponse = {
	forms: { id: number; name: string | null }[];
	routes: { id: number; name: string | null }[];
	orderTypes: { id: number; name: string | null }[];
	doseUnits: { id: number; name: string | null }[];
	foodRels: { id: number; name: string | null }[];
	durUnits: { id: number; code: string; name: string | null }[];
	freqs: {
		id: number;
		label: string | null;
		summaryText: string | null;
	}[];
};

export type StoreSearchRow = { id: number; storeName: string | null };

/** `batch.list` by visit: batch row + joined user display names and line count. */
export type MedicationOrderBatchHistoryRow = {
	id: number;
	hospitalId: string;
	visitId: number | null;
	visitNo: string | null;
	storeId: number;
	extCustomerName: string | null;
	advisingDoctor: string | null;
	batchNo: string;
	createdAt: string;
	updatedAt: string;
	createdBy: string | null;
	updatedBy: string | null;
	createdByName: string | null;
	updatedByName: string | null;
	lineCount: number;
};

export type ItemNamePriceRow = {
	id: number;
	itemName: string | null;
	displayPrice: string | null;
	/** On-hand at store in issue (stock) unit. */
	stockIssueQty: string | null;
	issueUnitName: string | null;
};

export type MedOrderSetupEntity =
	| 'form'
	| 'route'
	| 'order-type'
	| 'dose-unit'
	| 'food-relation'
	| 'duration'
	| 'frequency';

export type MedOrderMasterListResult = PaginatedResult<
	Record<string, unknown>
>;

export type MedicationOrderLineAllocationRow = {
	lineId: number;
	batchId: number;
	qtyPurchase: string;
	batchNo: string | null;
	expiryDate: string | null;
};

export type MedicationOrderBatchPaymentRow = {
	id: number;
	batchId: number;
	paymentMethod: string;
	amountDue: string;
	amountPaid: string;
	paidAt: string;
	receiptNo: string;
};

export type MedicationOrderBatchDetailResponse = {
	batch: Record<string, unknown>;
	lines: Record<string, unknown>[];
	allocations: MedicationOrderLineAllocationRow[];
	payment: MedicationOrderBatchPaymentRow | null;
};

export type MedicationOrderCheckoutResponse = {
	receiptNo: string;
	amountDue: string;
	amountPaid: string;
	paymentMethod: string;
	paidAt: string;
	batch: {
		id: number;
		batchNo: string;
		extCustomerName: string | null;
		advisingDoctor: string | null;
		storeId: number;
	};
	lines: Array<{
		itemName: string | null;
		qtyOut: string;
		unitSalePrice: string;
		lineTotal: string;
	}>;
};

/** UI draft line extensions for sale workspace */
export type MedicationOrderDraftLineExtras = {
	iumList: ConsumptionDraftLineIum[];
	batchAllocations: ConsumptionBatchAllocationDraft[];
	unitSalePrice: string;
	qtyOut: string;
	outUnitId: number | null;
	itemUnitMasterId: number | null;
};
