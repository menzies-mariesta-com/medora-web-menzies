import { error } from '@sveltejs/kit';
import { toFixedDecimalString } from '$lib/util/number-display.util';

function asTrimmedString(v: unknown): string {
	return typeof v === 'string' ? v.trim() : String(v ?? '').trim();
}

export type ParseMoneyDecimalOptions = {
	/** When false, values below 0 are rejected (typical list prices / tax). */
	allowNegative?: boolean;
};

/**
 * Canonical money string for `decimal(…, scale: 2)` columns: always exactly 2 fractional digits.
 * Use on every server write (and optional read mapping) so DB + JSON stay consistent.
 */
export function requireMoneyDecimal2dp(
	v: unknown,
	fieldName: string,
	options?: ParseMoneyDecimalOptions
): string {
	const s = asTrimmedString(v);
	if (!s) throw error(400, `${fieldName} is required`);
	const fixed = toFixedDecimalString(s, 2);
	if (fixed == null) throw error(400, `${fieldName} is invalid`);
	const n = Number(fixed);
	if (!Number.isFinite(n)) throw error(400, `${fieldName} is invalid`);
	if (options?.allowNegative === false && n < 0) {
		throw error(400, `${fieldName} must be >= 0`);
	}
	return fixed;
}

/** Empty / null / undefined → null; otherwise same normalization as {@link requireMoneyDecimal2dp}. */
export function optionalMoneyDecimal2dp(
	v: unknown,
	fieldName: string,
	options?: ParseMoneyDecimalOptions
): string | null {
	if (v == null) return null;
	const s = asTrimmedString(v);
	if (!s) return null;
	return requireMoneyDecimal2dp(s, fieldName, options);
}

/** Normalize nullable DB/API money without throwing (legacy rows). */
export function normalizeMoneyDecimal2dpOrNull(
	value: string | null | undefined
): string | null {
	if (value == null || String(value).trim() === '') return null;
	return toFixedDecimalString(value, 2);
}

export function normalizeMoneyDecimal2dpOrZero(
	value: string | null | undefined
): string {
	return normalizeMoneyDecimal2dpOrNull(value) ?? '0.00';
}
