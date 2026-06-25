import type { InvPricingModuleCode } from '$lib/model/type/heka/inv-pricing-module.type';

export type PricingFormulaSlot = 'COST' | 'MSL' | 'ITEM' | 'STORE';

export const DEFAULT_PRICING_FORMULA_SLOT_ORDER: PricingFormulaSlot[] = [
	'COST',
	'MSL',
	'ITEM',
	'STORE'
];

export type CostBasisFlags = {
	includeDiscount: boolean;
	includeTax: boolean;
	includeFreeQtyInDenominator: boolean;
};

export type PricingFormulaTemplateDto = {
	id: number;
	hospitalId: string;
	name: string;
	description: string | null;
	formulaVersion: number;
	includeDiscount: boolean;
	includeTax: boolean;
	includeFreeQty: boolean;
	includeItemMarkup: boolean;
	includeStoreMarkup: boolean;
	mslMarkupPercent: string;
	slotOrder: PricingFormulaSlot[];
	isSystemDefault: boolean;
	statusId: number;
};

export type ModulePricingAssignmentDto = {
	id: number;
	hospitalId: string;
	branchId: string;
	module: InvPricingModuleCode;
	formulaTemplateId: number;
};

/** Branch × module row for pricing assignment overview. */
export type ModulePricingAssignmentOverviewRow = {
	hospitalId: string;
	hospitalName: string;
	branchId: string;
	branchName: string;
	module: InvPricingModuleCode;
	assignmentId: number | null;
	formulaTemplateId: number | null;
	formulaTemplateName: string | null;
};

export type PricingFormulaTemplateListRow = PricingFormulaTemplateDto & {
	assignmentCount: number;
};
