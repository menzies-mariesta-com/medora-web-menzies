import { describe, expect, it } from 'vitest';
import { BillingDiscountTypeEnum } from '$lib/model/enum/billing-discount-type.enum';
import { VisitTypeEnum } from '$lib/model/enum/db-link';
import {
	ipPayableFromNetAndDeposit,
	resolveVisitBillTotals,
	resolveVisitBillTotalsFromLinesResponse
} from '$lib/tool/billing/billing-visit-totals.util';

describe('resolveVisitBillTotals', () => {
	it('prefers synced billing header over line re-sum', () => {
		const t = resolveVisitBillTotals({
			itemsSubtotal: 999,
			billing: {
				linesSubtotal: '100.00',
				discountAmount: '10.00',
				totalAmount: '90.00'
			},
			visitTypeId: VisitTypeEnum.OPD
		});
		expect(t.linesSubtotal).toBe(100);
		expect(t.discountValue).toBe(10);
		expect(t.netTotal).toBe(90);
		expect(t.payableAmount).toBe(90);
	});

	it('caps IP advance credit at net and uses API balanceDue', () => {
		const t = resolveVisitBillTotals({
			itemsSubtotal: 500,
			billing: {
				linesSubtotal: '500.00',
				discountAmount: '0',
				totalAmount: '500.00'
			},
			visitTypeId: VisitTypeEnum.IPD,
			advanceTotal: 800,
			advanceCredit: 500,
			balanceDue: 0
		});
		expect(t.advanceCredit).toBe(500);
		expect(t.advanceRefundDue).toBe(300);
		expect(t.balanceDue).toBe(0);
		expect(t.payableAmount).toBe(0);
	});

	it('computes percent discount when header total missing', () => {
		const t = resolveVisitBillTotals({
			itemsSubtotal: 200,
			billing: {
				discountTypeId: BillingDiscountTypeEnum.PERCENT,
				discountPercent: 10
			},
			visitTypeId: VisitTypeEnum.OPD
		});
		expect(t.discountValue).toBe(20);
		expect(t.netTotal).toBe(180);
	});

	it('ignores IP advance fields on OPD visits', () => {
		const t = resolveVisitBillTotalsFromLinesResponse(
			{
				items: [],
				visit: null,
				billing: {
					linesSubtotal: '500.00',
					discountAmount: '0',
					totalAmount: '500.00'
				},
				readiness: null,
				advanceTotal: 10_000,
				advanceCredit: 500,
				balanceDue: 0,
				advanceRefundDue: 9500
			},
			VisitTypeEnum.OPD
		);
		expect(t.advanceTotal).toBe(0);
		expect(t.advanceCredit).toBe(0);
		expect(t.advanceRefundDue).toBe(0);
		expect(t.payableAmount).toBe(500);
	});
});

describe('ipPayableFromNetAndDeposit', () => {
	it('never returns negative payable', () => {
		expect(ipPayableFromNetAndDeposit(100, 250)).toBe(0);
		expect(ipPayableFromNetAndDeposit(100, 40)).toBe(60);
	});
});
