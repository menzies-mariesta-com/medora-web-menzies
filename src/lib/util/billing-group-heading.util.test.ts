import { describe, expect, it } from 'vitest';
import { formatBillingCategorySubCategoryHeading } from './billing-group-heading.util';

describe('formatBillingCategorySubCategoryHeading', () => {
	it('joins category and sub category', () => {
		expect(
			formatBillingCategorySubCategoryHeading({
				categoryName: 'Laboratory',
				subCategoryName: 'Chemistry'
			})
		).toBe('Laboratory | Chemistry');
	});

	it('uses em dash when category is missing', () => {
		expect(
			formatBillingCategorySubCategoryHeading({
				subCategoryName: 'Pharmacy'
			})
		).toBe('— | Pharmacy');
	});
});
