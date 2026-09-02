import { describe, expect, it } from 'vitest';
import {
	medOrderLineTotal,
	medOrderOutUnitOptions,
	medOrderOutUnitOptionsFromIumList,
	normalizeInternalMedOrderOutUnit,
	outQtyToPurchaseQtyString,
	purchaseQtyToOutQtyString,
	resolveMedOrderIumForOutUnit,
	unitSalePriceForOutUnit
} from '$lib/tool/inventory/med-order-out-qty.util';

const ium = {
	purchaseUnitId: 1,
	issueUnitId: 2,
	purchaseConversionFactor: '100',
	issueConversionFactor: '1'
};

describe('med-order-out-qty', () => {
	it('converts out qty between purchase and issue units', () => {
		expect(outQtyToPurchaseQtyString('100', 2, ium)).toBe('1');
		expect(purchaseQtyToOutQtyString('2', 2, ium)).toBe('200');
	});

	it('picks sale price for out unit', () => {
		expect(
			unitSalePriceForOutUnit(
				{ unitSalePricePurchase: '100.00', unitSalePriceIssue: '1.00' },
				1,
				ium
			)
		).toBe('100.00');
		expect(
			unitSalePriceForOutUnit(
				{ unitSalePricePurchase: '100.00', unitSalePriceIssue: '1.00' },
				2,
				ium
			)
		).toBe('1.00');
	});

	it('totals qty_out × unit_sale_price', () => {
		expect(medOrderLineTotal('2', '1.39')).toBeCloseTo(2.78, 2);
	});

	it('normalizes internal lines to issue unit', () => {
		const normalized = normalizeInternalMedOrderOutUnit('2', 1, ium);
		expect(normalized.outUnitId).toBe(2);
		expect(normalized.qtyOut).toBe('200');
	});

	it('dedupes sale unit options when purchase and issue share a unit', () => {
		expect(
			medOrderOutUnitOptions({
				purchaseUnitId: 1,
				issueUnitId: 1,
				purchaseUnitName: 'Each',
				issueUnitName: 'Each'
			})
		).toHaveLength(1);
	});

	it('resolves conversion from sale unit', () => {
		const iumList = [
			{
				id: 1,
				purchaseUnitId: 10,
				issueUnitId: 20,
				purchaseConversionFactor: '100',
				issueConversionFactor: '1',
				purchaseUnitName: 'Box',
				issueUnitName: 'Tab'
			},
			{
				id: 2,
				purchaseUnitId: 30,
				issueUnitId: 20,
				purchaseConversionFactor: '10',
				issueConversionFactor: '1',
				purchaseUnitName: 'Strip',
				issueUnitName: 'Tab'
			}
		];
		expect(resolveMedOrderIumForOutUnit(iumList, 10)?.id).toBe(1);
		expect(resolveMedOrderIumForOutUnit(iumList, 30)?.id).toBe(2);
		expect(resolveMedOrderIumForOutUnit(iumList, 20, 2)?.id).toBe(2);
	});

	it('aggregates sale units across conversions', () => {
		const opts = medOrderOutUnitOptionsFromIumList([
			{
				id: 1,
				purchaseUnitId: 10,
				issueUnitId: 20,
				purchaseUnitName: 'Box',
				issueUnitName: 'Tab',
				purchaseConversionFactor: '1',
				issueConversionFactor: '1'
			},
			{
				id: 2,
				purchaseUnitId: 30,
				issueUnitId: 20,
				purchaseUnitName: 'Strip',
				issueUnitName: 'Tab',
				purchaseConversionFactor: '1',
				issueConversionFactor: '1'
			}
		]);
		expect(opts.map((o) => o.value).sort()).toEqual(['10', '20', '30']);
	});
});
