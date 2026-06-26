import { error } from '@sveltejs/kit';
import { and, eq, isNull, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum, YesNoEnum } from '$lib/model/enum/db-link';
import { freeQtyToPurchaseUnitQty } from '$lib/tool/inventory/grn-free-qty-purchase.util';
import { purchaseUnitPriceToIssueUnitPriceString as purchaseUnitPriceToIssueUnitPriceStringFromFactors } from '$lib/tool/inventory/purchase-issue-price-convert.util';

/**
 * Convert a purchase quantity (in purchase units) to issue (stock) quantity
 * using item_unit_master factors: base = purchaseQty * purchaseFactor = issueQty * issueFactor.
 */
export function purchaseQtyToIssueQtyString(
	purchaseQtyStr: string,
	purchaseFactorStr: string,
	issueFactorStr: string
): string {
	const q = Number(purchaseQtyStr);
	const pf = Number(purchaseFactorStr);
	const itf = Number(issueFactorStr);
	if (
		!Number.isFinite(q) ||
		!Number.isFinite(pf) ||
		!Number.isFinite(itf)
	) {
		throw error(500, 'Invalid conversion inputs');
	}
	if (itf <= 0 || pf <= 0) {
		throw error(500, 'Unit conversion factors must be positive');
	}
	const issue = (q * pf) / itf;
	if (!Number.isFinite(issue)) {
		throw error(500, 'Unit conversion failed');
	}
	const rounded = Math.round(issue);
	if (Math.abs(issue - rounded) > 1e-9) {
		throw error(
			400,
			'Unit conversion must result in an integer quantity'
		);
	}
	return String(rounded);
}

/**
 * Convert an issue quantity (in issue units) to purchase quantity (in purchase units)
 * using item_unit_master factors: base = purchaseQty * purchaseFactor = issueQty * issueFactor.
 */
export function issueQtyToPurchaseQtyString(
	issueQtyStr: string,
	purchaseFactorStr: string,
	issueFactorStr: string
): string {
	const q = Number(issueQtyStr);
	const pf = Number(purchaseFactorStr);
	const itf = Number(issueFactorStr);
	if (
		!Number.isFinite(q) ||
		!Number.isFinite(pf) ||
		!Number.isFinite(itf)
	) {
		throw error(500, 'Invalid conversion inputs');
	}
	if (itf <= 0 || pf <= 0) {
		throw error(500, 'Unit conversion factors must be positive');
	}
	const purch = (q * itf) / pf;
	if (!Number.isFinite(purch)) {
		throw error(500, 'Unit conversion failed');
	}
	const rounded = Math.round(purch);
	if (Math.abs(purch - rounded) > 1e-9) {
		throw error(
			400,
			'Unit conversion must result in an integer quantity'
		);
	}
	return String(rounded);
}

export type ItemUnitMasterRow = {
	id: number;
	purchaseUnitId: number;
	issueUnitId: number;
	purchaseConversionFactor: string;
	issueConversionFactor: string;
};

/**
 * Resolves the item_unit_master for an item + purchase `unitId`, preferring
 * the item's default link when multiple IUMs share the same purchase unit.
 */
export async function resolveItemUnitMasterForItemPurchaseUnit(input: {
	hospitalId: string;
	itemId: number;
	purchaseUnitId: number;
}): Promise<{
	ium: ItemUnitMasterRow;
	issueUnitName: string | null;
}> {
	const links = await ensureDb()
		.select({
			link: table.itemMasterItemUnitMasterTable,
			ium: table.itemUnitMasterTable
		})
		.from(table.itemMasterItemUnitMasterTable)
		.innerJoin(
			table.itemUnitMasterTable,
			eq(
				table.itemMasterItemUnitMasterTable.itemUnitMasterId,
				table.itemUnitMasterTable.id
			)
		)
		.where(
			and(
				eq(
					table.itemMasterItemUnitMasterTable.hospitalId,
					input.hospitalId
				),
				eq(
					table.itemMasterItemUnitMasterTable.itemMasterId,
					input.itemId
				),
				eq(
					table.itemUnitMasterTable.purchaseUnitId,
					input.purchaseUnitId
				),
				isNull(table.itemMasterItemUnitMasterTable.deletedAt),
				isNull(table.itemUnitMasterTable.deletedAt),
				ne(table.itemUnitMasterTable.statusId, StatusEnum.DELETED)
			)
		);

	if (links.length === 0) {
		throw error(
			400,
			'Item has no item unit master for the selected purchase unit'
		);
	}

	const defaultLink =
		links.find((l) => l.link.isDefaultYesNo === YesNoEnum.YES) ??
		links[0];
	const i = defaultLink.ium;
	const [issueU] = await ensureDb()
		.select({ name: table.unitTable.name })
		.from(table.unitTable)
		.where(eq(table.unitTable.id, i.issueUnitId))
		.limit(1);

	return {
		ium: {
			id: i.id,
			purchaseUnitId: i.purchaseUnitId,
			issueUnitId: i.issueUnitId,
			purchaseConversionFactor: String(i.purchaseConversionFactor),
			issueConversionFactor: String(i.issueConversionFactor)
		},
		issueUnitName: issueU?.name ?? null
	};
}

