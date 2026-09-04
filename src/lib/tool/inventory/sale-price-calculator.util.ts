import type {
	GrnCostContext,
	GrnLineCostInput,
	SalePriceFormulaInput,
	SalePriceFormulaResult,
	SalePriceMarkupPercents
} from '$lib/model/type/heka/sale-price-formula.type';
import {
	DEFAULT_PRICING_FORMULA_SLOT_ORDER,
	type CostBasisFlags,
	type PricingFormulaSlot,
	type PricingFormulaTemplateDto
} from '$lib/model/type/heka/pricing-formula-template.type';
import { computeGrnCostPerUnit, computeCostPerUnit } from '$lib/tool/inventory/grn-pricing.util';

function parsePercent(raw: string | number | null | undefined): number {
	const n = Number(raw ?? 0);
	return Number.isFinite(n) ? n : 0;
}

/** Applies a single formula slot markup on `base`. */
export function applyFormulaSlot(
	base: number,
	slot: PricingFormulaSlot,
	markupPercent: number
): number {
	if (slot === 'COST' || !Number.isFinite(base)) return base;
	if (!Number.isFinite(markupPercent) || markupPercent === 0) return base;
	return base * (1 + markupPercent / 100);
}

function costPerPurchaseUnit(
	flags: CostBasisFlags,
	line: GrnLineCostInput,
	grnCostContext?: GrnCostContext
): number {
	const ruleFlags = {
		includeDiscount: flags.includeDiscount,
		includeTax: flags.includeTax,
		includeFreeQtyInDenominator: flags.includeFreeQtyInDenominator,
		markupPercent: '0'
	};

	if (grnCostContext && grnCostContext.lines.length > 0) {
		return computeGrnCostPerUnit(ruleFlags, {
			lines: grnCostContext.lines,
			invoice: grnCostContext.invoice,
			targetLineIndex: grnCostContext.targetLineIndex
		});
	}

	return computeCostPerUnit(ruleFlags, line);
}

/**
 * Landed cost per purchase unit from template cost flags only (no MSL / item / store markups).
 */
export function computeFormulaCostPerPurchaseUnit(
	template: Pick<
		PricingFormulaTemplateDto,
		'includeDiscount' | 'includeTax' | 'includeFreeQty'
	>,
	grnLine: GrnLineCostInput,
	grnCostContext?: GrnCostContext
): number {
	return costPerPurchaseUnit(
		{
			includeDiscount: template.includeDiscount,
			includeTax: template.includeTax,
			includeFreeQtyInDenominator: template.includeFreeQty
		},
		grnLine,
		grnCostContext
	);
}

function applySlotOrder(
	baseCost: number,
	slotOrder: PricingFormulaSlot[],
	markups: SalePriceMarkupPercents,
	slotFlags: { includeItemMarkup: boolean; includeStoreMarkup: boolean }
): number {
	let value = baseCost;
	for (const slot of slotOrder) {
		if (slot === 'COST') continue;
		if (slot === 'MSL') {
			value = applyFormulaSlot(value, slot, markups.msl);
		} else if (slot === 'ITEM') {
			if (slotFlags.includeItemMarkup) {
				value = applyFormulaSlot(value, slot, markups.item);
			}
		} else if (slot === 'STORE') {
			if (slotFlags.includeStoreMarkup) {
				value = applyFormulaSlot(value, slot, markups.store);
			}
		}
	}
	return value;
}

function normalizeSlotOrder(
	raw: unknown
): PricingFormulaSlot[] {
	if (!Array.isArray(raw) || raw.length === 0) {
		return [...DEFAULT_PRICING_FORMULA_SLOT_ORDER];
	}
	const allowed = new Set<PricingFormulaSlot>([
		'COST',
		'MSL',
		'ITEM',
		'STORE'
	]);
	const out: PricingFormulaSlot[] = [];
	for (const v of raw) {
		if (typeof v === 'string' && allowed.has(v as PricingFormulaSlot)) {
			out.push(v as PricingFormulaSlot);
		}
	}
	return out.length > 0 ? out : [...DEFAULT_PRICING_FORMULA_SLOT_ORDER];
}

/**
 * Computes price per **purchase unit** from GRN line cost inputs
 * and template/item/store markups (COST → MSL → ITEM → STORE).
 */
export function computeSalePriceFromFormula(
	input: SalePriceFormulaInput
): SalePriceFormulaResult {
	const { template, grnLine } = input;
	const slotOrder = normalizeSlotOrder(template.slotOrder);
	const markups: SalePriceMarkupPercents = {
		msl: parsePercent(template.mslMarkupPercent),
		item: parsePercent(input.itemMarkupPercent),
		store: parsePercent(input.storeMarkupPercent)
	};

	const costFlags: CostBasisFlags = {
		includeDiscount: template.includeDiscount,
		includeTax: template.includeTax,
		includeFreeQtyInDenominator: template.includeFreeQty
	};

	const base = costPerPurchaseUnit(costFlags, grnLine, input.grnCostContext);
	const price = applySlotOrder(base, slotOrder, markups, {
		includeItemMarkup: template.includeItemMarkup,
		includeStoreMarkup: template.includeStoreMarkup
	});

	return { unitPricePurchase: price.toFixed(2) };
}

/** Converts purchase-unit prices to issue-unit prices. */
export function purchaseUnitPricesToIssueUnit(input: {
	purchaseUnitPrice: number;
	issueUnitPrice: number;
	unitPricePurchase: string;
}): { unitPriceIssue: string } {
	const purch = input.purchaseUnitPrice;
	const issue = input.issueUnitPrice;
	if (
		!Number.isFinite(purch) ||
		purch <= 0 ||
		!Number.isFinite(issue) ||
		issue <= 0
	) {
		return { unitPriceIssue: '0.00' };
	}
	const ratio = issue / purch;
	const converted = Number(input.unitPricePurchase) * ratio;
	return { unitPriceIssue: converted.toFixed(2) };
}
