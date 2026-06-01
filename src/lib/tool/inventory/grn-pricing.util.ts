import type {
	BranchPricingConfigDto,
	GrnLinePriceInput,
	GrnLinePriceResult,
	GrnPriceRuleFlags
} from '$lib/model/type/heka/grn-pricing-config.type';

export const DEFAULT_BRANCH_PRICING_CONFIG: Omit<
	BranchPricingConfigDto,
	'hospitalId' | 'branchId'
> = {
	saleManualOnGrnLine: false,
	saleIncludeDiscount: true,
	saleIncludeTax: true,
	saleIncludeFreeQty: false,
	saleMarkupPercent: '0',
	empManualOnGrnLine: false,
	empIncludeDiscount: true,
	empIncludeTax: true,
	empIncludeFreeQty: true,
	empMarkupPercent: '0',
	empUsePercentOfSale: false,
	empPercentOfSale: '100'
};

export type LandedCostTotals = {
	sub: number;
	afterDisc: number;
	afterTax: number;
	subPlusTax: number;
	discountTotal: number;
	taxTotal: number;
};

/** Line-level discount/tax totals (independent of per-unit flags). */
export function computeLandedCostTotals(p: {
	receivedQty: number;
	purchaseUnitPrice: number;
	discountAmount: number;
	discountPercent: number;
	taxAmount: number;
	taxPercent: number;
}): LandedCostTotals {
	const r = p.receivedQty;
	if (!Number.isFinite(r) || r <= 0) {
		return {
			sub: 0,
			afterDisc: 0,
			afterTax: 0,
			subPlusTax: 0,
			discountTotal: 0,
			taxTotal: 0
		};
	}
	const sub = r * p.purchaseUnitPrice;
	const discFromPct = sub * (p.discountPercent / 100);
	const discTotal =
		p.discountAmount > 0 ? p.discountAmount : discFromPct;
	const afterDisc = Math.max(0, sub - discTotal);
	const taxFromPctOnDisc = afterDisc * (p.taxPercent / 100);
	const taxTotalOnDisc =
		p.taxAmount > 0 ? p.taxAmount : taxFromPctOnDisc;
	const afterTax = afterDisc + taxTotalOnDisc;
	const taxFromPctOnSub = sub * (p.taxPercent / 100);
	const taxTotalOnSub =
		p.taxAmount > 0 ? p.taxAmount : taxFromPctOnSub;
	const subPlusTax = sub + taxTotalOnSub;
	return {
		sub,
		afterDisc,
		afterTax,
		subPlusTax,
		discountTotal: discTotal,
		taxTotal: taxTotalOnDisc
	};
}

export type GrnPricingValidationError = {
	field: 'salePriceOverride' | 'empSalePriceOverride';
	message: string;
};

function parseOverridePrice(
	raw: string | null | undefined,
	field: GrnPricingValidationError['field'],
	label: string
): { ok: true; value: number } | { ok: false; error: GrnPricingValidationError } {
	if (raw == null || String(raw).trim() === '') {
		return {
			ok: false,
			error: {
				field,
				message: `${label} is required for manual pricing`
			}
		};
	}
	const n = Number(raw);
	if (!Number.isFinite(n) || n <= 0) {
		return {
			ok: false,
			error: {
				field,
				message: `${label} must be greater than zero`
			}
		};
	}
	return { ok: true, value: n };
}

function markupFactor(markupPercent: string): number {
	const markupPct = Number(markupPercent);
	return Number.isFinite(markupPct) && markupPct > 0
		? 1 + markupPct / 100
		: 1;
}

/**
 * Per purchase-unit price from composable flags.
 * lineTotal = sub | afterDisc | afterTax; denom = received (+ free if flagged).
 */
