/** Instant for a timestamptz column. Always UTC (`…Z`). */
export function toUtcIsoString(value: Date | number = new Date()): string {
	const date = value instanceof Date ? value : new Date(value);
	return date.toISOString();
}

/** Z, +00, +00:00, or +0000. Neon returns timestamptz as "…+00". */
const HAS_OFFSET = /(?:[zZ]|[+-]\d{2}(?::?\d{2})?)$/;

/**
 * Parse a DB instant. Offset-less strings are UTC.
 * Node otherwise treats "2026-11-03 09:25:00" as local and shifts +06:30.
 */
export function parseUtcInstant(value: string | Date | null | undefined): number {
	if (value == null) return NaN;
	if (value instanceof Date) return value.getTime();
	const raw = value.trim();
	if (!raw) return NaN;
	if (HAS_OFFSET.test(raw)) return new Date(raw).getTime();
	const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
	return new Date(`${iso}Z`).getTime();
}
