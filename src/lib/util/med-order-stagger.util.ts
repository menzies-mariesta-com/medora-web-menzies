/**
 * Stagger medication order line start times: line[i] starts when line[i-1] ends,
 * where "end" = start + duration (per duration unit from masters). Does not
 * change dose, frequency, or duration — only `startAt` on lines after the first.
 */

export type MedOrderStaggerLine = {
	startAt: string;
	durationValue: string;
	durationUnitId: number;
};

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/**
 * @param fromStart  Start of the *previous* line (anchor moment).
 * @param durationValue  Raw duration text from the line (e.g. "3", "1.5").
 * @param durationUnitId  FK to `med_order_duration_unit.id`.
 * @param durUnits  Master rows with `id` and `code` (minute, hour, day, week, month).
 * @returns  Start time for the *next* line (after `fromStart` + previous line’s duration).
 */
export function addDurationToStart(
	fromStart: Date,
	durationValue: string,
	durationUnitId: number,
	durUnits: { id: number; code: string }[]
): Date {
	const raw = Number(String(durationValue).trim());
	const n = Number.isFinite(raw) && raw >= 0 ? raw : 0;
	const code = (
		durUnits.find((u) => u.id === durationUnitId)?.code ?? 'day'
	).toLowerCase();

	if (n === 0) {
		return new Date(fromStart);
	}

	const d = new Date(fromStart);

	switch (code) {
		case 'minute':
			return new Date(d.getTime() + n * MS_PER_MINUTE);
		case 'hour':
			return new Date(d.getTime() + n * MS_PER_HOUR);
		case 'day':
			return new Date(d.getTime() + n * MS_PER_DAY);
		case 'week':
			return new Date(d.getTime() + n * 7 * MS_PER_DAY);
		case 'month': {
			// Calendar months for whole numbers; fractional / remainder as ~30.44-day months.
			const whole = Math.trunc(n);
			const frac = n - whole;
			const d2 = new Date(d);
			d2.setMonth(d2.getMonth() + whole);
			if (frac > 0) {
				d2.setTime(
					d2.getTime() + frac * 30.44 * MS_PER_DAY
				);
			}
			return d2;
		}
		default:
			return new Date(d.getTime() + n * MS_PER_DAY);
	}
}

/**
 * Recompute `startAt` for every line after the first. First line keeps its current
 * `startAt` (order anchor). For i ≥ 1: start[i] = end of line i-1, where end = start + duration of line i-1.
 */
export function applyStaggeredStartDates<T extends MedOrderStaggerLine>(
	lines: T[],
	durUnits: { id: number; code: string }[]
): T[] {
	if (lines.length <= 1) return lines.map((l) => ({ ...l }));
	if (!durUnits.length) return lines.map((l) => ({ ...l }));
	const out: T[] = lines.map((l) => ({ ...l }) as T);
	for (let i = 1; i < out.length; i++) {
		const prev = out[i - 1]!;
		const next = addDurationToStart(
			new Date(prev.startAt),
			prev.durationValue,
			prev.durationUnitId,
			durUnits
		);
		out[i] = { ...out[i]!, startAt: next.toISOString() } as T;
	}
	return out;
}
