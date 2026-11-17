/**
 * Pure eMAR / BCMA scheduling + MAR grid math. No DB access, so the nursing
 * chart page and the server module share one definition of "due", "PRN locked"
 * and "late".
 */
import {
	MedicationAdministrationStatusEnum,
	MedicationInfusionTypeEnum
} from '$lib/model/enum/clinical-platform.enum';
import type {
	MedicationAdministrationRow,
	MedicationLineRow,
	MedicationScheduleRow
} from '$lib/model/type/medora/clinical-platform.type';
import { parseUtcInstant } from '$lib/util/utc-instant.util';

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const HOURS_PER_DAY = 24;
/** PRN frequency without a per-day count falls back to a 4-hour gap. */
const DEFAULT_PRN_INTERVAL_HOURS = 4;
/** A due dose stays "pending" for an hour; after that it reads as late. */
const LATE_GRACE_MINUTES = 60;
/** Backfill guard: 2000 doses is far beyond any real order window. */
const MAX_INSTANTS = 2000;

const PRN_ABBREVIATION = 'PRN';
const ONE_TIME_ORDER_TYPES = new Set(['stat', 'one-time']);

export type MarCellState =
	| 'pending'
	| 'late'
	| 'given'
	| 'held'
	| 'refused'
	| 'not_given';

export type MarGridCell = {
	scheduleId: number | null;
	scheduledAt: string;
	state: MarCellState;
	administration: MedicationAdministrationRow | null;
};

export type MarLine = {
	lineId: number;
	lineNo: number;
	itemName: string;
	doseText: string;
	routeName: string | null;
	instructions: string | null;
	orderTypeName: string | null;
	isStat: boolean;
	/** Actual PRN order (frequency abbreviation or order type). */
	isPrn: boolean;
	/** Charted on demand instead of a time column: every PRN and continuous infusion line. */
	isOnDemand: boolean;
	/** Continuous pump infusion: charted with start/stop, not per due dose. */
	isInfusion: boolean;
	infusionType: string | null;
	rateMlHr: string | null;
	lastGivenAt: string | null;
	/** Set for PRN lines: earliest instant the next dose may be given. */
	prnNextAllowedAt: string | null;
	cells: (MarGridCell | null)[];
};

export type MarGrid = {
	columns: { at: string; label: string }[];
	lines: MarLine[];
};

function toMs(value: string | Date | null | undefined): number {
	if (value == null) return NaN;
	return value instanceof Date ? value.getTime() : parseUtcInstant(value);
}

function isEmptyText(value: string | null | undefined): boolean {
	return value == null || value.trim() === '';
}