/** All item_unit_masters linked to an item (active only). */
export async function listItemUnitMastersForItem(input: {
	hospitalId: string;
	itemId: number;
}): Promise<ItemUnitMasterRow[]> {
	const rows = await ensureDb()
		.select({ ium: table.itemUnitMasterTable })
		.from(table.itemMasterItemUnitMasterTable)
		.innerJoin(
			table.itemUnitMasterTable,
			eq(
				table.itemMasterItemUnitMasterTable.itemUnitMasterId,
				table.itemUnitMasterTable.id
			)
		)
		.where(
			and(
				eq(
					table.itemMasterItemUnitMasterTable.hospitalId,
					input.hospitalId
				),
				eq(
					table.itemMasterItemUnitMasterTable.itemMasterId,
					input.itemId
				),
				isNull(table.itemMasterItemUnitMasterTable.deletedAt),
				isNull(table.itemUnitMasterTable.deletedAt),
				ne(table.itemUnitMasterTable.statusId, StatusEnum.DELETED)
			)
		);
	return rows.map((r) => ({
		id: r.ium.id,
		purchaseUnitId: r.ium.purchaseUnitId,
		issueUnitId: r.ium.issueUnitId,
		purchaseConversionFactor: String(r.ium.purchaseConversionFactor),
		issueConversionFactor: String(r.ium.issueConversionFactor)
	}));
}

/** Issue quantity to add to `inv_stock` from a purchase-denominated receipt. */
export async function issueQtyStringFromPurchaseReceipt(input: {
	hospitalId: string;
	itemId: number;
	purchaseUnitId: number;
	purchaseQtyStr: string;
}): Promise<string> {
	const { ium } = await resolveItemUnitMasterForItemPurchaseUnit({
		hospitalId: input.hospitalId,
		itemId: input.itemId,
		purchaseUnitId: input.purchaseUnitId
	});
	return purchaseQtyToIssueQtyString(
		input.purchaseQtyStr,
		ium.purchaseConversionFactor,
		ium.issueConversionFactor
	);
}

/**
 * Convert a unit purchase price (price per purchase unit) to a unit issue price
 * (price per issue/stock unit) using item_unit_master factors:
 *
 * base = purchaseQty * purchaseFactor = issueQty * issueFactor
 * => issueQty per 1 purchase unit = purchaseFactor / issueFactor
 * => issueUnitPrice = purchaseUnitPrice / (purchaseFactor / issueFactor)
 *                 = purchaseUnitPrice * issueFactor / purchaseFactor
 */
export async function purchaseUnitPriceToIssueUnitPriceString(input: {
	hospitalId: string;
	itemId: number;
	purchaseUnitId: number;
	purchaseUnitPriceStr: string;
}): Promise<string> {
	const price = Number(input.purchaseUnitPriceStr);
	if (!Number.isFinite(price) || price <= 0) {
		throw error(400, 'Invalid purchase unit price');
	}
	const { ium } = await resolveItemUnitMasterForItemPurchaseUnit({
		hospitalId: input.hospitalId,
		itemId: input.itemId,
		purchaseUnitId: input.purchaseUnitId
	});
	const converted = purchaseUnitPriceToIssueUnitPriceStringFromFactors(
		price,
		ium.purchaseConversionFactor,
		ium.issueConversionFactor
	);
	if (converted == null) {
		throw error(500, 'Unit price conversion failed');
	}
	return converted;
}

const INTEGER_ISSUE_QTY_EPS = 1e-9;

