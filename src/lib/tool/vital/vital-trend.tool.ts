import { toNumber } from '$lib/config/vital.config';
import { parseUtcInstant } from '$lib/util/utc-instant.util';

/** Numeric vital fields the Visual dashboard charts. */
export type VitalTrendKey =
	| 'bpSystolic'
	| 'bpDiastolic'
	| 'pulse'
	| 'temperature'
	| 'respiration'
	| 'weight'
	| 'spO2'
	| 'rbs';

/** Rows only need the timestamp and the numeric fields (decimals arrive as strings). */
export type VitalTrendSourceRow = {
	id: number;
	recordedAt: string | null;
	visitNo?: string | null;
} & Partial<Record<VitalTrendKey, string | null>>;

export type VitalTrendPoint<T> = {
	/** UTC instant in ms — d3 `scaleTime` input. */
	at: number;
	value: number;
	row: T;
};

/**
 * Oldest-first trend points for one vital, dropping blanks.
 * Rows with an unparseable timestamp are skipped: a chart cannot place them.
 */
export function buildVitalSeries<T extends VitalTrendSourceRow>(
	rows: T[],
	key: VitalTrendKey
): VitalTrendPoint<T>[] {
	const points: VitalTrendPoint<T>[] = [];
	for (const row of rows) {
		const value = toNumber(row[key] ?? null);
		if (value == null) continue;
		const at = parseUtcInstant(row.recordedAt);
		if (!Number.isFinite(at)) continue;
		points.push({ at, value, row });
	}
	return points.sort((a, b) => a.at - b.at);
}

/** Newest reading that actually has a value for this vital. */
export function latestVitalReading<T extends VitalTrendSourceRow>(
	rows: T[],
	key: VitalTrendKey
): VitalTrendPoint<T> | null {
	const series = buildVitalSeries(rows, key);
	return series.length > 0 ? series[series.length - 1] : null;
}
