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

function normalizeMoneyPatch<T extends Record<string, unknown>>(
	payload: T,
	keys: readonly (keyof T)[]
): T {
	const out = { ...payload };
	for (const key of keys) {
		if (!(key in out) || out[key] === undefined) continue;
		const v = out[key];
		out[key] =
			v == null || String(v).trim() === ''
				? (null as T[keyof T])
				: (toDbMoney2dp(v as NumberDisplayInput) as T[keyof T]);
	}
	return out;
}

export function normalizeServiceOrderDetailWrite<
	T extends {
		discount?: unknown;
		serviceAmount?: unknown;
		serviceTaxAmount?: unknown;
	}
>(payload: T): T {
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
>(payload: T): T {
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
>(payload: T): T {
	const patched = normalizeMoneyPatch(payload, [
		'discount',
		'serviceAmount',
		'serviceTaxAmount',
		'lineTotal'
	]);
	if (
		'lineTotal' in patched &&
		(patched.lineTotal == null || String(patched.lineTotal).trim() === '')
	) {
		patched.lineTotal = toDbMoney2dp(0) as T[keyof T];
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
>(payload: T): T {
	return normalizeOpBillingLineWrite(payload);
}
