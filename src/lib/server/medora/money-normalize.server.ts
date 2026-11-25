import type { NumberDisplayInput } from '$lib/util/number-display.util';
import {
	normalizeMoneyDecimal2dpOrNull,
	normalizeMoneyDecimal2dpOrZero
} from '$lib/server/medora/money-field.server';

/** Persisted `decimal(*, 2)` value — always exactly two fractional digits. */
export function toDbMoney2dp(value: NumberDisplayInput): string {
	return normalizeMoneyDecimal2dpOrZero(value);
}

export function toDbMoney2dpOrNull(
	value: NumberDisplayInput
): string | null {
	return normalizeMoneyDecimal2dpOrNull(value);
}

/**
 * Money keys are rewritten to 2dp **strings** (or null). Returning `T` claimed
 * the caller's numeric type survived, which broke the Drizzle insert types into
 * `never`; `Record<MoneyKey, string | null>` restores the truth.
 */
type MoneyKey = string;
/** Money keys become 2dp strings; `nullable` marks the columns that allow null. */
type MoneyPatch<T, K extends MoneyKey, N extends K = never> = Omit<T, K> &
	Record<Exclude<K, N>, string> &
	Record<N, string | null>;

function normalizeMoneyPatch<
	T extends Record<string, unknown>,
	K extends keyof T & MoneyKey,
	N extends K = never
>(payload: T, keys: readonly K[], nullableKeys: readonly N[] = []): MoneyPatch<T, K, N> {
	const out: Record<string, unknown> = { ...payload };
	for (const key of keys) {
		if (!(key in out) || out[key] === undefined) continue;
		const v = out[key];
		out[key] =
			v == null || String(v).trim() === ''
				? null
				: toDbMoney2dp(v as NumberDisplayInput);
	}
	return out as MoneyPatch<T, K, N>;
}

export function normalizeServiceOrderDetailWrite<
	T extends {
		discount?: unknown;
		serviceAmount?: unknown;
		serviceTaxAmount?: unknown;
	}
>(payload: T): MoneyPatch<T, 'discount' | 'serviceAmount' | 'serviceTaxAmount'> {
	return normalizeMoneyPatch(payload, [
		'discount',
		'serviceAmount',
		'serviceTaxAmount'
	]);
}

export function normalizeServiceOrderDetailRead<
	T extends {
		discount: string | null;
		serviceAmount: string | null;
		serviceTaxAmount: string | null;
	}
>(row: T): T {
	return {
		...row,
		discount: toDbMoney2dpOrNull(row.discount),
		serviceAmount: toDbMoney2dpOrNull(row.serviceAmount),
		serviceTaxAmount: toDbMoney2dpOrNull(row.serviceTaxAmount)
	};
}

export function normalizeOpBillingHeaderWrite<
	T extends {
		linesSubtotal?: unknown;
		discountPercent?: unknown;
		discountAmount?: unknown;
		totalAmount?: unknown;
		advanceAppliedAmount?: unknown;
		amountPaid?: unknown;
	}
>(
	payload: T
): MoneyPatch<
	T,
	| 'linesSubtotal'
	| 'discountPercent'
	| 'discountAmount'
	| 'totalAmount'
	| 'advanceAppliedAmount'
	| 'amountPaid'
> {
	return normalizeMoneyPatch(payload, [
		'linesSubtotal',
		'discountPercent',
		'discountAmount',
		'totalAmount',
		'advanceAppliedAmount',
		'amountPaid'
	]);
}

export function normalizeOpBillingLineWrite<
	T extends {
		discount?: unknown;
		serviceAmount?: unknown;
		serviceTaxAmount?: unknown;
		lineTotal?: unknown;
	}
>(
	payload: T
): MoneyPatch<
	T,
	'discount' | 'serviceAmount' | 'serviceTaxAmount' | 'lineTotal',
	'discount' | 'serviceAmount' | 'serviceTaxAmount'
> {
	const patched = normalizeMoneyPatch(
		payload,
		['discount', 'serviceAmount', 'serviceTaxAmount', 'lineTotal'],
		['discount', 'serviceAmount', 'serviceTaxAmount']
	);
	if (
		'lineTotal' in patched &&
		(patched.lineTotal == null || String(patched.lineTotal).trim() === '')
	) {
		(patched as { lineTotal: string }).lineTotal = toDbMoney2dp(0);
	}
	return patched;
}

export function normalizeIpBillingLineWrite<
	T extends {
		discount?: unknown;
		serviceAmount?: unknown;
		serviceTaxAmount?: unknown;
		lineTotal?: unknown;
	}
>(
	payload: T
): MoneyPatch<
	T,
	'discount' | 'serviceAmount' | 'serviceTaxAmount' | 'lineTotal',
	'discount' | 'serviceAmount' | 'serviceTaxAmount'
> {
	return normalizeOpBillingLineWrite(payload);
}
