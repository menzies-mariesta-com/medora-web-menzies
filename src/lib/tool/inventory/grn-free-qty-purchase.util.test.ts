import { describe, expect, it } from 'vitest';
import {
	freeQtyToPurchaseUnitQty,
	purchaseUnitDenominatorQty
} from '$lib/tool/inventory/grn-free-qty-purchase.util';

const lineIum = {
	id: 1,
	purchaseUnitId: 10,
	issueUnitId: 20,
	purchaseConversionFactor: '100',
	issueConversionFactor: '1'
};

describe('freeQtyToPurchaseUnitQty', () => {
	it('returns free qty unchanged when free unit is line purchase unit', () => {
		expect(
			freeQtyToPurchaseUnitQty({
				freeQ: 2,
				freeUnitId: 10,
				linePurchaseUnitId: 10,
				lineIssueUnitId: 20,
				linePurchaseConversionFactor: '100',
				lineIssueConversionFactor: '1',
				allIums: [lineIum]
			})
		).toBe(2);
	});

	it('converts free issue qty to line purchase unit', () => {
		expect(
			freeQtyToPurchaseUnitQty({
				freeQ: 500,
				freeUnitId: 20,
				linePurchaseUnitId: 10,
				lineIssueUnitId: 20,
				linePurchaseConversionFactor: '100',
				lineIssueConversionFactor: '1',
				allIums: [lineIum]
			})
		).toBe(5);
	});
});

describe('purchaseUnitDenominatorQty', () => {
	it('adds converted free qty when flag is on', () => {
		expect(
			purchaseUnitDenominatorQty({
				purchasedQty: 10,
				freeQtyPurchaseUnit: 5,
				includeFreeQtyInDenominator: true
			})
		).toBe(15);
	});
});
