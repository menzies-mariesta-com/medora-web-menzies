import { describe, expect, it } from 'vitest';
import {
	computeGrnLinePrices,
	DEFAULT_BRANCH_PRICING_CONFIG
} from '$lib/tool/inventory/grn-pricing.util';
import { computeGrnLinePricesPreview } from './grn-pricing-preview.util';

const baseLine = {
	receivedQty: 10,
	freeQty: 2,
	purchaseUnitPrice: 100,
	discountAmount: 0,
	discountPercent: 0,
	taxAmount: 0,
	taxPercent: 10
};

const legacySale = {
	...DEFAULT_BRANCH_PRICING_CONFIG,
	saleManualOnGrnLine: false,
	saleIncludeDiscount: true,
	saleIncludeTax: true,
	saleIncludeFreeQty: false,
	saleMarkupPercent: '0'
};

const legacyEmp = {
	...DEFAULT_BRANCH_PRICING_CONFIG,
	empManualOnGrnLine: false,
	empUsePercentOfSale: false,
	empIncludeDiscount: true,
	empIncludeTax: true,
	empIncludeFreeQty: true,
	empMarkupPercent: '0'
};

describe('computeGrnLinePrices', () => {
	it('legacy sale: discount+tax per received qty', () => {
		const r = computeGrnLinePrices(legacySale, baseLine).result!;
		expect(r.salePerPurch).toBe('110.00');
	});

	it('legacy emp: spread over received+free', () => {
		const cfg = { ...legacySale, ...legacyEmp };
		const r = computeGrnLinePrices(cfg, baseLine).result!;
		expect(r.empPerPurch).toBe('91.67');
	});

	it('emp without free qty uses received only', () => {
		const cfg = {
			...legacySale,
			...legacyEmp,
			empIncludeFreeQty: false
		};
		const r = computeGrnLinePrices(cfg, baseLine).result!;
		expect(r.empPerPurch).toBe('110.00');
	});

	it('markup on purchase-like: no discount/tax, markup on sub', () => {
		const cfg = {
			...DEFAULT_BRANCH_PRICING_CONFIG,
			saleManualOnGrnLine: false,
			saleIncludeDiscount: false,
			saleIncludeTax: false,
			saleIncludeFreeQty: false,
			saleMarkupPercent: '15'
		};
		const r = computeGrnLinePrices(cfg, baseLine).result!;
		// sub/r = 100, * 1.15 = 115
		expect(r.salePerPurch).toBe('115.00');
	});

	it('markup on landed: discount+tax with markup', () => {
		const cfg = {
			...legacySale,
			saleMarkupPercent: '10'
		};
		const r = computeGrnLinePrices(cfg, baseLine).result!;
		expect(r.salePerPurch).toBe('121.00');
	});

	it('employee percent of sale', () => {
		const cfg = {
			...legacySale,
			empManualOnGrnLine: false,
			empUsePercentOfSale: true,
			empPercentOfSale: '90'
		};
		const r = computeGrnLinePrices(cfg, baseLine).result!;
		expect(r.salePerPurch).toBe('110.00');
		expect(r.empPerPurch).toBe('99.00');
	});

	it('manual overrides when manual flags set', () => {
		const cfg = {
			...DEFAULT_BRANCH_PRICING_CONFIG,
			saleManualOnGrnLine: true,
			empManualOnGrnLine: true
		};
		const r = computeGrnLinePrices(cfg, {
			...baseLine,
			salePriceOverride: '125.50',
			empSalePriceOverride: '80.25'
		}).result!;
		expect(r.salePerPurch).toBe('125.50');
		expect(r.empPerPurch).toBe('80.25');
	});
});

describe('computeGrnLinePricesPreview', () => {
	it('matches server for default config', () => {
		const server = computeGrnLinePrices(
			{ ...legacySale, ...legacyEmp },
			baseLine
		).result!;
		const client = computeGrnLinePricesPreview(
			{ ...legacySale, ...legacyEmp },
			baseLine
		);
		expect(client).toEqual(server);
	});
});
