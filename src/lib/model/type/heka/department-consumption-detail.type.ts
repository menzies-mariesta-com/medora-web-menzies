/** Draft line while editing consumption (UI ↔ modal). */
export type ConsumptionDraftLine = {
	key: string;
	itemSearch: string;
	hits: { id: number; itemName: string | null }[];
	itemId: number | null;
	itemLabel: string;
	quantity: string;
	iumList: {
		id: number;
		conversionDisplay: string;
		purchaseUnitId: number;
		issueUnitId: number;
	}[];
	itemUnitMasterId: number | null;
	batchId: number | null;
	batchOptions: { value: number; label: string; qty: string }[];
};

/** Line row on GET `/inventory/department-consumption?id=` */
export type DepartmentConsumptionDetailLine = {
	id: number;
	consumptionId: string;
	itemId: number;
	quantity: string;
	unitId: number;
	batchId: number;
	remarks: string | null;
	itemName?: string | null;
	unitName?: string | null;
	batchNo?: string | null;
	expiryDate?: string | null;
	itemUnitMasterId?: number | null;
	itemUnitMasterConversion?: string | null;
};
