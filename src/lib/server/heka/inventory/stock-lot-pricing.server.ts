import type { InvPricingModuleCode } from '$lib/model/type/heka/inv-pricing-module.type';
import type { InventoryStockLotDto } from '$lib/model/type/heka/inventory-stock-lot.type';
import type { GrnCostContext } from '$lib/model/type/heka/sale-price-formula.type';
import type { PricingFormulaTemplateDto } from '$lib/model/type/heka/pricing-formula-template.type';
import { computeFormulaCostPerPurchaseUnit } from '$lib/tool/inventory/sale-price-calculator.util';
import { loadGrnCostContextForLine } from './grn-cost-context.server';
import { resolveTemplateForSaleDb } from './sale-price.server';

type StockLotEstimatedCostInput = {
	branchId: string;
	goodsReceiptLineId: number | null;
	purchaseUnitName: string | null;
};

const DEFAULT_STOCK_LOT_PRICING_MODULE: InvPricingModuleCode = 'MO';

/** Formula landed cost per purchase unit (no markups) for stock lot display. */
export async function enrichStockLotEstimatedCost(
	hospitalId: string,
	rows: StockLotEstimatedCostInput[],
	module: InvPricingModuleCode = DEFAULT_STOCK_LOT_PRICING_MODULE
): Promise<
	Pick<
		InventoryStockLotDto,
		'estimatedPurchasePrice' | 'purchaseUnitName'
	>[]
> {
	const templateCache = new Map<string, PricingFormulaTemplateDto>();
	const contextCache = new Map<number, GrnCostContext>();

	return Promise.all(
		rows.map(async (row) => {
			const purchaseUnitName = row.purchaseUnitName;
			const grnLineId = row.goodsReceiptLineId;
			if (grnLineId == null) {
				return { estimatedPurchasePrice: null, purchaseUnitName };
			}

			let template = templateCache.get(row.branchId);
			if (!template) {
				try {
					template = await resolveTemplateForSaleDb({
						hospitalId,
						branchId: row.branchId,
						module
					});
					templateCache.set(row.branchId, template);
				} catch {
					return { estimatedPurchasePrice: null, purchaseUnitName };
				}
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
					return { estimatedPurchasePrice: null, purchaseUnitName };
				}
			}

			const grnLine =
				grnCostContext.lines[grnCostContext.targetLineIndex];
			if (!grnLine) {
				return { estimatedPurchasePrice: null, purchaseUnitName };
			}

			const cost = computeFormulaCostPerPurchaseUnit(
				template,
				grnLine,
				grnCostContext
			);
			if (!Number.isFinite(cost) || cost <= 0) {
				return { estimatedPurchasePrice: null, purchaseUnitName };
			}

			return {
				estimatedPurchasePrice: cost.toFixed(2),
				purchaseUnitName
			};
		})
	);
}
