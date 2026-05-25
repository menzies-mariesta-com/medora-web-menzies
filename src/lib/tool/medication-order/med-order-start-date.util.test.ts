import { describe, expect, it } from 'vitest';
import {
	isMedOrderStartBeforeToday,
	medOrderMinStartDateTimeLocal,
	medOrderStartOfLocalDay
} from './med-order-start-date.util';

describe('med-order start date (local calendar day)', () => {
	const now = new Date(2026, 4, 25, 15, 30, 0); // 2026-05-25 15:30 local

	it('startOfLocalDay is midnight on that date', () => {
		const s = medOrderStartOfLocalDay(now);
		expect(s.getFullYear()).toBe(2026);
		expect(s.getMonth()).toBe(4);
		expect(s.getDate()).toBe(25);
		expect(s.getHours()).toBe(0);
		expect(s.getMinutes()).toBe(0);
	});

	it('allows any time on today', () => {
		expect(
			isMedOrderStartBeforeToday(new Date(2026, 4, 25, 0, 1, 0), now)
		).toBe(false);
		expect(
			isMedOrderStartBeforeToday(new Date(2026, 4, 25, 8, 0, 0), now)
		).toBe(false);
	});

	it('rejects calendar dates before today', () => {
		expect(
			isMedOrderStartBeforeToday(new Date(2026, 4, 24, 23, 59, 0), now)
		).toBe(true);
		expect(
			isMedOrderStartBeforeToday('2026-05-24T23:59', now)
		).toBe(true);
	});

	it('min datetime-local is start of today', () => {
		expect(medOrderMinStartDateTimeLocal(now)).toBe('2026-05-25T00:00');
	});
});
