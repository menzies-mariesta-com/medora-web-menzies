/**
 * Consistent digit grouping (e.g. 100,000,000.00) across the app.
 * Uses `en-US` so thousands separators are commas regardless of runtime locale.
 */
const LOCALE = 'en-US';

/** Shown when a numeric cell has no value (matches existing tables). */
export const NUMBER_DISPLAY_EMPTY = '–';

export type NumberDisplayInput = number | string | null | undefined;

const PLAIN_DECIMAL = /^(-?)(\d+)(?:\.(\d+))?$/;

function parseFiniteNumber(value: NumberDisplayInput): number | null {
	if (value == null || value === '') return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

/** Round half-up to `scale` fractional digits without float string noise (money = scale 2). */
export function toFixedDecimalString(
	value: NumberDisplayInput,
	scale = 2
): string | null {
	if (value == null || value === '') return null;
	const raw = String(value).trim();
	if (raw === '') return null;

	const m = PLAIN_DECIMAL.exec(raw);
	if (m) {
		const sign = m[1] === '-' ? -1 : 1;
		const intPart = m[2];
		const frac = m[3] ?? '';
		if (scale <= 0) return String(sign * Number(intPart));

		if (frac.length <= scale) {
			const padded = frac.padEnd(scale, '0');
			return `${sign < 0 ? '-' : ''}${intPart}.${padded}`;
		}

		const keep = frac.slice(0, scale);
		const roundDigit = Number(frac[scale] ?? '0');
		let carry = roundDigit >= 5 ? 1 : 0;
		const digits = keep.split('').map((d) => Number(d));
		for (let i = digits.length - 1; i >= 0 && carry > 0; i -= 1) {
			const next = digits[i] + carry;
			if (next >= 10) {
				digits[i] = 0;
				carry = 1;
			} else {
				digits[i] = next;
				carry = 0;
			}
		}
		let intNum = Number(intPart);
		if (carry > 0) intNum += 1;
		const fracOut = digits.map(String).join('').padStart(scale, '0');
		return `${sign < 0 ? '-' : ''}${intNum}.${fracOut}`;
	}

	const n = Number(raw);
	if (!Number.isFinite(n)) return null;
	return (Math.round(n * 10 ** scale) / 10 ** scale).toFixed(scale);
}

/** Round to `scale` then strip trailing zeros for form inputs (8.0000 → 8). */
export function decimalInputStringFromScale(
	value: NumberDisplayInput,
	scale: number
): string {
	const fixed = toFixedDecimalString(value, scale);
	if (fixed == null) return '';
	return fixed.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
}

/** Money fields for inputs (strips trailing zeros after rounding to 2 dp). */
export function moneyInputStringFromDecimal(
	value: NumberDisplayInput
): string {
	return decimalInputStringFromScale(value, 2);
}

/** Money fields for API / DB writes (always 2 decimal places). */
export function toMoneyDecimalString(value: NumberDisplayInput): string {
	const fixed = toFixedDecimalString(value, 2);
	if (fixed == null) return '0.00';
	return fixed;
}

function formatPlainDecimalStringForLocale(
	raw: string,
	options: { minFractionDigits: number; maxFractionDigits: number }
): string | null {
	const rounded = toFixedDecimalString(raw, options.maxFractionDigits);
	if (rounded == null) return null;
	const n = Number(rounded);
	if (!Number.isFinite(n)) return null;
	return n.toLocaleString(LOCALE, {
		minimumFractionDigits: options.minFractionDigits,
		maximumFractionDigits: options.maxFractionDigits
	});
}

/**
 * General numeric display: comma grouping, 0–2 fraction digits by default
 * (trim trailing zeros for whole numbers).
 */
export function formatNumberDisplay(
	value: NumberDisplayInput,
	options?: {
		minFractionDigits?: number;
		maxFractionDigits?: number;
		emptyDisplay?: string;
	}
): string {
	const empty = options?.emptyDisplay ?? NUMBER_DISPLAY_EMPTY;
	if (value == null || value === '') return empty;
	const minFractionDigits = options?.minFractionDigits ?? 0;
	const maxFractionDigits = options?.maxFractionDigits ?? 2;
	if (typeof value === 'string') {
		const fromPlain = formatPlainDecimalStringForLocale(value, {
			minFractionDigits,
			maxFractionDigits
		});
		if (fromPlain != null) return fromPlain;
	}
	const n = parseFiniteNumber(value);
	if (n === null) return String(value);
	return n.toLocaleString(LOCALE, {
		minimumFractionDigits: minFractionDigits,
		maximumFractionDigits: maxFractionDigits
	});
}

/** Money / billing lines: always two decimal places with comma grouping. */
export function formatMoneyAmount(
	value: NumberDisplayInput,
	emptyDisplay = NUMBER_DISPLAY_EMPTY
): string {
	if (value == null || value === '') return emptyDisplay;
	const fixed = toFixedDecimalString(value, 2);
	if (fixed != null) {
		const n = Number(fixed);
		if (Number.isFinite(n)) {
			return n.toLocaleString(LOCALE, {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			});
		}
	}
	const n = parseFiniteNumber(value);
	if (n === null) return String(value);
	return n.toLocaleString(LOCALE, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}

/** Whole numbers with comma grouping (counts, units where decimals are unwanted). */
export function formatIntegerDisplay(
	value: NumberDisplayInput,
	emptyDisplay = NUMBER_DISPLAY_EMPTY
): string {
	if (value == null || value === '') return emptyDisplay;
	const n = parseFiniteNumber(value);
	if (n === null) return String(value);
	return n.toLocaleString(LOCALE, {
		maximumFractionDigits: 0
	});
}
