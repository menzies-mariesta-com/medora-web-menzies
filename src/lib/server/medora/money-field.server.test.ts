import { describe, expect, it } from 'vitest';
import {
	normalizeMoneyDecimal2dpOrNull,
	normalizeMoneyDecimal2dpOrZero,
	optionalMoneyDecimal2dp,
	requireMoneyDecimal2dp
} from './money-field.server';

describe('money-field.server', () => {
	it('stores exactly 2 decimal places', () => {
		expect(requireMoneyDecimal2dp('10.999', 'amount')).toBe('11.00');
		expect(requireMoneyDecimal2dp('10.50000000000000000000', 'amount')).toBe(
			'10.50'
		);
	});

	it('optional money returns null for empty', () => {
		expect(optionalMoneyDecimal2dp('', 'tax')).toBeNull();
		expect(optionalMoneyDecimal2dp('5.1', 'tax')).toBe('5.10');
	});

	it('rejects negative amounts when configured', () => {
		expect(() =>
			requireMoneyDecimal2dp('-1', 'amount', { allowNegative: false })
		).toThrow();
	});

	it('normalizes legacy DB strings for API', () => {
		expect(normalizeMoneyDecimal2dpOrNull('99.999')).toBe('100.00');
		expect(normalizeMoneyDecimal2dpOrZero(null)).toBe('0.00');
	});
});
