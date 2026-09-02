import type { InvPricingModuleCode } from '$lib/model/type/heka/inv-pricing-module.type';
import type {
	CostBasisFlags,
	PricingFormulaTemplateDto
} from '$lib/model/type/heka/pricing-formula-template.type';

export type GrnLineCostInput = {
	purchasedQty: number;
	/** Raw `free_qty` on the GRN line (in `free_unit_id`). */
	freeQty: number;
	/** Free qty converted to line purchase unit (pricing denominator). */
	freeQtyPurchaseUnit: number;
	purchaseUnitPrice: number;
	discountAmount: number;
	discountPercent: number;
	taxAmount: number;
	taxPercent: number;
};

/** GRN header (invoice) discount/tax — allocated across lines at sale time. */
export type GrnInvoiceCostInput = {
	discountAmount: number;
	discountPercent: number;
	taxAmount: number;
	taxPercent: number;
};

export type GrnCostContext = {
	lines: GrnLineCostInput[];
	invoice: GrnInvoiceCostInput;
	targetLineIndex: number;
};

export type SalePriceFormulaInput = {
	module: InvPricingModuleCode;
	branchId: string;
	storeId: number;
	itemId: number;
	batchId: number;
	grnLine: GrnLineCostInput;
	/** All GRN lines + invoice charges for header allocation. Omit for line-only fallback. */
	grnCostContext?: GrnCostContext;
	itemMarkupPercent: string;
	storeMarkupPercent: string;
	template: PricingFormulaTemplateDto;
};

export type SalePriceFormulaResult = {
	/** Per purchase unit (before issue-unit conversion). */
	unitPricePurchase: string;
};

export type SalePriceFormulaIssueResult = {
	unitSalePriceIssue: string;
	unitEmpSalePriceIssue: string;
	/** Per purchase unit (medication order line totals use purchase qty). */
	unitSalePricePurchase: string;
	unitEmpSalePricePurchase: string;
};

export type SalePriceMarkupPercents = {
	msl: number;
	item: number;
	store: number;
};

export type { CostBasisFlags };
