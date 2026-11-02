import { describe, expect, it } from 'vitest';
import { IpdAccommodationBillingMethodEnum } from '$lib/model/enum/db-link';
import { computeSegmentBillableDays } from './accommodation-billing.server';

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
