import { describe, expect, it } from 'vitest';
import {
	formatTimelineDurationHours,
	timelineDurationDaysToDbString,
	timelineDurationDaysToHours,
	timelineHoursToDbDaysString
} from './timeline-duration-days.util';

describe('timeline duration hours', () => {
	it('stores hours as day equivalents and shows hours again', () => {
		expect(timelineHoursToDbDaysString(24)).toBe('1');
		expect(timelineHoursToDbDaysString(8)).toBe('0.333333');
		const stored = timelineDurationDaysToDbString(
			timelineHoursToDbDaysString(8)
		);
		expect(stored).toBe('0.333333');
		expect(formatTimelineDurationHours(stored)).toBe('8');
		expect(formatTimelineDurationHours(1)).toBe('24');
		expect(formatTimelineDurationHours(0.5)).toBe('12');
	});

	it('snaps hour-unit day fractions back to whole hours', () => {
		expect(timelineDurationDaysToHours(0.041667)).toBe(1);
		expect(timelineDurationDaysToHours(0.333333)).toBe(8);
		expect(timelineDurationDaysToHours(1)).toBe(24);
	});
});
