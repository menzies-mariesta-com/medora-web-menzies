import { error } from '@sveltejs/kit';
import {
	optionalMoneyDecimal2dp,
	requireMoneyDecimal2dp
} from '$lib/server/medora/money-field.server';

function asTrimmedString(v: unknown): string {
	return typeof v === 'string' ? v.trim() : String(v ?? '').trim();
}

export function parseIdInt(v: unknown, fieldName: string): number {
	const n = typeof v === 'number' ? v : Number(asTrimmedString(v));
	if (!Number.isInteger(n) || n <= 0) {
		throw error(400, `${fieldName} is required`);
	}
	return n;
}

export function parseUuid(v: unknown, fieldName: string): string {
	const s = asTrimmedString(v);
	// UUIDv7 still matches the standard UUID format.
	if (
		!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
			s
		)
	) {
		throw error(400, `${fieldName} is required`);
	}
	return s;
}

export function parseOptionalTrimmedString(
	v: unknown,
	fieldName: string,
	maxLen: number
): string | null {
	const s = asTrimmedString(v);
	if (!s) return null;
	if (s.length > maxLen) throw error(400, `${fieldName} is too long`);
	return s;
}

/** Accepts YYYY-MM-DD (stored as string in DB). */
export function parseIsoDateYmd(
	v: unknown,
	fieldName: string
): string {
	const s = asTrimmedString(v);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(s))
		throw error(400, `${fieldName} is invalid`);
	return s;
}

export function parseIntStrict(
	v: unknown,
	fieldName: string
): number {
	const s = asTrimmedString(v);
	if (!/^-?\d+$/.test(s))
		throw error(400, `${fieldName} must be an integer`);
	const n = Number(s);
	if (!Number.isSafeInteger(n))
		throw error(400, `${fieldName} is out of range`);
	return n;
}

export function parsePositiveIntQty(
	v: unknown,
	fieldName: string
): number {
	const n = parseIntStrict(v, fieldName);
	if (n <= 0) throw error(400, `${fieldName} must be > 0`);
	return n;
}

export function parseNonNegativeIntQty(
	v: unknown,
	fieldName: string
): number {
	const n = parseIntStrict(v, fieldName);
	if (n < 0) throw error(400, `${fieldName} must be >= 0`);
	return n;
}

/**
 * Money-like numeric string/number normalized to exactly 2 decimals for DB storage.
 * Accepts longer fractional input; rounds half-up (see `toFixedDecimalString`).
 */
export function parseMoney2dp(v: unknown, fieldName: string): string {
	return requireMoneyDecimal2dp(v, fieldName);
}

/** Like parseMoney2dp, but empty/null becomes null. */
export function parseOptionalMoney2dp(
	v: unknown,
	fieldName: string
): string | null {
	return optionalMoneyDecimal2dp(v, fieldName);
}
