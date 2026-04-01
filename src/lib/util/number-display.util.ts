/**
 * Consistent digit grouping (e.g. 100,000,000.00) across the app.
 * Uses `en-US` so thousands separators are commas regardless of runtime locale.
 */
const LOCALE = 'en-US';

/** Shown when a numeric cell has no value (matches existing tables). */
export const NUMBER_DISPLAY_EMPTY = '–';

export type NumberDisplayInput = number | string | null | undefined;

function parseFiniteNumber(value: NumberDisplayInput): number | null {
	if (value == null || value === '') return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
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
	const n = parseFiniteNumber(value);
	if (n === null) return String(value);
	return n.toLocaleString(LOCALE, {
		minimumFractionDigits: options?.minFractionDigits ?? 0,
		maximumFractionDigits: options?.maxFractionDigits ?? 2
	});
}

/** Money / billing lines: always two decimal places with comma grouping. */
export function formatMoneyAmount(
	value: NumberDisplayInput,
	emptyDisplay = NUMBER_DISPLAY_EMPTY
): string {
	if (value == null || value === '') return emptyDisplay;
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
