import { describe, expect, it } from 'vitest';
import { purchaseUnitPriceToIssueUnitPriceNumber } from '$lib/tool/inventory/purchase-issue-price-convert.util';

describe('purchaseUnitPriceToIssueUnitPriceNumber', () => {
	it('converts purchase unit price to issue unit price', () => {
		expect(
			purchaseUnitPriceToIssueUnitPriceNumber(100, '100', '1')
		).toBe(1);
	});

	it('returns null for invalid input', () => {
		expect(
			purchaseUnitPriceToIssueUnitPriceNumber(0, '100', '1')
		).toBeNull();
	});
});
