export type GrnFreeUnitIum = {
	id?: number | null;
	purchaseUnitId?: number | null;
	issueUnitId?: number | null;
	purchaseConversionFactor?: string | number | null;
	issueConversionFactor?: string | number | null;
};

/** Map a stored free `unit.id` back to an item-unit-master row for the dropdown. */
export function resolveFreeUnitIumId(
	iumList: GrnFreeUnitIum[],
	freeUnitId: number | string | null | undefined,
	fallbackIumId?: number | null
): number | null {
	const unitId =
		freeUnitId != null && freeUnitId !== ''
			? Number(freeUnitId)
			: null;
	if (unitId != null && Number.isFinite(unitId)) {
		const byPurchase = iumList.find(
			(u) => typeof u.id === 'number' && u.purchaseUnitId === unitId
		);
		if (byPurchase?.id != null) return byPurchase.id;
		const byIssue = iumList.find(
			(u) => typeof u.id === 'number' && u.issueUnitId === unitId
		);
		if (byIssue?.id != null) return byIssue.id;
	}
	if (fallbackIumId != null && iumList.some((u) => u.id === fallbackIumId)) {
		return fallbackIumId;
	}
	const first = iumList.find((u) => typeof u.id === 'number');
	return first?.id ?? null;
}

export function freeUnitIdFromIum(
	ium: GrnFreeUnitIum | null | undefined
): number | null {
	return ium?.purchaseUnitId ?? null;
}

const INTEGER_ISSUE_EPS = 1e-9;

/**
 * Client mirror of server `issueQtyStringFromAnyUnit` integer check.
 * Returns null when conversion is not a whole issue qty (would fail GRN post).
 */
export function issueQtyFromAnyUnitNumber(input: {
	qty: number;
	unitId: number;
	linePurchaseUnitId: number;
	lineIssueUnitId: number;
	lineIum: {
		purchaseConversionFactor: string | number;
		issueConversionFactor: string | number;
	};
	allIums: GrnFreeUnitIum[];
	preferredIumId?: number | null;
}): number | null {
	const q = input.qty;
	if (!Number.isFinite(q) || q <= 0) return 0;
	const pfLine = Number(input.lineIum.purchaseConversionFactor);
	const itfLine = Number(input.lineIum.issueConversionFactor);
	if (
		!Number.isFinite(pfLine) ||
		pfLine <= 0 ||
		!Number.isFinite(itfLine) ||
		itfLine <= 0
	) {
		return null;
	}
	const baseFromIum = (
		ium: GrnFreeUnitIum,
		unitId: number,
		qty: number
	): number | null => {
		if (unitId === ium.purchaseUnitId) {
			const pf = Number(ium.purchaseConversionFactor);
			return Number.isFinite(pf) && pf > 0 ? qty * pf : null;
		}
		if (unitId === ium.issueUnitId) {
			const itf = Number(ium.issueConversionFactor);
			return Number.isFinite(itf) && itf > 0 ? qty * itf : null;
		}
		return null;
	};
	let base: number | null = null;
	if (input.preferredIumId != null) {
		const picked = input.allIums.find((x) => x.id === input.preferredIumId);
		if (picked) base = baseFromIum(picked, input.unitId, q);
	}
	if (base == null) {
		const asPurch = input.allIums.find(
			(x) => x.purchaseUnitId === input.unitId
		);
		if (asPurch) base = baseFromIum(asPurch, input.unitId, q);
	}
	if (base == null && input.unitId === input.linePurchaseUnitId) {
		base = q * pfLine;
	}
	if (base == null) {
		const asIssue = input.allIums.find(
			(x) => x.issueUnitId === input.unitId
		);
		if (asIssue) base = baseFromIum(asIssue, input.unitId, q);
	}
	if (base == null && input.unitId === input.lineIssueUnitId) {
		base = q * itfLine;
	}
	if (base == null || !Number.isFinite(base)) return null;
	const issue = base / itfLine;
	if (!Number.isFinite(issue)) return null;
	const rounded = Math.round(issue);
	if (Math.abs(issue - rounded) > INTEGER_ISSUE_EPS) return null;
	return rounded;
}