export function computeCostPerUnit(
	flags: GrnPriceRuleFlags,
	line: Pick<
		GrnLinePriceInput,
		| 'receivedQty'
		| 'freeQty'
		| 'purchaseUnitPrice'
		| 'discountAmount'
		| 'discountPercent'
		| 'taxAmount'
		| 'taxPercent'
	>
): number {
	const r = line.receivedQty;
	const f = line.freeQty;
	if (!Number.isFinite(r) || r <= 0) return 0;

	const landed = computeLandedCostTotals({
		receivedQty: r,
		purchaseUnitPrice: line.purchaseUnitPrice,
		discountAmount: line.discountAmount,
		discountPercent: line.discountPercent,
		taxAmount: line.taxAmount,
		taxPercent: line.taxPercent
	});

	let lineTotal = landed.sub;
	if (flags.includeDiscount) {
		lineTotal = landed.afterDisc;
	}
	if (flags.includeTax) {
		lineTotal = flags.includeDiscount
			? landed.afterTax
			: landed.subPlusTax;
	}

	const denom =
		flags.includeFreeQtyInDenominator && f > 0 ? r + f : r;
	const perUnit = denom > 0 ? lineTotal / denom : 0;
	return perUnit * markupFactor(flags.markupPercent);
}

/**
 * Computes per purchase-unit sale and employee sale prices for a GRN line.
 */
export function computeGrnLinePrices(
	config: Pick<
		BranchPricingConfigDto,
		| 'saleManualOnGrnLine'
		| 'saleIncludeDiscount'
		| 'saleIncludeTax'
		| 'saleIncludeFreeQty'
		| 'saleMarkupPercent'
		| 'empManualOnGrnLine'
		| 'empIncludeDiscount'
		| 'empIncludeTax'
		| 'empIncludeFreeQty'
		| 'empMarkupPercent'
		| 'empUsePercentOfSale'
		| 'empPercentOfSale'
	>,
	line: GrnLinePriceInput
):
	| { ok: true; result: GrnLinePriceResult }
	| { ok: false; error: GrnPricingValidationError } {
	const r = line.receivedQty;
	if (!Number.isFinite(r) || r <= 0) {
		return {
			ok: true,
			result: {
				salePerPurch: '0',
				empPerPurch: '0',
				discountTotal: '0',
				taxTotal: '0'
			}
		};
	}

	const landed = computeLandedCostTotals({
		receivedQty: r,
		purchaseUnitPrice: line.purchaseUnitPrice,
		discountAmount: line.discountAmount,
		discountPercent: line.discountPercent,
		taxAmount: line.taxAmount,
		taxPercent: line.taxPercent
	});

	let sale: number;
	if (config.saleManualOnGrnLine) {
		const parsed = parseOverridePrice(
			line.salePriceOverride,
			'salePriceOverride',
			'Sale price override'
		);
		if (!parsed.ok) return parsed;
		sale = parsed.value;
	} else {
		sale = computeCostPerUnit(
			{
				includeDiscount: config.saleIncludeDiscount,
				includeTax: config.saleIncludeTax,
				includeFreeQtyInDenominator: config.saleIncludeFreeQty,
				markupPercent: config.saleMarkupPercent
			},
			line
		);
	}

	let emp: number;
	if (config.empManualOnGrnLine) {
		const parsed = parseOverridePrice(
			line.empSalePriceOverride,
			'empSalePriceOverride',
			'Employee sale price override'
		);
		if (!parsed.ok) return parsed;
		emp = parsed.value;
	} else if (config.empUsePercentOfSale) {
		const pct = Number(config.empPercentOfSale);
		emp =
			Number.isFinite(pct) && pct > 0 ? sale * (pct / 100) : sale;
	} else {
		emp = computeCostPerUnit(
			{
				includeDiscount: config.empIncludeDiscount,
				includeTax: config.empIncludeTax,
				includeFreeQtyInDenominator: config.empIncludeFreeQty,
				markupPercent: config.empMarkupPercent
			},
			line
		);
	}

	return {
		ok: true,
		result: {
			salePerPurch: sale.toFixed(2),
			empPerPurch: emp.toFixed(2),
			discountTotal: landed.discountTotal.toFixed(2),
			taxTotal: landed.taxTotal.toFixed(2)
		}
	};
}
