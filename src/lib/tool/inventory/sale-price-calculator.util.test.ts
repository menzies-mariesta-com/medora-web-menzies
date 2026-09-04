import { describe, expect, it } from 'vitest';
import type { PricingFormulaTemplateDto } from '$lib/model/type/heka/pricing-formula-template.type';
import {
	applyFormulaSlot,
	computeFormulaCostPerPurchaseUnit,
	computeSalePriceFromFormula
} from '$lib/tool/inventory/sale-price-calculator.util';

const baseLine = {
	purchasedQty: 10,
	freeQty: 0,
	freeQtyPurchaseUnit: 0,
	purchaseUnitPrice: 100,
	discountAmount: 0,
	discountPercent: 0,
	taxAmount: 0,
	taxPercent: 0
};

function template(
	overrides: Partial<PricingFormulaTemplateDto> = {}
): PricingFormulaTemplateDto {
	return {
		id: 1,
		hospitalId: 'h1',
		name: 'Test',
		description: null,
		formulaVersion: 1,
		includeDiscount: true,
		includeTax: true,
		includeFreeQty: false,
		includeItemMarkup: true,
		includeStoreMarkup: true,
		mslMarkupPercent: '0',
		slotOrder: ['COST', 'MSL', 'ITEM', 'STORE'],
		isSystemDefault: false,
		statusId: 1,
		...overrides
	};
}

describe('applyFormulaSlot', () => {
	it('applies MSL markup independently', () => {
		expect(applyFormulaSlot(100, 'MSL', 10)).toBeCloseTo(110);
	});
});

describe('computeSalePriceFromFormula', () => {
	it('applies MSL, item, and store markups in order', () => {
		const r = computeSalePriceFromFormula({
			module: 'IS',
			branchId: 'b1',
			storeId: 1,
			itemId: 1,
			batchId: 1,
			grnLine: baseLine,
			itemMarkupPercent: '10',
			storeMarkupPercent: '5',
			template: template({ mslMarkupPercent: '20' })
		});
		expect(Number(r.unitPricePurchase)).toBeCloseTo(138.6, 1);
	});

	it('works for any charge module using the same template', () => {
		const r = computeSalePriceFromFormula({
			module: 'DC',
			branchId: 'b1',
			storeId: 1,
			itemId: 1,
			batchId: 1,
			grnLine: baseLine,
			itemMarkupPercent: '0',
			storeMarkupPercent: '0',
			template: template({ mslMarkupPercent: '0' })
		});
		expect(Number(r.unitPricePurchase)).toBeCloseTo(100, 1);
	});

	it('skips item and store markup when template flags are off', () => {
		const r = computeSalePriceFromFormula({
			module: 'IS',
			branchId: 'b1',
			storeId: 1,
			itemId: 1,
			batchId: 1,
			grnLine: baseLine,
			itemMarkupPercent: '50',
			storeMarkupPercent: '50',
			template: template({
				mslMarkupPercent: '10',
				includeItemMarkup: false,
				includeStoreMarkup: false
			})
		});
		expect(Number(r.unitPricePurchase)).toBeCloseTo(110, 1);
	});

	it('includes prorated invoice discount and tax in cost', () => {
		const grnLine = {
			purchasedQty: 100,
			freeQty: 10,
			freeQtyPurchaseUnit: 10,
			purchaseUnitPrice: 50,
			discountAmount: 0,
			discountPercent: 10,
			taxAmount: 0,
			taxPercent: 7
		};
		const r = computeSalePriceFromFormula({
			module: 'IS',
			branchId: 'b1',
			storeId: 1,
			itemId: 1,
			batchId: 1,
			grnLine,
			grnCostContext: {
				lines: [grnLine],
				invoice: {
					discountAmount: 200,
					discountPercent: 0,
					taxAmount: 0,
					taxPercent: 5
				},
				targetLineIndex: 0
			},
			itemMarkupPercent: '0',
			storeMarkupPercent: '0',
			template: template({
				includeFreeQty: true,
				mslMarkupPercent: '0'
			})
		});
		// landed 4816 / 110 = 43.7818...
		expect(Number(r.unitPricePurchase)).toBeCloseTo(43.78, 1);
	});

	it('computeFormulaCostPerPurchaseUnit matches sale price when markups are zero', () => {
		const grnLine = {
			purchasedQty: 100,
			freeQty: 10,
			freeQtyPurchaseUnit: 10,
			purchaseUnitPrice: 50,
			discountAmount: 0,
			discountPercent: 10,
			taxAmount: 0,
			taxPercent: 7
		};
		const cost = computeFormulaCostPerPurchaseUnit(
			template({ includeFreeQty: true }),
			grnLine,
			{
				lines: [grnLine],
				invoice: {
					discountAmount: 200,
					discountPercent: 0,
					taxAmount: 0,
					taxPercent: 5
				},
				targetLineIndex: 0
			}
		);
		expect(cost).toBeCloseTo(43.78, 1);
	});
});
