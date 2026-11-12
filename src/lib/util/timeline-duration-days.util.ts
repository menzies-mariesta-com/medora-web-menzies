/** Stored as day equivalents. Unit Master edits this in hours. */
export const DEFAULT_TIMELINE_DURATION_DAYS = 1;
export const DEFAULT_TIMELINE_UNIT_LABEL = 'Day';
const HOURS_PER_DAY = 24;

export function parseTimelineDurationDays(
	value: string | number | null | undefined
): number | null {
	if (value == null || value === '') return null;
	const n = Number(value);
	if (!Number.isFinite(n) || n <= 0) return null;
	return Math.round(n * 1_000_000) / 1_000_000;
}

/** Day-equivalent string for DB (no trailing zeros; matches numeric(18,6)). */
export function formatTimelineDurationDays(
	value: string | number | null | undefined
): string {
	const parsed = parseTimelineDurationDays(value);
	if (parsed == null) return '';
	return parsed.toFixed(6).replace(/\.?0+$/, '');
}

/** Normalized string for DB / snapshots. */
export function timelineDurationDaysToDbString(
	value: string | number | null | undefined
): string | null {
	const parsed = parseTimelineDurationDays(value);
	if (parsed == null) return null;
	return formatTimelineDurationDays(parsed);
}

/** Hours shown in Unit Master for a stored day-equivalent duration. */
export function formatTimelineDurationHours(
	storedDays: string | number | null | undefined
): string {
	const days = parseTimelineDurationDays(storedDays);
	if (days == null) return '';
	const hours = Math.round(days * HOURS_PER_DAY * 10_000) / 10_000;
	return hours.toFixed(4).replace(/\.?0+$/, '');
}

/** Unit Master hour input → day-equivalent string stored on the unit. */
export function timelineHoursToDbDaysString(
	hours: string | number | null | undefined
): string | null {
	if (hours == null || hours === '') return null;
	const n = Number(hours);
	if (!Number.isFinite(n) || n <= 0) return null;
	const days = Math.round((n / HOURS_PER_DAY) * 1_000_000) / 1_000_000;
	return days.toFixed(6).replace(/\.?0+$/, '');
}

/**
 * Day-equivalent duration → hours for bill qty.
 * Snaps values that are within ~1s of a whole hour (fixes 1/24 → 0.041667 noise).
 */
export function timelineDurationDaysToHours(durationDays: number): number {
	if (!Number.isFinite(durationDays) || durationDays <= 0) {
		return HOURS_PER_DAY;
	}
	const hours = durationDays * HOURS_PER_DAY;
	const nearest = Math.round(hours);
	if (Math.abs(hours - nearest) < 0.0001) return nearest;
	return Math.round(hours * 10_000) / 10_000;
}
