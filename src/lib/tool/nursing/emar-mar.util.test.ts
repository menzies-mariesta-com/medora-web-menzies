import { describe, expect, it } from 'vitest';
import type {
	MedicationAdministrationRow,
	MedicationLineRow,
	MedicationScheduleRow
} from '$lib/model/type/medora/clinical-platform.type';
import {
	buildMarGrid,
	canAdministerPrn,
	doseInstantsInWindow,
	isOneTimeOrder,
	isPrnOrder,
	prnMinIntervalHours,
	scheduledMarLines
} from '$lib/tool/nursing/emar-mar.util';

const lineStub = (
	overrides: Partial<MedicationLineRow> & { lineId: number }
): MedicationLineRow => ({
	lineNo: overrides.lineId,
	itemName: `Drug ${overrides.lineId}`,
	doseText: '1 g',
	routeName: 'Oral',
	instructions: null,
	orderTypeName: 'Routine',
	frequencyAbbreviation: 'BD',
	frequencyPerDay: '2',
	infusionType: null,
	rateMlHr: null,
	...overrides
});

const scheduleStub = (
	lineId: number,
	id: number,
	scheduledAt: string,
	overrides: Partial<MedicationScheduleRow> = {}
): MedicationScheduleRow => ({
	...lineStub({ lineId }),
	id,
	visitId: 'visit-1',
	scheduledAt,
	doseLabel: null,
	...overrides
});

const adminStub = (
	overrides: Partial<MedicationAdministrationRow> & {
		id: number;
		lineId: number;
	}
): MedicationAdministrationRow => ({
	scheduleId: null,
	administrationStatus: 'given',
	administeredAt: '2026-11-16T08:00:00.000Z',
	nurseInitials: 'AB',
	displayReason: null,
	...overrides
});

describe('prnMinIntervalHours', () => {
	it('derives the gap from doses per day', () => {
		expect(prnMinIntervalHours('4')).toBe(6);
		expect(prnMinIntervalHours(2)).toBe(12);
	});

	it('falls back to 4 hours when the frequency has no count', () => {
		expect(prnMinIntervalHours(null)).toBe(4);
		expect(prnMinIntervalHours('0')).toBe(4);
	});

	it('treats the seeded PRN master (1 per day) as the 4-hour floor', () => {
		// `as needed (PRN)` is seeded with frequency_per_day = 1 — a count, not an interval.
		expect(prnMinIntervalHours('1')).toBe(4);
	});
});

describe('isPrnOrder / isOneTimeOrder', () => {
	it('reads the PRN abbreviation or order type', () => {
		expect(isPrnOrder('PRN', 'Routine')).toBe(true);
		expect(isPrnOrder(null, 'prn')).toBe(true);
		expect(isPrnOrder('BD', 'Routine')).toBe(false);
	});

	it('treats STAT and One-time as single-dose orders', () => {
		expect(isOneTimeOrder('STAT')).toBe(true);
		expect(isOneTimeOrder('one-time')).toBe(true);
		expect(isOneTimeOrder('Routine')).toBe(false);
		expect(isOneTimeOrder(null)).toBe(false);
	});
});

describe('canAdministerPrn', () => {
	const last = '2026-11-16T08:00:00.000Z';

	it('blocks a second dose inside the interval', () => {
		const result = canAdministerPrn({
			lastGivenAt: last,
			minIntervalHours: 6,
			now: '2026-11-16T13:59:00.000Z'
		});
		expect(result.allowed).toBe(false);
		expect(result.retryAt).toBe('2026-11-16T14:00:00.000Z');
	});

	it('allows the dose exactly at the boundary', () => {
		expect(
			canAdministerPrn({
				lastGivenAt: last,
				minIntervalHours: 6,
				now: '2026-11-16T14:00:00.000Z'
			}).allowed
		).toBe(true);
	});

	it('allows the first dose when nothing was given', () => {
		expect(
			canAdministerPrn({ lastGivenAt: null, minIntervalHours: 6 }).allowed
		).toBe(true);
	});
});

