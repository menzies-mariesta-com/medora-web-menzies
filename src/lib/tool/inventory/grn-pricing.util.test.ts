import { describe, expect, it } from 'vitest';
import {
	computeCostPerUnit,
	computeGrnCostPerUnit,
	computeGrnLandedLineTotals,
	computeLandedCostTotals,
	DEFAULT_BRANCH_PRICING_CONFIG
} from '$lib/tool/inventory/grn-pricing.util';

const baseLine = {
	receivedQty: 10,
	freeQty: 2,
	freeQtyPurchaseUnit: 2,
	purchaseUnitPrice: 100,
	discountAmount: 0,
	discountPercent: 0,
	taxAmount: 0,
	taxPercent: 10
};

describe('computeLandedCostTotals', () => {
	it('applies discount then tax on subtotal', () => {
		const r = computeLandedCostTotals({
			receivedQty: 10,
			purchaseUnitPrice: 100,
			discountAmount: 50,
			discountPercent: 0,
			taxAmount: 0,
			taxPercent: 10
		});
		expect(r.sub).toBe(1000);
		expect(r.afterDisc).toBe(950);
		expect(r.afterTax).toBe(1045);
	});
});

describe('computeCostPerUnit', () => {
	it('legacy sale-like: discount+tax per received qty', () => {
		const perUnit = computeCostPerUnit(
			{
				includeDiscount: true,
				includeTax: true,
				includeFreeQtyInDenominator: false,
				markupPercent: '0'
			},
			baseLine
		);
		expect(perUnit).toBe(110);
	});

	it('spreads cost over received+free when flagged', () => {
		const perUnit = computeCostPerUnit(
			{
				includeDiscount: true,
				includeTax: true,
				includeFreeQtyInDenominator: true,
				markupPercent: '0'
			},
			baseLine
		);
		expect(perUnit).toBeCloseTo(91.67, 2);
	});

	it('uses converted free qty in purchase unit for denominator', () => {
		const line = {
			...baseLine,
			freeQty: 500,
			freeQtyPurchaseUnit: 5
		};
		const perUnit = computeCostPerUnit(
			{
				includeDiscount: true,
				includeTax: true,
				includeFreeQtyInDenominator: true,
				markupPercent: '0'
			},
			line
		);
		// sub 1000, tax 10% => 1100; denom 10+5=15 => 73.33...
		expect(perUnit).toBeCloseTo(73.33, 2);
	});

	it('applies markup on purchase-like subtotal', () => {
		const perUnit = computeCostPerUnit(
			{
				includeDiscount: false,
				includeTax: false,
				includeFreeQtyInDenominator: false,
				markupPercent: '15'
			},
			baseLine
		);
		expect(perUnit).toBeCloseTo(115, 2);
	});

	it('default branch config flags produce finite cost', () => {
		const perUnit = computeCostPerUnit(
			{
				includeDiscount: DEFAULT_BRANCH_PRICING_CONFIG.saleIncludeDiscount,
				includeTax: DEFAULT_BRANCH_PRICING_CONFIG.saleIncludeTax,
				includeFreeQtyInDenominator:
					DEFAULT_BRANCH_PRICING_CONFIG.saleIncludeFreeQty,
				markupPercent: DEFAULT_BRANCH_PRICING_CONFIG.saleMarkupPercent
			},
			baseLine
		);
		expect(Number.isFinite(perUnit)).toBe(true);
	});
});

describe('computeGrnLandedLineTotals', () => {
	it('applies line then prorated invoice discount and tax', () => {
		const totals = computeGrnLandedLineTotals({
			lines: [
				{
					receivedQty: 100,
					purchaseUnitPrice: 50,
					discountAmount: 0,
					discountPercent: 10,
					taxAmount: 0,
					taxPercent: 7
				}
			],
			invoice: {
				discountAmount: 200,
				discountPercent: 0,
				taxAmount: 0,
				taxPercent: 5
			},
			includeDiscount: true,
			includeTax: true
		});
		// sub 5000, line disc 500 => 4500, invoice disc 200 => 4300
		// line tax 7% of 4300 = 301, invoice tax 5% of 4300 = 215
		expect(totals[0]).toBeCloseTo(4816, 0);
	});

	it('allocates invoice discount across multiple lines', () => {
		const totals = computeGrnLandedLineTotals({
			lines: [
				{
					receivedQty: 10,
					purchaseUnitPrice: 100,
					discountAmount: 0,
					discountPercent: 0,
					taxAmount: 0,
					taxPercent: 0
				},
				{
					receivedQty: 5,
					purchaseUnitPrice: 20,
					discountAmount: 0,
					discountPercent: 0,
					taxAmount: 0,
					taxPercent: 0
				}
			],
			invoice: {
				discountAmount: 110,
				discountPercent: 0,
				taxAmount: 0,
				taxPercent: 0
			},
			includeDiscount: true,
			includeTax: false
		});
		// shares 1000:100 => 100 and 10 after invoice disc
		expect(totals[0]).toBeCloseTo(900, 0);
		expect(totals[1]).toBeCloseTo(90, 0);
	});
});

describe('computeGrnCostPerUnit', () => {
	it('matches line-only cost when invoice charges are zero', () => {
		const line = { ...baseLine, freeQty: 0 };
		const flags = {
			includeDiscount: true,
			includeTax: true,
			includeFreeQtyInDenominator: false,
			markupPercent: '0'
		};
		const lineOnly = computeCostPerUnit(flags, line);
		const withContext = computeGrnCostPerUnit(flags, {
			lines: [line],
			invoice: {
				discountAmount: 0,
				discountPercent: 0,
				taxAmount: 0,
				taxPercent: 0
			},
			targetLineIndex: 0
		});
		expect(withContext).toBeCloseTo(lineOnly, 4);
	});
});
