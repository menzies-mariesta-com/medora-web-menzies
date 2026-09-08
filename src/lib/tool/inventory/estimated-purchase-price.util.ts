import type { GrnCostContext } from '$lib/model/type/medora/sale-price-formula.type';
import {
	computeGrnCostPerUnit,
	ESTIMATED_PURCHASE_LANDED_COST_FLAGS
} from '$lib/tool/inventory/grn-pricing.util';
import { purchaseUnitPriceToIssueUnitPriceNumber } from '$lib/tool/inventory/purchase-issue-price-convert.util';

/** Landed GRN cost per issue (stock) unit for stock lot display. */
export function computeEstimatedPurchasePricePerIssueUnit(
	grnCostContext: GrnCostContext,
	purchaseConversionFactor: string | number,
	issueConversionFactor: string | number
): number | null {
	const costPerPurchaseUnit = computeGrnCostPerUnit(
		ESTIMATED_PURCHASE_LANDED_COST_FLAGS,
		grnCostContext
	);
	if (!Number.isFinite(costPerPurchaseUnit) || costPerPurchaseUnit <= 0) {
		return null;
	}
	return purchaseUnitPriceToIssueUnitPriceNumber(
		costPerPurchaseUnit,
		purchaseConversionFactor,
		issueConversionFactor
	);
}
