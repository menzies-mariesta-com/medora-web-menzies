import { describe, expect, it } from 'vitest';
import { formatServiceItemSearchLabel } from './service-item-search-select.util';

describe('formatServiceItemSearchLabel', () => {
	it('joins name and optional code', () => {
		expect(
			formatServiceItemSearchLabel({
				serviceName: 'Bed charge',
				serviceCode: 'BED'
			})
		).toBe('Bed charge (BED)');
		expect(
			formatServiceItemSearchLabel({
				serviceName: 'Bed charge',
				serviceCode: null
			})
		).toBe('Bed charge');
	});
});
