import type { InvPricingModuleCode } from '$lib/model/type/medora/inv-pricing-module.type';

/** Markups and template revision frozen at charge time (replay inputs). */
export type PatientChargePricingInputsSnapshot = {
	formulaVersion: number;
	itemMarkupPercent: string;
	storeMarkupPercent: string;
	mslMarkupPercent: string;
};

export type PatientChargePricingSnapshotFields = {
	pricingFormulaTemplateId: number | null;
	pricingModule: InvPricingModuleCode | null;
	pricingBatchId: number | null;
	unitSalePriceIssue: string | null;
	pricingInputsSnapshot: PatientChargePricingInputsSnapshot | null;
};

export type SalePriceAtTransactionResult = {
	unitSalePriceIssue: string;
	unitEmpSalePriceIssue: string;
	unitSalePricePurchase: string;
	unitEmpSalePricePurchase: string;
	templateId: number;
	pricingModule: InvPricingModuleCode;
	pricingBatchId: number;
	pricingInputsSnapshot: PatientChargePricingInputsSnapshot;
	pricingComputedAt: string;
};
