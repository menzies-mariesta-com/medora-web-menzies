/** Per-batch row while drafting consumption (purchase qty per batch). */
export type ConsumptionBatchAllocationDraft = {
	batchId: number;
	batchNo: string;
	expiryDate: string | null;
	/** `inv_stock.quantity` in issue/stock unit */
	stockIssueQty: string;
	salePrice: string | null;
	issueUnitName: string | null;
	/** User-entered qty in purchase unit for this batch */
	qtyPurchase: string;
};

/** Item unit master row shape from item-master API (subset used on draft lines). */
export type ConsumptionDraftLineIum = {
	id: number;
	conversionDisplay: string;
	purchaseUnitId: number;
	issueUnitId: number;
	purchaseUnitName: string;
	issueUnitName: string;
	purchaseConversionFactor: string;
	issueConversionFactor: string;
};

/** Draft line while editing consumption (UI ↔ modal). */
export type ConsumptionDraftLine = {
	key: string;
	itemSearch: string;
	hits: { id: number; itemName: string | null }[];
	itemId: number | null;
	itemLabel: string;
	iumList: ConsumptionDraftLineIum[];
	itemUnitMasterId: number | null;
	batchAllocations: ConsumptionBatchAllocationDraft[];
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