/** Frequency master `frequency_per_day`; 0 when unknown. */
export function dosesPerDay(raw: string | number | null | undefined): number {
	const n = Number(raw);
	return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Minimum gap between PRN doses, derived from the frequency master. A PRN
 * frequency carries `frequency_per_day = 1` (it is "as needed", not 24-hourly),
 * so a count of one or less is not an interval and falls back to 4 hours.
 */
export function prnMinIntervalHours(perDay: string | number | null): number {
	const n = dosesPerDay(perDay);
	// shortcut: PRN interval comes from frequency_per_day, not a prescriber field, so a
	// custom "min 6 h" PRN order cannot be expressed yet. Add the column when requested.
	return n > 1 ? HOURS_PER_DAY / n : DEFAULT_PRN_INTERVAL_HOURS;
}

export function isPrnOrder(
	frequencyAbbreviation: string | null | undefined,
	orderTypeName: string | null | undefined
): boolean {
	return (
		(frequencyAbbreviation ?? '').trim().toUpperCase() ===
			PRN_ABBREVIATION ||
		(orderTypeName ?? '').trim().toLowerCase() === 'prn'
	);
}

/** STAT / One-time orders get exactly one dose, whatever the frequency says. */
export function isOneTimeOrder(
	orderTypeName: string | null | undefined
): boolean {
	return ONE_TIME_ORDER_TYPES.has(
		(orderTypeName ?? '').trim().toLowerCase()
	);
}

/**
 * Due instants for one order line inside `[from, to]`, stepped by
 * `24 / dosesPerDay` hours from `startAt` and capped at `endAt`.
 */
export function doseInstantsInWindow(input: {
	startAt: string;
	endAt: string | null;
	dosesPerDay: number;
	from: string;
	to: string;
	oneTime?: boolean;
}): string[] {
	const startMs = toMs(input.startAt);
	const fromMs = toMs(input.from);
	const windowToMs = toMs(input.to);
	if (!Number.isFinite(startMs) || !Number.isFinite(fromMs)) return [];
	if (!Number.isFinite(windowToMs) || windowToMs < fromMs) return [];

	const perDay = input.dosesPerDay;
	const stepMs =
		input.oneTime || perDay <= 0
			? Infinity
			: (HOURS_PER_DAY / perDay) * MS_PER_HOUR;
	const endMs = input.oneTime ? startMs : toMs(input.endAt);

	const anchor = Math.round(startMs / MS_PER_MINUTE) * MS_PER_MINUTE;
	const out: string[] = [];
	for (let index = 0; index < MAX_INSTANTS; index++) {
		const at = Number.isFinite(stepMs)
			? anchor + index * stepMs
			: index === 0
				? anchor
				: Infinity;
		if (at > windowToMs || at > endMs) break;
		if (at >= fromMs) out.push(new Date(at).toISOString());
	}
	return out;
}

/** PRN hard stop: the same line may not be given twice inside the interval. */
export function canAdministerPrn(input: {
	lastGivenAt: string | null | undefined;
	minIntervalHours: number;
	now?: string | Date;
}): { allowed: boolean; retryAt: string | null } {
	const lastMs = toMs(input.lastGivenAt);
	if (!Number.isFinite(lastMs)) return { allowed: true, retryAt: null };
	const hours =
		Number.isFinite(input.minIntervalHours) && input.minIntervalHours > 0
			? input.minIntervalHours
			: DEFAULT_PRN_INTERVAL_HOURS;
	const retryMs = lastMs + hours * MS_PER_HOUR;
	const nowMs = toMs(input.now ?? new Date());
	if (!Number.isFinite(nowMs) || nowMs >= retryMs) {
		return { allowed: true, retryAt: null };
	}
	return { allowed: false, retryAt: new Date(retryMs).toISOString() };
}

/** Display-only column header (local clock, e.g. "08:00"). */
export function formatMarColumnLabel(at: string): string {
	const d = new Date(at);
	if (Number.isNaN(d.getTime())) return '';
	return d.toLocaleTimeString('en-GB', {
		hour: '2-digit',
		minute: '2-digit'
	});
}

function cellState(
	scheduledAt: string,
	administration: MedicationAdministrationRow | null,
	nowMs: number
): MarCellState {
	if (administration) {
		switch (administration.administrationStatus) {
			case MedicationAdministrationStatusEnum.GIVEN:
				return 'given';
			case MedicationAdministrationStatusEnum.HELD:
				return 'held';
			case MedicationAdministrationStatusEnum.REFUSED:
				return 'refused';
			case MedicationAdministrationStatusEnum.NOT_GIVEN:
				return 'not_given';
			default:
				return 'given';
		}
	}
	const dueMs = toMs(scheduledAt);
	return Number.isFinite(dueMs) &&
		dueMs + LATE_GRACE_MINUTES * MS_PER_MINUTE < nowMs
		? 'late'
		: 'pending';
}

/** One administration per due dose: the latest recorded wins. */
function byScheduleId(
	rows: MedicationAdministrationRow[]
): Map<number, MedicationAdministrationRow> {
	const map = new Map<number, MedicationAdministrationRow>();
	for (const row of rows) {
		if (row.scheduleId == null) continue;
		const current = map.get(row.scheduleId);
		if (
			!current ||
			(toMs(row.administeredAt) || 0) >= (toMs(current.administeredAt) || 0)
		) {
			map.set(row.scheduleId, row);
		}
	}
	return map;
}

function latestGivenAt(
	rows: MedicationAdministrationRow[],
	lineId: number
): string | null {
	let best: string | null = null;
	let bestMs = -Infinity;
	for (const row of rows) {
		if (row.lineId !== lineId) continue;
		if (row.administrationStatus !== MedicationAdministrationStatusEnum.GIVEN)
			continue;
		const ms = toMs(row.administeredAt);
		if (Number.isFinite(ms) && ms > bestMs) {
			bestMs = ms;
			best = row.administeredAt;
		}
	}
	return best;
}

function minuteBucket(at: string): number | null {
	const ms = toMs(at);
	return Number.isFinite(ms) ? Math.floor(ms / MS_PER_MINUTE) : null;
}

/**
 * Group due doses into MAR rows (order lines) × time columns. `prnLines` adds
 * as-needed / infusion rows with no time cells — the page lists them separately
 * with their hard-stop countdown.
 */
export function buildMarGrid(input: {
	schedules: MedicationScheduleRow[];
	administrations: MedicationAdministrationRow[];
	prnLines?: MedicationLineRow[];
	now?: string | Date;
	formatColumnLabel?: (at: string) => string;
}): MarGrid {
	const label = input.formatColumnLabel ?? formatMarColumnLabel;
	const nowMs = toMs(input.now ?? new Date());
	const adminBySchedule = byScheduleId(input.administrations);

	const columnByBucket = new Map<number, string>();
	for (const row of input.schedules) {
		const bucket = minuteBucket(row.scheduledAt);
		if (bucket == null) continue;
		const existing = columnByBucket.get(bucket);
		if (!existing || toMs(row.scheduledAt) < toMs(existing)) {
			columnByBucket.set(bucket, row.scheduledAt);
		}
	}
	const buckets = [...columnByBucket.keys()].sort((a, b) => a - b);
	const columns = buckets.map((bucket) => {
		const at = columnByBucket.get(bucket) as string;
		return { at, label: label(at) };
	});

	const linesById = new Map<number, MarLine>();

	function lineFrom(
		meta: MedicationLineRow,
		scheduledAt: string | null
	): MarLine {
		const perDay = dosesPerDay(meta.frequencyPerDay);
		const prn = isPrnOrder(meta.frequencyAbbreviation, meta.orderTypeName);
		const infusion =
			meta.infusionType === MedicationInfusionTypeEnum.CONTINUOUS;
		const onDemand = scheduledAt == null || prn || infusion;
		const lastGivenAt = latestGivenAt(input.administrations, meta.lineId);
		return {
			lineId: meta.lineId,
			lineNo: meta.lineNo,
			itemName: meta.itemName,
			doseText: meta.doseText,
			routeName: meta.routeName,
			instructions: isEmptyText(meta.instructions)
				? null
				: meta.instructions,
			orderTypeName: meta.orderTypeName,
			isStat: isOneTimeOrder(meta.orderTypeName),
			isPrn: prn,
			isOnDemand: onDemand,
			isInfusion: infusion,
			infusionType: meta.infusionType,
			rateMlHr: meta.rateMlHr,
			lastGivenAt,
			prnNextAllowedAt:
				prn && lastGivenAt
					? canAdministerPrn({
							lastGivenAt,
							minIntervalHours: prnMinIntervalHours(perDay),
							now: input.now ?? new Date()
						}).retryAt
					: null,
			cells: buckets.map(() => null)
		};
	}

	for (const meta of input.prnLines ?? []) {
		if (linesById.has(meta.lineId)) continue;
		linesById.set(meta.lineId, lineFrom(meta, null));
	}

	for (const row of input.schedules) {
		const line =
			linesById.get(row.lineId) ?? lineFrom(row, row.scheduledAt);
		linesById.set(row.lineId, line);
		const bucket = minuteBucket(row.scheduledAt);
		if (bucket == null) continue;
		const columnIndex = buckets.indexOf(bucket);
		if (columnIndex < 0) continue;
		const administration = adminBySchedule.get(row.id) ?? null;
		line.cells[columnIndex] = {
			scheduleId: row.id,
			scheduledAt: row.scheduledAt,
			state: cellState(row.scheduledAt, administration, nowMs),
			administration
		};
	}

	const lines = [...linesById.values()].sort(
		(a, b) =>
			Number(a.isOnDemand) - Number(b.isOnDemand) ||
			Number(b.isStat) - Number(a.isStat) ||
			a.lineNo - b.lineNo ||
			a.itemName.localeCompare(b.itemName)
	);

	return { columns, lines };
}

/** Lines with fixed time columns; as-needed / infusion rows render separately. */
export function scheduledMarLines(grid: MarGrid): MarLine[] {
	return grid.lines.filter((line) => !line.isOnDemand);
}

/** As-needed (PRN) lines that are not pumped infusions. */
export function prnMarLines(grid: MarGrid): MarLine[] {
	return grid.lines.filter((line) => line.isPrn && !line.isInfusion);
}

/** Continuous infusion lines: charted with start/stop, not per due dose. */
export function infusionMarLines(grid: MarGrid): MarLine[] {
	return grid.lines.filter((line) => line.isInfusion);
}
