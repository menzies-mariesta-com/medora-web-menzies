import {
	issueQtyToPurchaseQtyNumber,
	purchaseQtyToIssueQtyNumber
} from '$lib/tool/inventory/purchase-issue-qty-convert.util';

export type MedOrderIumUnitIds = {
	purchaseUnitId: number;
	issueUnitId: number;
	purchaseConversionFactor: string;
	issueConversionFactor: string;
};

export function unitSalePriceForOutUnit(
	prices: {
		unitSalePricePurchase: string;
		unitSalePriceIssue: string;
	},
	outUnitId: number,
	ium: Pick<MedOrderIumUnitIds, 'purchaseUnitId' | 'issueUnitId'>
): string {
	if (outUnitId === ium.issueUnitId) return prices.unitSalePriceIssue;
	if (outUnitId === ium.purchaseUnitId) return prices.unitSalePricePurchase;
	return prices.unitSalePricePurchase;
}

/** Converts sale qty in `outUnitId` to purchase-unit qty string. */
export function outQtyToPurchaseQtyString(
	qtyOut: string,
	outUnitId: number,
	ium: MedOrderIumUnitIds
): string {
	const q = qtyOut.trim();
	if (!q) return '';
	if (outUnitId === ium.purchaseUnitId) return q;
	if (outUnitId === ium.issueUnitId) {
		const purch = issueQtyToPurchaseQtyNumber(
			q,
			ium.purchaseConversionFactor,
			ium.issueConversionFactor
		);
		if (purch == null || !Number.isFinite(purch)) return '';
		const rounded = Math.round(purch * 1e6) / 1e6;
		return String(rounded);
	}
	return q;
}

/** Converts purchase-unit total to qty in `outUnitId`. */
export function purchaseQtyToOutQtyString(
	purchaseQty: string,
	outUnitId: number,
	ium: MedOrderIumUnitIds
): string {
	const q = purchaseQty.trim();
	if (!q) return '';
	if (outUnitId === ium.purchaseUnitId) return q;
	if (outUnitId === ium.issueUnitId) {
		const issue = purchaseQtyToIssueQtyNumber(
			q,
			ium.purchaseConversionFactor,
			ium.issueConversionFactor
		);
		if (issue == null || !Number.isFinite(issue)) return '';
		const rounded = Math.round(issue * 1e6) / 1e6;
		return String(rounded);
	}
	return q;
}

export function medOrderLineTotal(qtyOut: string, unitSalePrice: string): number {
	const q = Number(qtyOut);
	const p = Number(unitSalePrice);
	if (!Number.isFinite(q) || !Number.isFinite(p) || q < 0 || p < 0) return 0;
	return Math.round(q * p * 100) / 100;
}

/** Internal sales always use issue unit; convert qty when loading legacy lines. */
export function normalizeInternalMedOrderOutUnit(
	qtyOut: string,
	outUnitId: number,
	ium: MedOrderIumUnitIds
): { qtyOut: string; outUnitId: number } {
	const issueId = ium.issueUnitId;
	if (!issueId) return { qtyOut, outUnitId };
	if (!outUnitId || outUnitId === issueId || !qtyOut.trim()) {
		return { qtyOut, outUnitId: issueId };
	}
	const purch = outQtyToPurchaseQtyString(qtyOut, outUnitId, ium);
	const nextQty = purch
		? purchaseQtyToOutQtyString(purch, issueId, ium)
		: qtyOut;
	return { qtyOut: nextQty, outUnitId: issueId };
}

/** Purchase + issue unit options for external sale unit picker. */
export function medOrderOutUnitOptions(
	ium: MedOrderIumUnitIds & {
		purchaseUnitName?: string;
		issueUnitName?: string;
	}
): { label: string; value: string }[] {
	const opts = [
		{
			label: ium.purchaseUnitName?.trim() || 'Purchase unit',
			value: String(ium.purchaseUnitId)
		},
		{
			label: ium.issueUnitName?.trim() || 'Issue unit',
			value: String(ium.issueUnitId)
		}
	];
	const seen = new Set<string>();
	return opts.filter((o) => {
		if (seen.has(o.value)) return false;
		seen.add(o.value);
		return true;
	});
}

/** All distinct sale units across every conversion linked to the item. */
export function medOrderOutUnitOptionsFromIumList(
	iumList: (MedOrderIumUnitIds & {
		purchaseUnitName?: string;
		issueUnitName?: string;
	})[]
): { label: string; value: string }[] {
	const byId = new Map<string, string>();
	for (const ium of iumList) {
		for (const o of medOrderOutUnitOptions(ium)) {
			if (!byId.has(o.value)) byId.set(o.value, o.label);
		}
	}
	return [...byId.entries()].map(([value, label]) => ({ value, label }));
}

type MedOrderIumRow = MedOrderIumUnitIds & { id: number };

/**
 * Pick the item_unit_master whose purchase or issue unit matches the sale unit.
 * When several conversions share the same unit, prefer `preferIumId` then purchase-side match.
 */
export function resolveMedOrderIumForOutUnit(
	iumList: MedOrderIumRow[],
	outUnitId: number,
	preferIumId?: number | null
): MedOrderIumRow | null {
	if (iumList.length === 0) return null;
	if (!outUnitId) return iumList[0] ?? null;

	const matches = iumList.filter(
		(u) => u.purchaseUnitId === outUnitId || u.issueUnitId === outUnitId
	);
	if (matches.length === 0) return iumList[0] ?? null;
	if (matches.length === 1) return matches[0]!;

	if (preferIumId != null && preferIumId > 0) {
		const pref = matches.find((u) => u.id === preferIumId);
		if (pref) return pref;
	}

	const asPurchase = matches.filter((u) => u.purchaseUnitId === outUnitId);
	if (asPurchase.length === 1) return asPurchase[0]!;

	return matches[0]!;
}

/** Sale unit display name from IUM list + out unit id. */
export function medOrderOutUnitName(
	iumList: (MedOrderIumUnitIds & {
		id: number;
		purchaseUnitName?: string;
		issueUnitName?: string;
	})[],
	outUnitId: number,
	preferIumId?: number | null
): string {
	const ium = resolveMedOrderIumForOutUnit(iumList, outUnitId, preferIumId);
	if (!ium || !outUnitId) return '';
	if (outUnitId === ium.issueUnitId) {
		return ium.issueUnitName?.trim() || '';
	}
	if (outUnitId === ium.purchaseUnitId) {
		return ium.purchaseUnitName?.trim() || '';
	}
	return '';
}
