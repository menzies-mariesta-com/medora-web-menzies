/** Local calendar start of day (00:00:00.000). */
export function medOrderStartOfLocalDay(d: Date = new Date()): Date {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x;
}

/** `true` when `startAt` is strictly before today's local date. */
export function isMedOrderStartBeforeToday(
	startAt: Date | string,
	now: Date = new Date()
): boolean {
	const st = new Date(startAt);
	if (Number.isNaN(st.getTime())) return true;
	return st.getTime() < medOrderStartOfLocalDay(now).getTime();
}

/** Minimum value for `<input type="datetime-local">` (start of today, local). */
export function medOrderMinStartDateTimeLocal(now: Date = new Date()): string {
	const d = medOrderStartOfLocalDay(now);
	const y = d.getFullYear();
	const mo = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${mo}-${day}T00:00`;
}