function assertIntegerIssueQty(issue: number, context: string): string {
	if (!Number.isFinite(issue)) {
		throw error(500, 'Unit conversion failed');
	}
	const rounded = Math.round(issue);
	if (Math.abs(issue - rounded) > INTEGER_ISSUE_QTY_EPS) {
		throw error(
			400,
			`Unit conversion must result in an integer stock quantity (${context})`
		);
	}
	return String(rounded);
}

/** IUM row shape for multi-unit qty conversion (GRN free qty, etc.). */
export type IumFactorsForQty = ItemUnitMasterRow;

/**
 * Convert qty in any linked unit to issue (stock) qty for the line's purchase IUM.
 * UI sends purchase `unit.id` from the selected item unit master — use `preferredIumId` when set.
 */
export function issueQtyStringFromAnyUnit(params: {
	qty: number;
	unitId: number;
	linePurchaseUnitId: number;
	lineIssueUnitId: number;
	lineIum: {
		purchaseConversionFactor: string;
		issueConversionFactor: string;
	};
	allIums: IumFactorsForQty[];
	preferredIumId?: number | null;
}): string {
	const q = params.qty;
	if (!Number.isFinite(q) || q <= 0) return '0.000000';
	const pfLine = Number(params.lineIum.purchaseConversionFactor);
	const itfLine = Number(params.lineIum.issueConversionFactor);
	if (
		!Number.isFinite(pfLine) ||
		pfLine <= 0 ||
		!Number.isFinite(itfLine) ||
		itfLine <= 0
	) {
		throw error(500, 'Invalid unit conversion factors');
	}

	const baseFromIum = (
		ium: IumFactorsForQty,
		unitId: number,
		qty: number
	): number | null => {
		if (unitId === ium.purchaseUnitId) {
			const pf = Number(ium.purchaseConversionFactor);
			if (!Number.isFinite(pf) || pf <= 0) return null;
			return qty * pf;
		}
		if (unitId === ium.issueUnitId) {
			const itf = Number(ium.issueConversionFactor);
			if (!Number.isFinite(itf) || itf <= 0) return null;
			return qty * itf;
		}
		return null;
	};

	const base = (() => {
		if (params.preferredIumId != null) {
			const picked = params.allIums.find(
				(x) => x.id === params.preferredIumId
			);
			if (picked) {
				const b = baseFromIum(picked, params.unitId, q);
				if (b != null) return b;
				throw error(400, 'Invalid unit for selected conversion');
			}
		}
		const asPurch = params.allIums.find(
			(x) => x.purchaseUnitId === params.unitId
		);
		if (asPurch) {
			const b = baseFromIum(asPurch, params.unitId, q);
			if (b != null) return b;
		}
		if (params.unitId === params.linePurchaseUnitId) {
			return q * pfLine;
		}
		const asIssue = params.allIums.find(
			(x) => x.issueUnitId === params.unitId
		);
		if (asIssue) {
			const b = baseFromIum(asIssue, params.unitId, q);
			if (b != null) return b;
		}
		if (params.unitId === params.lineIssueUnitId) {
			return q * itfLine;
		}
		throw error(400, 'Invalid unit for this item');
	})();

	const issue = base / itfLine;
	return assertIntegerIssueQty(
		issue,
		`entered ${q} in selected unit; check received/free qty and item unit conversion factors`
	);
}

/** Convert free qty to the GRN line purchase-unit qty (for pricing / stock). */
export function freeQtyToLinePurchaseUnitQty(p: {
	freeQ: number;
	freeUnitId: number;
	linePurchaseUnitId: number;
	lineIssueUnitId: number;
	lineIum: {
		purchaseConversionFactor: string;
		issueConversionFactor: string;
	};
	pfOrdered: number;
	allIums: IumFactorsForQty[];
	preferredIumId?: number | null;
}): number {
	if (p.freeQ <= 0) return 0;

	const converted = freeQtyToPurchaseUnitQty({
		freeQ: p.freeQ,
		freeUnitId: p.freeUnitId,
		linePurchaseUnitId: p.linePurchaseUnitId,
		lineIssueUnitId: p.lineIssueUnitId,
		linePurchaseConversionFactor: p.lineIum.purchaseConversionFactor,
		lineIssueConversionFactor: p.lineIum.issueConversionFactor,
		allIums: p.allIums,
		preferredIumId: p.preferredIumId
	});

	if (converted <= 0 && p.freeUnitId !== p.linePurchaseUnitId) {
		throw error(400, 'Invalid free unit for this item');
	}
	return converted;
}
