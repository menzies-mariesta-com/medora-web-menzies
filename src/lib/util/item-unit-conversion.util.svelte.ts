/**
 * Human-readable purchase → issue conversion (same formula as server).
 * Factors are "base units per 1 labeled unit".
 */
export function formatItemUnitConversionDisplay(input: {
	purchaseUnitName: string;
	issueUnitName: string;
	purchaseFactor: number;
	issueFactor: number;
}): string {
	const p = input.purchaseFactor;
	const i = input.issueFactor;
	const pu = (input.purchaseUnitName || 'purchase').trim() || 'purchase';
	const iu = (input.issueUnitName || 'issue').trim() || 'issue';
	if (!Number.isFinite(p) || !Number.isFinite(i) || i <= 0 || p <= 0) {
		return '—';
	}
	const ratio = p / i;
	let rLabel: string;
	if (Number.isInteger(ratio)) {
		rLabel = String(ratio);
	} else {
		rLabel = ratio
			.toFixed(6)
			.replace(/\.?0+$/, '');
	}
	return `1 ${pu} = ${rLabel} ${iu}`;
}

export function parsePositiveDecimal(raw: string): number {
	const n = Number(String(raw).trim().replace(/,/g, ''));
	if (!Number.isFinite(n) || n <= 0) return NaN;
	return n;
}
