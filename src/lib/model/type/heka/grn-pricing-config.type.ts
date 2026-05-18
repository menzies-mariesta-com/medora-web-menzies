/** Per-unit cost rule flags (sale or employee). */
export type GrnPriceRuleFlags = {
	includeDiscount: boolean;
	includeTax: boolean;
	includeFreeQtyInDenominator: boolean;
	markupPercent: string;
};

export type BranchPricingConfigDto = {
	hospitalId: string;
	branchId: string;
	saleManualOnGrnLine: boolean;
	saleIncludeDiscount: boolean;
	saleIncludeTax: boolean;
	saleIncludeFreeQty: boolean;
	saleMarkupPercent: string;
	empManualOnGrnLine: boolean;
	empIncludeDiscount: boolean;
	empIncludeTax: boolean;
	empIncludeFreeQty: boolean;
	empMarkupPercent: string;
	empUsePercentOfSale: boolean;
	empPercentOfSale: string;
};

export type GrnLinePriceInput = {
	receivedQty: number;
	freeQty: number;
	purchaseUnitPrice: number;
	discountAmount: number;
	discountPercent: number;
	taxAmount: number;
	taxPercent: number;
	salePriceOverride?: string | null;
	empSalePriceOverride?: string | null;
};

export type GrnLinePriceResult = {
	salePerPurch: string;
	empPerPurch: string;
	discountTotal: string;
	taxTotal: string;
};
