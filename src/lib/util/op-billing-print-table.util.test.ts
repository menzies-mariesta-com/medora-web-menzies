import { describe, expect, it } from 'vitest';
import {
	BILLING_LINE_COLUMN_WIDTH,
	buildOpBillingPrintBodyHtml
} from './op-billing-print-table.util';

describe('billing line column widths', () => {
	it('prints every line table with the shared fixed columns', () => {
		const html = buildOpBillingPrintBodyHtml({
			groups: [
				{
					subCategoryName: 'Bed',
					subtotal: 100,
					lines: [
						{
							serviceName: 'Accommodation',
							qty: 75,
							unitLabel: 'hour',
							unitPrice: 10,
							lineTotal: 750
						}
					]
				}
			],
			grandTotal: 100,
			discountValue: 0,
			netTotal: 100,
			hasDiscount: false,
			labels: {
				service: 'Service',
				order: 'Order',
				qty: 'Qty',
				unit: 'Unit',
				unitPrice: 'Unit price',
				amount: 'Amount',
				subtotal: 'Subtotal',
				grandTotal: 'Grand total',
				discount: 'Discount',
				netTotal: 'Net total'
			},
			formatMoney: (n) => n.toFixed(2)
		});
		expect(html).toContain('billing-line-table');
		expect(html).toContain(`width:${BILLING_LINE_COLUMN_WIDTH.service}`);
		expect(html).toContain(`width:${BILLING_LINE_COLUMN_WIDTH.qty}`);
		expect(html).toContain(`width:${BILLING_LINE_COLUMN_WIDTH.amount}`);
	});
});
