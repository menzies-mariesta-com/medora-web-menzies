/**
 * Client-side mirror of server item-unit conversion (purchase ↔ issue qty).
 * Keeps UI validation aligned with posting rules without importing server modules.
 */
export function purchaseQtyToIssueQtyNumber(
	purchaseQtyStr: string,
	purchaseFactorStr: string,
	issueFactorStr: string
): number | null {
	const q = Number(purchaseQtyStr);
	const pf = Number(purchaseFactorStr);
	const itf = Number(issueFactorStr);
	if (
		!Number.isFinite(q) ||
		!Number.isFinite(pf) ||
		!Number.isFinite(itf) ||
		itf <= 0 ||
		pf <= 0
	) {
		return null;
	}
	const issue = (q * pf) / itf;
	return Number.isFinite(issue) ? issue : null;
}
