import { describe, expect, it } from 'vitest';
import { formatMedOrderItemSearchLabel } from './format-med-order-item-search-label.util';

describe('formatMedOrderItemSearchLabel', () => {
	it('returns item name only when stock is missing', () => {
		expect(
			formatMedOrderItemSearchLabel({
				itemName: 'Paracetamol 500mg',
				stockIssueQty: null,
				issueUnitName: null
			})
		).toBe('Paracetamol 500mg');
	});

	it('appends stock qty and issue unit beside name', () => {
		expect(
			formatMedOrderItemSearchLabel({
				itemName: 'Paracetamol 500mg',
				stockIssueQty: '150.0000',
				issueUnitName: 'tab'
			})
		).toBe('Paracetamol 500mg · 150 tab');
	});

	it('shows qty without unit when unit name is missing', () => {
		expect(
			formatMedOrderItemSearchLabel({
				itemName: 'Item A',
				stockIssueQty: '12.5',
				issueUnitName: null
			})
		).toBe('Item A · 12.5');
	});
});
