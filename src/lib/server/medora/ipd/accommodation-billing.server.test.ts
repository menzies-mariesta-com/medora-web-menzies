import { describe, expect, it } from 'vitest';
import { IpdAccommodationBillingMethodEnum } from '$lib/model/enum/db-link';
import {
	computeBillableHoursWithLeastBlock,
	computeSegmentBillableDays,
	computeSegmentBillableHours,
	accommodationChargeToPendingBillFields
} from './accommodation-billing.server';
import { parseUtcInstant } from '$lib/util/utc-instant.util';
import { timelineDurationDaysToHours } from '$lib/util/timeline-duration-days.util';

const base = {
	graceMinutes: 0,
	minimumDays: null,
	cutoffTime: '00:00'
} as const;

describe('computeSegmentBillableDays', () => {
	it('returns 0 for invalid or reversed ranges', () => {
		expect(
			computeSegmentBillableDays({
				...base,
				method: IpdAccommodationBillingMethodEnum.BLOCK_24H,
				startedAt: 'not-a-date',
				endedAt: '2026-01-01T12:00:00'
			})
		).toBe(0);
		expect(
			computeSegmentBillableDays({
				...base,
				method: IpdAccommodationBillingMethodEnum.BLOCK_24H,
				startedAt: '2026-01-02T12:00:00',
				endedAt: '2026-01-01T12:00:00'
			})
		).toBe(0);
	});

	it('returns 0 for a zero-length segment', () => {
		expect(
			computeSegmentBillableDays({
				...base,
				method: IpdAccommodationBillingMethodEnum.BLOCK_24H,
				startedAt: '2026-01-01T10:00:00',
				endedAt: '2026-01-01T10:00:00'
			})
		).toBe(0);
	});

	it('bills 24-hour blocks, ignoring grace when it does not cross a block', () => {
		expect(
			computeSegmentBillableDays({
				...base,
				method: IpdAccommodationBillingMethodEnum.BLOCK_24H,
				startedAt: '2026-01-01T10:00:00',
				endedAt: '2026-01-01T12:00:00'
			})
		).toBe(1);
		expect(
			computeSegmentBillableDays({
				...base,
				method: IpdAccommodationBillingMethodEnum.BLOCK_24H,
				startedAt: '2026-01-01T10:00:00',
				endedAt: '2026-01-02T11:00:00'
			})
		).toBe(2);
	});

	it('lets grace absorb a small overrun in 24-hour mode', () => {
		expect(
			computeSegmentBillableDays({
				...base,
				graceMinutes: 90,
				method: IpdAccommodationBillingMethodEnum.BLOCK_24H,
				startedAt: '2026-01-01T10:00:00',
				endedAt: '2026-01-02T11:00:00'
			})
		).toBe(1);
	});

	it('bills calendar days touched by the stay', () => {
		expect(
			computeSegmentBillableDays({
				...base,
				method: IpdAccommodationBillingMethodEnum.CALENDAR_DAY,
				startedAt: '2026-01-01T10:00:00',
				endedAt: '2026-01-03T09:00:00'
			})
		).toBe(3);
	});

	it('prorates partial days', () => {
		expect(
			computeSegmentBillableDays({
				...base,
				method: IpdAccommodationBillingMethodEnum.PRO_RATA,
				startedAt: '2026-01-01T00:00:00',
				endedAt: '2026-01-01T12:00:00'
			})
		).toBe(0.5);
	});

	it('applies minimum days only when the segment is billable', () => {
		expect(
			computeSegmentBillableDays({
				...base,
				minimumDays: '1',
				method: IpdAccommodationBillingMethodEnum.PRO_RATA,
				startedAt: '2026-01-01T00:00:00',
				endedAt: '2026-01-01T02:00:00'
			})
		).toBe(1);
		expect(
			computeSegmentBillableDays({
				...base,
				minimumDays: '1',
				method: IpdAccommodationBillingMethodEnum.PRO_RATA,
				startedAt: '2026-01-01T00:00:00',
				endedAt: '2026-01-01T00:00:00'
			})
		).toBe(0);
	});
});

describe('computeBillableHoursWithLeastBlock', () => {
	it('rounds stay up to least-duration blocks', () => {
		expect(
			computeBillableHoursWithLeastBlock({
				startedAt: '2026-01-01T00:00:00',
				endedAt: '2026-01-01T04:00:00',
				graceMinutes: 0,
				leastBillDurationHours: 8
			})
		).toBe(8);
		expect(
			computeBillableHoursWithLeastBlock({
				startedAt: '2026-01-01T00:00:00',
				endedAt: '2026-01-01T12:00:00',
				graceMinutes: 0,
				leastBillDurationHours: 8
			})
		).toBe(16);
	});
});

describe('computeSegmentBillableDays least hours', () => {
	it('uses least bill duration when set', () => {
		const days = computeSegmentBillableDays({
			...base,
			method: IpdAccommodationBillingMethodEnum.BLOCK_24H,
			leastBillDurationHours: '8',
			startedAt: '2026-01-01T00:00:00Z',
			endedAt: '2026-01-01T04:00:00Z'
		});
		expect(days).toBeCloseTo(8 / 24, 4);
	});

	it('ceils a multi-day stay to 5-hour blocks as whole hours', () => {
		const hours = computeSegmentBillableHours({
			...base,
			method: IpdAccommodationBillingMethodEnum.BLOCK_24H,
			leastBillDurationHours: '5',
			startedAt: '2026-11-03T09:25:00.000Z',
			endedAt: '2026-11-06T09:36:00.000Z'
		});
		// 72h 11m → ceil to 75
		expect(hours).toBe(75);
		const unitHours = timelineDurationDaysToHours(0.041667);
		expect(unitHours).toBe(1);
		expect(Math.round((hours / unitHours) * 10000) / 10000).toBe(75);
	});

	it('does not lengthen UTC-without-offset stay timestamps in +06:30', () => {
		// Admit local 3 Nov 15:55 → stored UTC 09:25; asOf local 6 Nov 16:06 → UTC 09:36
		const hours = computeSegmentBillableHours({
			...base,
			method: IpdAccommodationBillingMethodEnum.BLOCK_24H,
			leastBillDurationHours: '5',
			startedAt: '2026-11-03 09:25:00',
			endedAt: '2026-11-06 09:36:00'
		});
		expect(hours).toBe(75);
		expect(parseUtcInstant('2026-11-03 09:25:00')).toBe(
			Date.parse('2026-11-03T09:25:00.000Z')
		);
		expect(parseUtcInstant('2026-11-03 09:25:16.62+00')).toBe(
			Date.parse('2026-11-03T09:25:16.620Z')
		);
	});
});

describe('accommodationChargeToPendingBillFields', () => {
	it('uses day count × daily tariff for bill columns', () => {
		const fields = accommodationChargeToPendingBillFields({
			serviceItemName: 'Bed charge',
			charge: {
				segmentId: 1,
				label: 'Ward A · Bed 1',
				days: 3,
				dailyTariff: '10000.00',
				amount: '30000.00',
				bedBasePrice: '0',
				roomMarkup: '0',
				wardMarkup: '0',
				startedAt: '2026-01-01',
				endedAt: '2026-01-04',
				basePriceUnitLabel: 'Day',
				billableUnits: 3,
				unitPrice: '10000.00'
			}
		});
		expect(fields.serviceUnit).toBe(3);
		expect(fields.serviceUnitLabel).toBe('Day');
		expect(fields.serviceAmount).toBe('10000.00');
	});
});