describe('doseInstantsInWindow', () => {
	it('steps a BD order across two days inside the window', () => {
		const instants = doseInstantsInWindow({
			startAt: '2026-11-16T08:00:00.000Z',
			endAt: '2026-11-18T08:00:00.000Z',
			dosesPerDay: 2,
			from: '2026-11-16T00:00:00.000Z',
			to: '2026-11-17T23:59:00.000Z'
		});
		expect(instants).toEqual([
			'2026-11-16T08:00:00.000Z',
			'2026-11-16T20:00:00.000Z',
			'2026-11-17T08:00:00.000Z',
			'2026-11-17T20:00:00.000Z'
		]);
	});

	it('emits a single instant for a one-time order', () => {
		const instants = doseInstantsInWindow({
			startAt: '2026-11-16T08:00:00.000Z',
			endAt: null,
			dosesPerDay: 2,
			from: '2026-11-16T00:00:00.000Z',
			to: '2026-11-20T00:00:00.000Z',
			oneTime: true
		});
		expect(instants).toEqual(['2026-11-16T08:00:00.000Z']);
	});

	it('never runs past the line end date', () => {
		const instants = doseInstantsInWindow({
			startAt: '2026-11-16T08:00:00.000Z',
			endAt: '2026-11-16T20:00:00.000Z',
			dosesPerDay: 2,
			from: '2026-11-16T00:00:00.000Z',
			to: '2026-11-20T00:00:00.000Z'
		});
		expect(instants).toEqual([
			'2026-11-16T08:00:00.000Z',
			'2026-11-16T20:00:00.000Z'
		]);
	});

	it('returns nothing for an inverted window', () => {
		expect(
			doseInstantsInWindow({
				startAt: '2026-11-16T08:00:00.000Z',
				endAt: null,
				dosesPerDay: 1,
				from: '2026-11-17T00:00:00.000Z',
				to: '2026-11-16T00:00:00.000Z'
			})
		).toEqual([]);
	});
});

describe('buildMarGrid', () => {
	const now = '2026-11-16T21:00:00.000Z';

	it('groups doses per order line and marks lateness', () => {
		const grid = buildMarGrid({
			schedules: [
				scheduleStub(1, 10, '2026-11-16T08:00:00.000Z'),
				scheduleStub(1, 11, '2026-11-16T20:00:00.000Z'),
				scheduleStub(2, 12, '2026-11-16T08:00:00.000Z')
			],
			administrations: [
				adminStub({
					id: 1,
					lineId: 1,
					scheduleId: 10,
					administeredAt: '2026-11-16T08:05:00.000Z'
				})
			],
			now,
			formatColumnLabel: (at) => at.slice(11, 16)
		});

		expect(grid.columns.map((c) => c.label)).toEqual(['08:00', '20:00']);
		expect(grid.lines).toHaveLength(2);

		const [first, second] = grid.lines;
		expect(first.lineId).toBe(1);
		expect(first.cells[0]?.state).toBe('given');
		expect(first.cells[1]?.state).toBe('pending');
		expect(second.lineId).toBe(2);
		expect(second.cells[0]?.state).toBe('late');
		expect(second.cells[1]).toBeNull();
	});

	it('flags STAT lines and sorts them first', () => {
		const grid = buildMarGrid({
			schedules: [
				scheduleStub(1, 20, '2026-11-16T08:00:00.000Z'),
				scheduleStub(2, 21, '2026-11-16T08:00:00.000Z', {
					orderTypeName: 'STAT'
				})
			],
			administrations: [],
			now,
			formatColumnLabel: (at) => at.slice(11, 16)
		});
		expect(grid.lines[0]?.lineId).toBe(2);
		expect(grid.lines[0]?.isStat).toBe(true);
	});

	it('keeps PRN lines out of the grid but exposes the next allowed dose', () => {
		const prnLine = lineStub({
			lineId: 9,
			orderTypeName: 'PRN',
			frequencyAbbreviation: 'PRN',
			frequencyPerDay: '4'
		});
		const grid = buildMarGrid({
			schedules: [scheduleStub(1, 30, '2026-11-16T08:00:00.000Z')],
			administrations: [
				adminStub({
					id: 2,
					lineId: 9,
					administeredAt: '2026-11-16T20:00:00.000Z'
				})
			],
			prnLines: [prnLine],
			now,
			formatColumnLabel: (at) => at.slice(11, 16)
		});

		const prn = grid.lines.find((line) => line.lineId === 9);
		expect(prn?.isPrn).toBe(true);
		expect(prn?.cells.every((cell) => cell == null)).toBe(true);
		expect(prn?.lastGivenAt).toBe('2026-11-16T20:00:00.000Z');
		expect(prn?.prnNextAllowedAt).toBe('2026-11-17T02:00:00.000Z');
	});

	it('returns an empty grid for an empty window', () => {
		const grid = buildMarGrid({ schedules: [], administrations: [] });
		expect(grid.columns).toEqual([]);
		expect(grid.lines).toEqual([]);
	});

	it('treats a continuous infusion line as on-demand, not scheduled', () => {
		const grid = buildMarGrid({
			schedules: [scheduleStub(1, 40, '2026-11-16T08:00:00.000Z')],
			administrations: [],
			prnLines: [
				lineStub({
					lineId: 7,
					itemName: 'Normal Saline 1000 mL',
					orderTypeName: 'Routine',
					frequencyAbbreviation: 'Q24H',
					frequencyPerDay: '1',
					infusionType: 'continuous',
					rateMlHr: '100'
				})
			],
			now,
			formatColumnLabel: (at) => at.slice(11, 16)
		});
		const infusion = grid.lines.find((line) => line.lineId === 7);
		expect(infusion?.isInfusion).toBe(true);
		expect(infusion?.isOnDemand).toBe(true);
		expect(infusion?.isPrn).toBe(false);
		expect(scheduledMarLines(grid).map((line) => line.lineId)).toEqual([1]);
	});
});
