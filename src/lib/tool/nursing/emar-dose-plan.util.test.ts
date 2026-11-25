import { describe, expect, it } from 'vitest';
import {
	orderLineEndAt,
	planDosesForWindow,
	type EmarPlanLine
} from '$lib/tool/nursing/emar-dose-plan.util';

const DUR_UNITS = [
	{ id: 1, code: 'minute' },
	{ id: 2, code: 'hour' },
	{ id: 3, code: 'day' },
	{ id: 4, code: 'week' },
	{ id: 5, code: 'month' }
];

const line = (overrides: Partial<EmarPlanLine> & { lineId: number }): EmarPlanLine => ({
	startAt: '2026-11-16T08:00:00.000Z',
	durationValue: '2',
	durationUnitId: 3,
	frequencyAbbreviation: 'BD',
	frequencyPerDay: '2',
	orderTypeName: 'Routine',
	infusionType: null,
	...overrides
});

describe('orderLineEndAt', () => {
	it('adds the duration to the start instant', () => {
		expect(
			orderLineEndAt(
				{
					startAt: '2026-11-16T08:00:00.000Z',
					durationValue: '2',
					durationUnitId: 3
				},
				DUR_UNITS
			)?.toISOString()
		).toBe('2026-11-18T08:00:00.000Z');
	});

	it('returns null for an unreadable start', () => {
		expect(
			orderLineEndAt(
				{ startAt: 'not a date', durationValue: '2', durationUnitId: 3 },
				DUR_UNITS
			)
		).toBeNull();
	});

	it('anchors an offset-less DB instant as UTC, not local', () => {
		// Neon returns "2026-11-16 08:00:00"; +06:30 of drift would move it to 01:30Z.
		expect(
			orderLineEndAt(
				{
					startAt: '2026-11-16 08:00:00',
					durationValue: '1',
					durationUnitId: 3
				},
				DUR_UNITS
			)?.toISOString()
		).toBe('2026-11-17T08:00:00.000Z');
	});
});

describe('planDosesForWindow', () => {
	it('steps a BD line across two days', () => {
		const doses = planDosesForWindow({
			lines: [line({ lineId: 1 })],
			durUnits: DUR_UNITS,
			from: '2026-11-16T00:00:00.000Z',
			to: '2026-11-17T23:59:00.000Z'
		});
		expect(doses).toEqual([
			{ lineId: 1, scheduledAt: '2026-11-16T08:00:00.000Z' },
			{ lineId: 1, scheduledAt: '2026-11-16T20:00:00.000Z' },
			{ lineId: 1, scheduledAt: '2026-11-17T08:00:00.000Z' },
			{ lineId: 1, scheduledAt: '2026-11-17T20:00:00.000Z' }
		]);
	});

	it('never plans a dose past the order end date', () => {
		const doses = planDosesForWindow({
			lines: [line({ lineId: 1, durationValue: '1' })],
			durUnits: DUR_UNITS,
			from: '2026-11-16T00:00:00.000Z',
			to: '2026-11-20T00:00:00.000Z'
		});
		// End is 17th 08:00, so the 17th 20:00 dose is outside the order.
		expect(doses.map((d) => d.scheduledAt)).toEqual([
			'2026-11-16T08:00:00.000Z',
			'2026-11-16T20:00:00.000Z',
			'2026-11-17T08:00:00.000Z'
		]);
	});

	it('plans a single instant for a one-time order', () => {
		const doses = planDosesForWindow({
			lines: [line({ lineId: 1, orderTypeName: 'STAT' })],
			durUnits: DUR_UNITS,
			from: '2026-11-16T00:00:00.000Z',
			to: '2026-11-20T00:00:00.000Z'
		});
		expect(doses).toEqual([
			{ lineId: 1, scheduledAt: '2026-11-16T08:00:00.000Z' }
		]);
	});

	it('skips PRN and continuous-infusion lines', () => {
		const doses = planDosesForWindow({
			lines: [
				line({ lineId: 1 }),
				line({ lineId: 2, orderTypeName: 'PRN', frequencyAbbreviation: 'PRN' }),
				line({ lineId: 3, infusionType: 'continuous' })
			],
			durUnits: DUR_UNITS,
			from: '2026-11-16T00:00:00.000Z',
			to: '2026-11-16T23:59:00.000Z'
		});
		expect([...new Set(doses.map((d) => d.lineId))]).toEqual([1]);
	});

	it('returns nothing when no line matches the window', () => {
		expect(
			planDosesForWindow({
				lines: [line({ lineId: 1 })],
				durUnits: DUR_UNITS,
				from: '2026-12-01T00:00:00.000Z',
				to: '2026-12-02T00:00:00.000Z'
			})
		).toEqual([]);
	});
});
