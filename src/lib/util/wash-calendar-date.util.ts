/** ISO calendar-day helpers — match Design `calendarDate` (local timezone). Day-only and optional local datetime. */

export const DEFAULT_CALENDAR_TIME = '09:00:00';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;
const DATETIME_LOCAL_RE =
	/^(\d{4}-\d{2}-\d{2})(?:T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?)?$/;

/** Normalize to `HH:mm:ss`, or null if invalid. Seconds default to `00`. */
export function normalizeTime(time: string | undefined | null): string | null {
	if (!time) return null;
	const m = TIME_RE.exec(time.trim());
	if (!m) return null;
	return `${m[1]}:${m[2]}:${m[3] ?? '00'}`;
}

/**
 * Split a single-mode calendar value into date + time.
 * Accepts `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm` / `YYYY-MM-DDTHH:mm:ss`.
 */
export function parseDateTimeLocal(
	value: string,
	defaultTime: string = DEFAULT_CALENDAR_TIME
): { date: string; time: string } {
	const raw = value.trim();
	const fallback = normalizeTime(defaultTime) ?? '09:00:00';
	if (!raw) return { date: '', time: fallback };
	const dt = DATETIME_LOCAL_RE.exec(raw);
	if (dt) {
		const date = dt[1] ?? '';
		const hh = dt[2];
		const mm = dt[3];
		const ss = dt[4];
		return {
			date,
			time:
				hh != null && mm != null
					? `${hh}:${mm}:${ss ?? '00'}`
					: fallback
		};
	}
	const dayOnly = parseISODate(raw);
	if (dayOnly) return { date: toISODate(dayOnly), time: fallback };
	return { date: '', time: fallback };
}

/** Join date + time as local `YYYY-MM-DDTHH:mm:ss`. */
export function formatDateTimeLocal(date: string, time: string): string {
	if (!date) return '';
	return `${date}T${normalizeTime(time) ?? '09:00:00'}`;
}

/** Extract `YYYY-MM-DD` from a day or datetime-local string. */
export function toISODateFromDateTime(value: string): string {
	return parseDateTimeLocal(value).date;
}

/** Current local `HH:mm:ss` (exact second; `stepSeconds` ignored for clock picker). */
export function currentTimeRounded(_stepSeconds?: number): string {
	const now = new Date();
	return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}

/** Whether the locale prefers a 12-hour clock. */
export function uses12HourClock(locale?: string): boolean {
	try {
		const opts = new Intl.DateTimeFormat(locale || undefined, {
			hour: 'numeric'
		}).resolvedOptions();
		return opts.hourCycle === 'h11' || opts.hourCycle === 'h12';
	} catch {
		return true;
	}
}

export function splitTimeParts(time: string): {
	hour24: number;
	minute: number;
	second: number;
} {
	const [h, m, s] = (normalizeTime(time) ?? '09:00:00').split(':').map(Number);
	return { hour24: h ?? 0, minute: m ?? 0, second: s || 0 };
}

