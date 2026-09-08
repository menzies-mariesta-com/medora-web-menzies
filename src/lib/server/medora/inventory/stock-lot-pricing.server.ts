import type { InventoryStockLotDto } from '$lib/model/type/medora/inventory-stock-lot.type';
import type { GrnCostContext } from '$lib/model/type/medora/sale-price-formula.type';
import { computeEstimatedPurchasePricePerIssueUnit } from '$lib/tool/inventory/estimated-purchase-price.util';
import { loadGrnCostContextForLine } from './grn-cost-context.server';
import { resolveItemUnitMasterForItemPurchaseUnit } from './item-unit-inventory.server';

type StockLotEstimatedCostInput = {
	goodsReceiptLineId: number | null;
	itemId: number;
	purchaseUnitId: number | null;
};

/** Landed GRN cost per issue unit for stock lot display (no sale pricing template). */
export async function enrichStockLotEstimatedCost(
	hospitalId: string,
	rows: StockLotEstimatedCostInput[]
): Promise<Pick<InventoryStockLotDto, 'estimatedPurchasePrice'>[]> {
	const contextCache = new Map<number, GrnCostContext>();
	const iumCache = new Map<
		string,
		Awaited<ReturnType<typeof resolveItemUnitMasterForItemPurchaseUnit>>
	>();

	return Promise.all(
		rows.map(async (row) => {
			const grnLineId = row.goodsReceiptLineId;
			const purchaseUnitId = row.purchaseUnitId;
			if (grnLineId == null || purchaseUnitId == null) {
				return { estimatedPurchasePrice: null };
			}

			let grnCostContext = contextCache.get(grnLineId);
			if (!grnCostContext) {
				try {
					grnCostContext = await loadGrnCostContextForLine({
						hospitalId,
						goodsReceiptLineId: grnLineId
					});
					contextCache.set(grnLineId, grnCostContext);
				} catch {
					return { estimatedPurchasePrice: null };
				}
			}

			const iumKey = `${row.itemId}:${purchaseUnitId}`;
			let iumRow = iumCache.get(iumKey);
			if (!iumRow) {
				try {
					iumRow = await resolveItemUnitMasterForItemPurchaseUnit({
						hospitalId,
						itemId: row.itemId,
						purchaseUnitId
					});
					iumCache.set(iumKey, iumRow);
				} catch {
					return { estimatedPurchasePrice: null };
				}
			}

			const costIssue = computeEstimatedPurchasePricePerIssueUnit(
				grnCostContext,
				iumRow.ium.purchaseConversionFactor,
				iumRow.ium.issueConversionFactor
			);
			if (costIssue == null) {
				return { estimatedPurchasePrice: null };
			}

			return { estimatedPurchasePrice: costIssue.toFixed(2) };
		})
	);
}
