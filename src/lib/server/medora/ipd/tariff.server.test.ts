import { describe, expect, it } from 'vitest';
import {
	computeDailyRate,
	computeMarkedUpUnitPrice
} from './tariff.server';

describe('computeDailyRate', () => {
	it('divides marked-up unit price by timeline duration', () => {
		expect(
			computeDailyRate({
				bedBasePrice: '1000',
				roomMarkupPercent: '0',
				wardMarkupPercent: '0',
				timelineDurationDays: 1
			})
		).toBe('1000.00');
		expect(
			computeDailyRate({
				bedBasePrice: '500',
				roomMarkupPercent: '0',
				wardMarkupPercent: '0',
				timelineDurationDays: 0.5
			})
		).toBe('1000.00');
	});

	it('applies room and ward markups before dividing', () => {
		const unit = computeMarkedUpUnitPrice({
			bedBasePrice: '100',
			roomMarkupPercent: '10',
			wardMarkupPercent: '0'
		});
		expect(unit).toBe('110.00');
		expect(
			computeDailyRate({
				bedBasePrice: '100',
				roomMarkupPercent: '10',
				wardMarkupPercent: '0',
				timelineDurationDays: 2
			})
		).toBe('55.00');
	});
});