export function joinTimeParts(
	hour24: number,
	minute: number,
	second = 0
): string {
	const h = ((hour24 % 24) + 24) % 24;
	const m = Math.max(0, Math.min(59, minute));
	const s = Math.max(0, Math.min(59, second));
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function toHour12(hour24: number): {
	hour12: number;
	period: 'AM' | 'PM';
} {
	const period = hour24 >= 12 ? 'PM' : 'AM';
	return {
		hour12: hour24 % 12 === 0 ? 12 : hour24 % 12,
		period
	};
}

export function fromHour12(hour12: number, period: 'AM' | 'PM'): number {
	const h = ((hour12 % 12) + 12) % 12;
	return period === 'PM' ? h + 12 : h;
}

/** Locale-aware display with seconds, e.g. `10:40:05 AM`. */
export function formatTimeDisplay(time: string, locale?: string): string {
	const { hour24, minute, second } = splitTimeParts(time);
	const d = new Date(2000, 0, 1, hour24, minute, second);
	try {
		return new Intl.DateTimeFormat(locale || undefined, {
			hour: 'numeric',
			minute: '2-digit',
			second: '2-digit'
		}).format(d);
	} catch {
		const { hour12, period } = toHour12(hour24);
		return `${hour12}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')} ${period}`;
	}
}

export function toISODate(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseISODate(iso: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
	if (!m) return null;
	const y = Number(m[1]);
	const mo = Number(m[2]);
	const d = Number(m[3]);
	const date = new Date(y, mo - 1, d);
	if (
		date.getFullYear() !== y ||
		date.getMonth() !== mo - 1 ||
		date.getDate() !== d
	) {
		return null;
	}
	return date;
}

export function shiftISODate(iso: string, days: number): string {
	const date = parseISODate(iso);
	if (!date) return iso;
	date.setDate(date.getDate() + days);
	return toISODate(date);
}

export function compareISODate(a: string, b: string): number {
	if (a === b) return 0;
	return a < b ? -1 : 1;
}

export function clampISODate(iso: string, min?: string, max?: string): string {
	let next = iso;
	if (min && compareISODate(next, min) < 0) next = min;
	if (max && compareISODate(next, max) > 0) next = max;
	return next;
}

export function startOfMonth(isoOrDate: string | Date): Date {
	const d =
		typeof isoOrDate === 'string' ? parseISODate(isoOrDate) : new Date(isoOrDate);
	if (!d) {
		const now = new Date();
		return new Date(now.getFullYear(), now.getMonth(), 1);
	}
	return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(date: Date, delta: number): Date {
	return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function daysInMonth(year: number, monthIndex: number): number {
	return new Date(year, monthIndex + 1, 0).getDate();
}

/** Weekday index 0=Sun … 6=Sat, adjusted so `firstDayOfWeek` is column 0. */
export function weekdayColumn(
	dayOfWeek: number,
	firstDayOfWeek: number
): number {
	return (dayOfWeek - firstDayOfWeek + 7) % 7;
}

export function parseRangeValue(value: string): { start: string; end: string } {
	const [start = '', end = ''] = value.split('/');
	return { start: start.trim(), end: end.trim() };
}

export function formatRangeValue(start: string, end: string): string {
	const a = compareISODate(start, end) <= 0 ? start : end;
	const b = compareISODate(start, end) <= 0 ? end : start;
	return `${a}/${b}`;
}

export function parseMultiValue(value: string): string[] {
	return value
		.split(/\s+/)
		.map((s) => s.trim())
		.filter(Boolean);
}

export function formatMultiValue(dates: string[]): string {
	return [...new Set(dates)].sort().join(' ');
}

export function isISOInRange(iso: string, start: string, end: string): boolean {
	return compareISODate(iso, start) >= 0 && compareISODate(iso, end) <= 0;
}

export type WashCalendarCell = {
	iso: string;
	date: Date;
	inMonth: boolean;
	day: number;
};

export function buildMonthCells(
	view: Date,
	firstDayOfWeek: number,
	showOutsideDays: boolean
): WashCalendarCell[] {
	const year = view.getFullYear();
	const month = view.getMonth();
	const lead = weekdayColumn(
		new Date(year, month, 1).getDay(),
		firstDayOfWeek
	);
	const dim = daysInMonth(year, month);
	const cells: WashCalendarCell[] = [];
	const prev = addMonths(view, -1);
	const prevDim = daysInMonth(prev.getFullYear(), prev.getMonth());
	for (let i = 0; i < lead; i++) {
		const day = prevDim - lead + i + 1;
		const date = new Date(prev.getFullYear(), prev.getMonth(), day);
		cells.push({ iso: toISODate(date), date, inMonth: false, day });
	}
	for (let day = 1; day <= dim; day++) {
		const date = new Date(year, month, day);
		cells.push({ iso: toISODate(date), date, inMonth: true, day });
	}
	const trail = (7 - (cells.length % 7)) % 7;
	const next = addMonths(view, 1);
	for (let i = 0; i < trail; i++) {
		const day = i + 1;
		const date = new Date(next.getFullYear(), next.getMonth(), day);
		cells.push({ iso: toISODate(date), date, inMonth: false, day });
	}
	if (!showOutsideDays) {
		return cells.map((c) =>
			c.inMonth ? c : { ...c, iso: '', day: 0 }
		);
	}
	return cells;
}

export function weekdayLabels(
	locale: string,
	firstDayOfWeek: number
): string[] {
	const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
	const labels: string[] = [];
	for (let i = 0; i < 7; i++) {
		const dow = (firstDayOfWeek + i) % 7;
		const d = new Date(2024, 0, 7 + dow);
		labels.push(fmt.format(d));
	}
	return labels;
}

export function monthOptions(
	locale: string
): Array<{ value: number; label: string }> {
	const fmt = new Intl.DateTimeFormat(locale, { month: 'long' });
	return Array.from({ length: 12 }, (_, i) => ({
		value: i,
		label: fmt.format(new Date(2024, i, 1))
	}));
}
