import { describe, expect, it } from 'vitest';
import { formatTimelineUnitSearchLabel } from './timeline-unit-search-select.util';

describe('formatTimelineUnitSearchLabel', () => {
	it('appends hour duration when present', () => {
		expect(
			formatTimelineUnitSearchLabel({
				name: 'hour',
				timelineDurationDays: '0.041667'
			})
		).toBe('hour · 1h');
		expect(
			formatTimelineUnitSearchLabel({
				name: 'day',
				timelineDurationDays: '1'
			})
		).toBe('day · 24h');
		expect(
			formatTimelineUnitSearchLabel({
				name: 'day',
				timelineDurationDays: null
			})
		).toBe('day');
	});
});
