/** One cell in the shared “Add / edit line item” metrics strip (PR / PO / indent / issue). */
export type LineItemMetricTile = {
	label: string;
	value: string;
	/**
	 * `value` is already an **issue**-unit total (e.g. store stock from DB). Show trimmed number
	 * plus the draft line’s selected conversion’s **issue** unit name when available.
	 */
	appendSelectedIssueUnitToValue?: boolean;
	/**
	 * `value` is a **purchase**-unit qty for the draft’s selected conversion. Convert to issue qty
	 * using `purchaseConversionFactor` / `issueConversionFactor` (same rule as server) and show
	 * with the issue unit name.
	 */
	convertPurchaseQtyToIssueForDisplay?: boolean;
};

/** Builds the five PR/PO item-metrics tiles (labels supplied by caller for i18n). */
export function tilesFromPrItemMetricsRow(
	row: {
		storeStockIssueQty: string;
		globalStockIssueQty: string;
		pendingPrPurchaseQty: string;
		pendingPoPurchaseQty: string;
	},
	currentPrPurchaseQty: string,
	labels: {
		store: string;
		global: string;
		pendingPr: string;
		pendingPo: string;
		current: string;
	}
): LineItemMetricTile[] {
	return [
		{
			label: labels.store,
			value: row.storeStockIssueQty,
			appendSelectedIssueUnitToValue: true
		},
		{
			label: labels.global,
			value: row.globalStockIssueQty,
			appendSelectedIssueUnitToValue: true
		},
		{
			label: labels.pendingPr,
			value: row.pendingPrPurchaseQty,
			convertPurchaseQtyToIssueForDisplay: true
		},
		{
			label: labels.pendingPo,
			value: row.pendingPoPurchaseQty,
			convertPurchaseQtyToIssueForDisplay: true
		},
		{
			label: labels.current,
			value: currentPrPurchaseQty,
			convertPurchaseQtyToIssueForDisplay: true
		}
	];
}
