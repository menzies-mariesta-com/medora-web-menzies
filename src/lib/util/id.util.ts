/**
 * Shared ID helpers. Prefer this over importing `uuidv7` or `crypto.randomUUID`
 * for entity / optimistic IDs so the app stays on UUID v7.
 *
 * Existing DB rows may still be UUID v4 from older inserts; new inserts use v7.
 * Do not rewrite historical UUIDs unless a PK type migration requires it.
 */
import { uuidv7 } from 'uuidv7';

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Generate a new UUID v7 (time-ordered). Safe on server and browser. */
export function uuidV7(): string {
	return uuidv7();
}

/** True if `raw` is a canonical UUID string (any version). */
export function isUuid(raw: unknown): raw is string {
	if (typeof raw !== 'string') return false;
	return UUID_RE.test(raw.trim());
}

/**
 * Parse a UUID from query/body/state. Returns trimmed UUID or `null`.
 * Rejects empty strings and non-UUID values (including legacy integer visit ids).
 */
export function parseUuid(raw: unknown): string | null {
	if (raw == null) return null;
	const s = String(raw).trim();
	if (!s || !UUID_RE.test(s)) return null;
	return s;
}
