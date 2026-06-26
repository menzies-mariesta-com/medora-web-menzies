/** Purchase-unit unit price → issue (stock) unit price using IUM factors. */
export function purchaseUnitPriceToIssueUnitPriceNumber(
	purchaseUnitPrice: number,
	purchaseConversionFactor: string | number,
	issueConversionFactor: string | number
): number | null {
	if (!Number.isFinite(purchaseUnitPrice) || purchaseUnitPrice <= 0) {
		return null;
	}
	const pf = Number(purchaseConversionFactor);
	const itf = Number(issueConversionFactor);
	if (!Number.isFinite(pf) || !Number.isFinite(itf) || pf <= 0 || itf <= 0) {
		return null;
	}
	const issueUnitPrice = (purchaseUnitPrice * itf) / pf;
	return Number.isFinite(issueUnitPrice) ? issueUnitPrice : null;
}

export function purchaseUnitPriceToIssueUnitPriceString(
	purchaseUnitPrice: number,
	purchaseConversionFactor: string | number,
	issueConversionFactor: string | number
): string | null {
	const n = purchaseUnitPriceToIssueUnitPriceNumber(
		purchaseUnitPrice,
		purchaseConversionFactor,
		issueConversionFactor
	);
	return n != null ? n.toFixed(2) : null;
}
