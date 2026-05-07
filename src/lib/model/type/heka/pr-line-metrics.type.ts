/** JSON from `POST .../inventory/purchase-requisition/item-metrics` and PR detail lines */
export type PrLineMetricsRow = {
	itemId: number;
	unitId: number;
	storeStockIssueQty: string;
	globalStockIssueQty: string;
	pendingPrPurchaseQty: string;
	/** PO lines awaiting approval (same hospital + requesting store), PR-backed POs only */
	pendingPoPurchaseQty: string;
	currentPrPurchaseQty: string;
};

export type PrLineMetricsResponse = {
	rows: PrLineMetricsRow[];
};
