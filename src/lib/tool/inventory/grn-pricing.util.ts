import type {
	BranchPricingConfigDto,
	GrnLinePriceInput,
	GrnPriceRuleFlags
} from '$lib/model/type/heka/grn-pricing-config.type';
import {
	freeQtyToPurchaseUnitQty,
	purchaseUnitDenominatorQty
} from '$lib/tool/inventory/grn-free-qty-purchase.util';

export { freeQtyToPurchaseUnitQty };

/**
 * Full landed GRN cost for stock display — line + invoice discount/tax,
 * free qty in denominator. Not tied to sale pricing templates.
 */
export const ESTIMATED_PURCHASE_LANDED_COST_FLAGS: GrnPriceRuleFlags = {
	includeDiscount: true,
	includeTax: true,
	includeFreeQtyInDenominator: true,
	markupPercent: '0'
};

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

/** Resolves a charge total: fixed amount wins over percent on `base`. */
export function resolveChargeTotal(
	base: number,
	amount: number,
	percent: number
): number {
	if (!Number.isFinite(base) || base <= 0) return 0;
	if (amount > 0) return amount;
	if (percent > 0) return base * (percent / 100);
	return 0;
}

/** Allocates `total` across `shares` proportionally (equal split when all shares are zero). */
export function allocateProportionalShare(
	total: number,
	shares: number[],
	index: number
): number {
	if (!Number.isFinite(total) || total <= 0) return 0;
	const safeShares = shares.map((s) => Math.max(0, s));
	const sum = safeShares.reduce((a, b) => a + b, 0);
	if (sum <= 0) {
		return shares.length > 0 ? total / shares.length : 0;
	}
	return total * (safeShares[index] / sum);
}

export type GrnInvoiceCostInput = {
	discountAmount: number;
	discountPercent: number;
	taxAmount: number;
	taxPercent: number;
};

/**
 * Landed line totals for a GRN: line discount/tax, then invoice discount/tax
 * prorated by each line's share of the GRN subtotal (after line discounts).
 */
export function computeGrnLandedLineTotals(input: {
	lines: Array<
		Pick<
			GrnLinePriceInput,
			| 'purchasedQty'
			| 'purchaseUnitPrice'
			| 'discountAmount'
			| 'discountPercent'
			| 'taxAmount'
			| 'taxPercent'
		>
	>;
	invoice: GrnInvoiceCostInput;
	includeDiscount: boolean;
	includeTax: boolean;
}): number[] {
	const { lines, invoice, includeDiscount, includeTax } = input;
	if (lines.length === 0) return [];

	const subs = lines.map((l) => {
		const r = l.purchasedQty;
		if (!Number.isFinite(r) || r <= 0) return 0;
		return r * l.purchaseUnitPrice;
	});

	const lineDiscs = lines.map((l, i) =>
		includeDiscount
			? resolveChargeTotal(subs[i], l.discountAmount, l.discountPercent)
			: 0
	);

	const afterLineDisc = subs.map((s, i) => Math.max(0, s - lineDiscs[i]));
	const grnAfterLineDiscSum = afterLineDisc.reduce((a, b) => a + b, 0);

	const invoiceDiscTotal = includeDiscount
		? resolveChargeTotal(
				grnAfterLineDiscSum,
				invoice.discountAmount,
				invoice.discountPercent
			)
		: 0;

	const allocatedInvoiceDisc = afterLineDisc.map((_, i) =>
		allocateProportionalShare(invoiceDiscTotal, afterLineDisc, i)
	);

	const afterAllDisc = afterLineDisc.map((v, i) =>
		Math.max(0, v - allocatedInvoiceDisc[i])
	);

	const lineTaxes = lines.map((l, i) => {
		if (!includeTax) return 0;
		const taxBase = includeDiscount ? afterAllDisc[i] : subs[i];
		return resolveChargeTotal(taxBase, l.taxAmount, l.taxPercent);
	});

	const invoiceTaxBase = includeDiscount
		? afterAllDisc.reduce((a, b) => a + b, 0)
		: subs.reduce((a, b) => a + b, 0);

	const invoiceTaxTotal = includeTax
		? resolveChargeTotal(
				invoiceTaxBase,
				invoice.taxAmount,
				invoice.taxPercent
			)
		: 0;

	const taxAllocShares = includeDiscount ? afterAllDisc : subs;
	const allocatedInvoiceTax = taxAllocShares.map((_, i) =>
		allocateProportionalShare(invoiceTaxTotal, taxAllocShares, i)
	);

	return lines.map((_, i) => {
		let total = includeDiscount ? afterAllDisc[i] : subs[i];
		if (includeTax) {
			total += lineTaxes[i] + allocatedInvoiceTax[i];
		}
		return total;
	});
}

