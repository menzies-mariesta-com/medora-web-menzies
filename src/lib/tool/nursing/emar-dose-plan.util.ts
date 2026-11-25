/**
 * Which due doses an order line owes inside a window. Pure: the server module
 * feeds it active lines and writes the rows, the test feeds it stubs.
 */
import {
	doseInstantsInWindow,
	dosesPerDay,
	isOneTimeOrder,
	isOnDemandLine
} from '$lib/tool/nursing/emar-mar.util';
import { addDurationToStart } from '$lib/util/med-order-stagger.util';
import { parseUtcInstant } from '$lib/util/utc-instant.util';

export type EmarPlanLine = {
	lineId: number;
	startAt: string;
	durationValue: string;
	durationUnitId: number;
	frequencyAbbreviation: string | null;
	frequencyPerDay: string | number | null;
	orderTypeName: string | null;
	infusionType: string | null;
};

export type EmarPlannedDose = { lineId: number; scheduledAt: string };

/** Order line end instant: start + duration. Null when the start is unreadable. */
export function orderLineEndAt(
	line: Pick<EmarPlanLine, 'startAt' | 'durationValue' | 'durationUnitId'>,
	durUnits: { id: number; code: string }[]
): Date | null {
	const startMs = parseUtcInstant(line.startAt);
	if (!Number.isFinite(startMs)) return null;
	return addDurationToStart(
		new Date(startMs),
		line.durationValue,
		line.durationUnitId,
		durUnits
	);
}

/**
 * PRN and continuous-infusion lines are charted on demand, so they owe no due
 * instants. Everything else is stepped from its own start instant.
 *
 * shortcut: every dose is anchored on `startAt` + a fixed interval, so a
 * frequency that names clock times (08:00 / 20:00, `is_timing_required`) is
 * spread evenly instead. Add a timing column to the frequency master when a
 * hospital prescribes against fixed round times.
 */
export function planDosesForWindow(input: {
	lines: EmarPlanLine[];
	durUnits: { id: number; code: string }[];
	from: string;
	to: string;
}): EmarPlannedDose[] {
	const out: EmarPlannedDose[] = [];
	for (const line of input.lines) {
		if (isOnDemandLine(line)) continue;
		const endAt = orderLineEndAt(line, input.durUnits);
		if (!endAt) continue;
		for (const scheduledAt of doseInstantsInWindow({
			startAt: line.startAt,
			endAt: endAt.toISOString(),
			dosesPerDay: dosesPerDay(line.frequencyPerDay),
			from: input.from,
			to: input.to,
			oneTime: isOneTimeOrder(line.orderTypeName)
		})) {
			out.push({ lineId: line.lineId, scheduledAt });
		}
	}
	return out;
}
