import { describe, expect, it } from 'vitest';
import { computeEstimatedPurchasePricePerIssueUnit } from '$lib/tool/inventory/estimated-purchase-price.util';

describe('computeEstimatedPurchasePricePerIssueUnit', () => {
	it('lands GRN cost and converts to issue unit', () => {
		const price = computeEstimatedPurchasePricePerIssueUnit(
			{
				lines: [
					{
						purchasedQty: 10,
						freeQty: 1,
						freeQtyPurchaseUnit: 1,
						purchaseUnitPrice: 10_000,
						discountAmount: 0,
						discountPercent: 0,
						taxAmount: 0,
						taxPercent: 0
					}
				],
				invoice: {
					discountAmount: 0,
					discountPercent: 0,
					taxAmount: 0,
					taxPercent: 0
				},
				targetLineIndex: 0
			},
			'100',
			'1'
		);
		// 100k / 11 purchase units ≈ 9090.91/box; pf=100 itf=1 => ~90.91/tab
		expect(price).toBeCloseTo(90.91, 2);
	});

	it('includes invoice discount and tax in landed cost', () => {
		const price = computeEstimatedPurchasePricePerIssueUnit(
			{
				lines: [
					{
						purchasedQty: 10,
						freeQty: 0,
						freeQtyPurchaseUnit: 0,
						purchaseUnitPrice: 100,
						discountAmount: 0,
						discountPercent: 0,
						taxAmount: 0,
						taxPercent: 0
					}
				],
				invoice: {
					discountAmount: 50,
					discountPercent: 0,
					taxAmount: 20,
					taxPercent: 0
				},
				targetLineIndex: 0
			},
			'10',
			'1'
		);
		// (1000 - 50 + 20) / 10 = 97 per purchase unit; issue = 97 * 1/10
		expect(price).toBeCloseTo(9.7, 2);
	});
});