function resolvedFreeQtyPurchaseUnit(
	line: Pick<GrnLinePriceInput, 'freeQty' | 'freeQtyPurchaseUnit'>
): number {
	if (line.freeQtyPurchaseUnit != null) {
		const n = Number(line.freeQtyPurchaseUnit);
		return Number.isFinite(n) && n > 0 ? n : 0;
	}
	const n = Number(line.freeQty);
	return Number.isFinite(n) && n > 0 ? n : 0;
}

function costDenominatorPurchaseQty(
	flags: GrnPriceRuleFlags,
	line: Pick<
		GrnLinePriceInput,
		'purchasedQty' | 'freeQty' | 'freeQtyPurchaseUnit'
	>
): number {
	return purchaseUnitDenominatorQty({
		purchasedQty: line.purchasedQty,
		freeQtyPurchaseUnit: resolvedFreeQtyPurchaseUnit(line),
		includeFreeQtyInDenominator: flags.includeFreeQtyInDenominator
	});
}

/**
 * Per purchase-unit cost for one GRN line, including prorated invoice discount/tax.
 */
export function computeGrnCostPerUnit(
	flags: GrnPriceRuleFlags,
	context: {
		lines: Array<
			Pick<
				GrnLinePriceInput,
				| 'purchasedQty'
				| 'freeQty'
				| 'freeQtyPurchaseUnit'
				| 'purchaseUnitPrice'
				| 'discountAmount'
				| 'discountPercent'
				| 'taxAmount'
				| 'taxPercent'
			>
		>;
		invoice: GrnInvoiceCostInput;
		targetLineIndex: number;
	}
): number {
	const idx = context.targetLineIndex;
	const line = context.lines[idx];
	if (!line) return 0;

	const r = line.purchasedQty;
	if (!Number.isFinite(r) || r <= 0) return 0;

	const landedTotals = computeGrnLandedLineTotals({
		lines: context.lines,
		invoice: context.invoice,
		includeDiscount: flags.includeDiscount,
		includeTax: flags.includeTax
	});

	const lineTotal = landedTotals[idx] ?? 0;
	const denom = costDenominatorPurchaseQty(flags, line);
	const perUnit = denom > 0 ? lineTotal / denom : 0;
	return perUnit * markupFactor(flags.markupPercent);
}

/** Line-level discount/tax totals (independent of per-unit flags). */
export function computeLandedCostTotals(p: {
	purchasedQty: number;
	purchaseUnitPrice: number;
	discountAmount: number;
	discountPercent: number;
	taxAmount: number;
	taxPercent: number;
}): LandedCostTotals {
	const r = p.purchasedQty;
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
		| 'purchasedQty'
		| 'freeQty'
		| 'freeQtyPurchaseUnit'
		| 'purchaseUnitPrice'
		| 'discountAmount'
		| 'discountPercent'
		| 'taxAmount'
		| 'taxPercent'
	>
): number {
	const r = line.purchasedQty;
	if (!Number.isFinite(r) || r <= 0) return 0;

	const landed = computeLandedCostTotals({
		purchasedQty: r,
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

	const denom = costDenominatorPurchaseQty(flags, line);
	const perUnit = denom > 0 ? lineTotal / denom : 0;
	return perUnit * markupFactor(flags.markupPercent);
}
