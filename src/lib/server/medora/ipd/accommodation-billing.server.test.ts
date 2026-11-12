import { describe, expect, it } from 'vitest';
import {
	computeBillableHoursWithLeastBlock,
	computeSegmentBillableDays,
	computeSegmentBillableHours,
	accommodationChargeToPendingBillFields,
	buildAccommodationChargeLines,
	resolveStaySegmentBillingPolicy,
	resolveLeastBillBlockHours,
	computeSegmentActualHours
} from './accommodation-billing.server';
import type {
	AccommodationBillingPolicySchema,
	IpdBedStaySegmentSchema
} from '$lib/server/db/schema-type';
import { parseUtcInstant } from '$lib/util/utc-instant.util';
import { timelineDurationDaysToHours } from '$lib/util/timeline-duration-days.util';

const EIGHT_HOUR_UNIT_ID = 8;
const DAY_UNIT_ID = 99;
const eightHourUnit = { name: '8h', durationDays: 8 / 24 };
const dayUnit = { name: 'Day', durationDays: 1 };

describe('computeSegmentBillableDays', () => {
	it('returns 0 for invalid or reversed ranges', () => {
		expect(
			computeSegmentBillableDays({
				leastBillBlockHours: 24,
				startedAt: 'not-a-date',
				endedAt: '2026-01-01T12:00:00'
			})
		).toBe(0);
		expect(
			computeSegmentBillableDays({
				leastBillBlockHours: 24,
				startedAt: '2026-01-02T12:00:00',
				endedAt: '2026-01-01T12:00:00'
			})
		).toBe(0);
	});

	it('returns 0 for a zero-length segment', () => {
		expect(
			computeSegmentBillableDays({
				leastBillBlockHours: 24,
				startedAt: '2026-01-01T10:00:00',
				endedAt: '2026-01-01T10:00:00'
			})
		).toBe(0);
	});

	it('ceils stay to least block in hours', () => {
		expect(
			computeSegmentBillableDays({
				leastBillBlockHours: 24,
				startedAt: '2026-01-01T10:00:00',
				endedAt: '2026-01-01T12:00:00'
			})
		).toBe(1);
		expect(
			computeSegmentBillableDays({
				leastBillBlockHours: 24,
				startedAt: '2026-01-01T10:00:00',
				endedAt: '2026-01-02T11:00:00'
			})
		).toBe(2);
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

describe('computeSegmentBillableHours least block', () => {
	it('uses least bill block hours when set', () => {
		const days = computeSegmentBillableDays({
			leastBillBlockHours: 8,
			startedAt: '2026-01-01T00:00:00Z',
			endedAt: '2026-01-01T04:00:00Z'
		});
		expect(days).toBeCloseTo(8 / 24, 4);
	});

	it('ceils a multi-day stay to 5-hour blocks as whole hours', () => {
		const hours = computeSegmentBillableHours({
			leastBillBlockHours: 5,
			startedAt: '2026-11-03T09:25:00.000Z',
			endedAt: '2026-11-06T09:36:00.000Z'
		});
		expect(hours).toBe(75);
		const unitHours = timelineDurationDaysToHours(0.041667);
		expect(unitHours).toBe(1);
		expect(Math.round((hours / unitHours) * 10000) / 10000).toBe(75);
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

const hospitalPolicyDay = {
	leastBillDuration: '1',
	accommodationBillUnitId: DAY_UNIT_ID
} as unknown as AccommodationBillingPolicySchema;

const hospitalPolicy8h = {
	leastBillDuration: '1',
	accommodationBillUnitId: EIGHT_HOUR_UNIT_ID
} as unknown as AccommodationBillingPolicySchema;

function bedSegmentStub(
	overrides: Partial<IpdBedStaySegmentSchema> & {
		id: number;
		startedAt: string;
		endedAt: string | null;
	}
): IpdBedStaySegmentSchema {
	return {
		admissionId: 1,
		hospitalId: 'h1',
		wardId: 1,
		roomId: 1,
		bedId: 1,
		bedBasePriceSnapshot: '10000',
		roomMarkupSnapshot: '0',
		wardMarkupSnapshot: '0',
		dailyTariffSnapshot: '30000',
		basePriceUnitNameSnapshot: 'Hour',
		timelineDurationDaysSnapshot: '0.041667',
		statusId: 1,
		...overrides
	} as IpdBedStaySegmentSchema;
}

describe('buildAccommodationChargeLines transfer billing (§4)', () => {
	it('bills each bed assignment separately with independent minimum block', () => {
		const movedAt = '2026-11-01T12:00:00.000Z';
		const segments = [
			bedSegmentStub({
				id: 10,
				wardNameSnapshot: 'General',
				bedNameSnapshot: 'Bed A',
				startedAt: '2026-11-01T08:00:00.000Z',
				endedAt: movedAt
			}),
			bedSegmentStub({
				id: 11,
				wardNameSnapshot: 'General',
				bedNameSnapshot: 'Bed B',
				startedAt: movedAt,
				endedAt: '2026-11-01T16:00:00.000Z'
			})
		];

		const lines = buildAccommodationChargeLines({
			segments,
			hospitalPolicy: hospitalPolicy8h,
			asOf: '2026-11-01T16:00:00.000Z',
			unitMetaById: new Map([[EIGHT_HOUR_UNIT_ID, eightHourUnit]])
		});
		expect(lines).toHaveLength(2);
		expect(lines[0]!.basePriceUnitLabel).toBe('8h');
		expect(lines[0]!.billableHours).toBe(8);
		expect(lines[1]!.billableHours).toBe(8);
	});
});

describe('buildAccommodationChargeLines bill unit', () => {
	it('uses billing-setup unit for every segment (not bed Hour)', () => {
		const segments = [
			bedSegmentStub({
				id: 1,
				startedAt: '2026-11-01T08:00:00.000Z',
				endedAt: '2026-11-01T12:00:00.000Z'
			}),
			bedSegmentStub({
				id: 2,
				wardNameSnapshot: 'Other',
				startedAt: '2026-11-02T08:00:00.000Z',
				endedAt: '2026-11-02T10:00:00.000Z'
			})
		];
		const lines = buildAccommodationChargeLines({
			segments,
			hospitalPolicy: hospitalPolicyDay,
			asOf: '2026-11-03T00:00:00.000Z',
			unitMetaById: new Map([[DAY_UNIT_ID, dayUnit]])
		});
		expect(lines).toHaveLength(2);
		expect(lines[0]!.basePriceUnitLabel).toBe('Day');
		expect(lines[0]!.billableUnits).toBe(1);
		expect(lines[1]!.basePriceUnitLabel).toBe('Day');
		expect(lines[1]!.billableUnits).toBe(1);
	});
});

describe('resolveStaySegmentBillingPolicy', () => {
	it('always reflects live hospital policy', () => {
		const resolved = resolveStaySegmentBillingPolicy(hospitalPolicyDay);
		expect(resolved.leastBillDurationUnitId).toBe(DAY_UNIT_ID);
		expect(resolved.leastBillDuration).toBe('1');
	});
});
