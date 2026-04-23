import type { PaginatedResult } from '$lib/model/type/pagination.type';

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
};

export type MedicationOrderBatchSaveResponse = {
	batch: { id: number; batchNo: string; visitId: number; storeId: number };
	batchNo: string;
};

export type MedicationOrderMastersResponse = {
	forms: { id: number; name: string | null }[];
	routes: { id: number; name: string | null }[];
	orderTypes: { id: number; name: string | null }[];
	doseUnits: { id: number; name: string | null }[];
	foodRels: { id: number; name: string | null }[];
	durUnits: { id: number; code: string; name: string | null }[];
	freqs: { id: number; label: string | null; summaryText: string | null }[];
};

export type StoreSearchRow = { id: number; storeName: string | null };

export type ItemNamePriceRow = {
	id: number;
	itemName: string | null;
	displayPrice: string | null;
};

export type MedOrderSetupEntity =
	| 'form'
	| 'route'
	| 'order-type'
	| 'dose-unit'
	| 'food-relation'
	| 'duration'
	| 'frequency';

export type MedOrderMasterListResult = PaginatedResult<Record<string, unknown>>;
