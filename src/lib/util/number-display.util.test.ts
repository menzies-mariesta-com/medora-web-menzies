import { describe, expect, it } from 'vitest';
import {
	formatMoneyAmount,
	formatNumberDisplay,
	moneyInputStringFromDecimal,
	toFixedDecimalString,
	toMoneyDecimalString
} from './number-display.util';

describe('number-display money decimals', () => {
	it('rounds long decimal strings to scale without float noise', () => {
		expect(toFixedDecimalString('10.50000000000000000000', 2)).toBe('10.50');
		expect(toFixedDecimalString('99.999', 2)).toBe('100.00');
		expect(toMoneyDecimalString('0.30000000000000004')).toBe('0.30');
	});

	it('formats display with comma grouping and capped fraction digits', () => {
		expect(formatNumberDisplay('1234.567890123456789')).toBe('1,234.57');
		expect(formatMoneyAmount('1234.5000000000000001')).toBe('1,234.50');
	});

	it('trims money input strings for number fields', () => {
		expect(moneyInputStringFromDecimal('100.00')).toBe('100');
		expect(moneyInputStringFromDecimal('10.50000000000000000000')).toBe(
			'10.5'
		);
	});
});
