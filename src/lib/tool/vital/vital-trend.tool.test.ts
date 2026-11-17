import { describe, expect, it } from 'vitest';
import {
	buildVitalSeries,
	latestVitalReading,
	type VitalTrendSourceRow
} from '$lib/tool/vital/vital-trend.tool';

type Row = VitalTrendSourceRow & { pulse: string | null; rbs: string | null };

const row = (
	id: number,
	recordedAt: string | null,
	pulse: string | null,
	rbs: string | null = null
): Row => ({ id, recordedAt, pulse, rbs });

describe('buildVitalSeries', () => {
	it('drops blanks and keeps chronological order', () => {
		const series = buildVitalSeries(
			[
				row(2, '2026-11-02 09:00:00', '88'),
				row(1, '2026-11-01 09:00:00', '72'),
				row(3, '2026-11-03 09:00:00', null),
				row(4, '2026-11-04 09:00:00', '')
			],
			'pulse'
		);
		expect(series.map((p) => p.value)).toEqual([72, 88]);
		expect(series.map((p) => p.row.id)).toEqual([1, 2]);
	});

	it('treats offset-less timestamps as UTC, not local', () => {
		// 09:00 UTC stays 09:00Z; a local parse would shift it by the machine offset.
		const [point] = buildVitalSeries(
			[row(1, '2026-11-01 09:00:00', '72')],
			'pulse'
		);
		expect(point.at).toBe(Date.parse('2026-11-01T09:00:00Z'));
	});

	it('skips rows with an unparseable timestamp', () => {
		const series = buildVitalSeries(
			[row(1, null, '72'), row(2, 'not a date', '80')],
			'pulse'
		);
		expect(series).toEqual([]);
	});

	it('returns an empty series when nothing has that vital', () => {
		expect(buildVitalSeries([row(1, '2026-11-01 09:00:00', null)], 'pulse')).toEqual(
			[]
		);
	});
});

describe('latestVitalReading', () => {
	it('picks the newest row that has a value', () => {
		const latest = latestVitalReading(
			[
				row(1, '2026-11-01 09:00:00', '72'),
				row(2, '2026-11-02 09:00:00', null, '110'),
				row(3, '2026-11-03 09:00:00', '90')
			],
			'rbs'
		);
		expect(latest?.value).toBe(110);
		expect(latest?.row.id).toBe(2);
	});

	it('keeps the row tie-breaking stable for identical timestamps', () => {
		const latest = latestVitalReading(
			[
				row(1, '2026-11-01 09:00:00', '70'),
				row(2, '2026-11-01 09:00:00', '80')
			],
			'pulse'
		);
		expect(latest?.value).toBe(80);
	});

	it('returns null with no readings', () => {
		expect(latestVitalReading([], 'pulse')).toBeNull();
	});
});
