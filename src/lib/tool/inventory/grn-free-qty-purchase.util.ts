import { issueQtyToPurchaseQtyNumber } from '$lib/tool/inventory/purchase-issue-qty-convert.util';

export type GrnFreeQtyIum = {
	id?: number;
	purchaseUnitId: number;
	issueUnitId: number;
	purchaseConversionFactor: string | number;
	issueConversionFactor: string | number;
};

/**
 * Converts GRN line `free_qty` (in `free_unit_id`) to the line purchase unit
 * for use in the pricing formula denominator.
 */
export function freeQtyToPurchaseUnitQty(input: {
	freeQ: number;
	freeUnitId: number;
	linePurchaseUnitId: number;
	lineIssueUnitId: number;
	linePurchaseConversionFactor: string | number;
	lineIssueConversionFactor: string | number;
	allIums: GrnFreeQtyIum[];
	preferredIumId?: number | null;
}): number {
	const freeQ = input.freeQ;
	if (!Number.isFinite(freeQ) || freeQ <= 0) return 0;

	const pfOrdered = Number(input.linePurchaseConversionFactor);
	if (!Number.isFinite(pfOrdered) || pfOrdered <= 0) return 0;

	const baseFromIum = (
		ium: GrnFreeQtyIum,
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

	const toPurchaseViaBase = (base: number): number => base / pfOrdered;

	if (input.preferredIumId != null) {
		const picked = input.allIums.find((x) => x.id === input.preferredIumId);
		if (picked) {
			const base = baseFromIum(picked, input.freeUnitId, freeQ);
			if (base != null) return toPurchaseViaBase(base);
		}
	}

	const asPurch = input.allIums.find(
		(x) => x.purchaseUnitId === input.freeUnitId
	);
	if (asPurch) {
		const base = baseFromIum(asPurch, input.freeUnitId, freeQ);
		if (base != null) return toPurchaseViaBase(base);
	}

	if (input.freeUnitId === input.linePurchaseUnitId) {
		return freeQ;
	}

	const asIssue = input.allIums.find(
		(x) => x.issueUnitId === input.freeUnitId
	);
	if (asIssue) {
		const base = baseFromIum(asIssue, input.freeUnitId, freeQ);
		if (base != null) return toPurchaseViaBase(base);
	}

	if (input.freeUnitId === input.lineIssueUnitId) {
		const purch = issueQtyToPurchaseQtyNumber(
			String(freeQ),
			String(input.linePurchaseConversionFactor),
			String(input.lineIssueConversionFactor)
		);
		return purch != null && purch > 0 ? purch : 0;
	}

	return 0;
}

/** Purchase-unit qty for cost denominator: received + converted free (when flagged). */
export function purchaseUnitDenominatorQty(input: {
	purchasedQty: number;
	freeQtyPurchaseUnit: number;
	includeFreeQtyInDenominator: boolean;
}): number {
	const r = input.purchasedQty;
	if (!Number.isFinite(r) || r <= 0) return 0;
	if (!input.includeFreeQtyInDenominator) return r;
	const f = input.freeQtyPurchaseUnit;
	if (!Number.isFinite(f) || f <= 0) return r;
	return r + f;
}
