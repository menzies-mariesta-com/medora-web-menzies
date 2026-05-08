import { error } from '@sveltejs/kit';
import { and, eq, isNull, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum, YesNoEnum } from '$lib/model/enum/db-link';

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
	if (!Number.isFinite(q) || !Number.isFinite(pf) || !Number.isFinite(itf)) {
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
		throw error(400, 'Unit conversion must result in an integer quantity');
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
	if (!Number.isFinite(q) || !Number.isFinite(pf) || !Number.isFinite(itf)) {
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
		throw error(400, 'Unit conversion must result in an integer quantity');
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
				eq(table.itemMasterItemUnitMasterTable.hospitalId, input.hospitalId),
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
		links.find((l) => l.link.isDefaultYesNo === YesNoEnum.YES) ?? links[0];
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
				eq(table.itemMasterItemUnitMasterTable.hospitalId, input.hospitalId),
				eq(table.itemMasterItemUnitMasterTable.itemMasterId, input.itemId),
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
	const pf = Number(ium.purchaseConversionFactor);
	const itf = Number(ium.issueConversionFactor);
	if (!Number.isFinite(pf) || !Number.isFinite(itf) || pf <= 0 || itf <= 0) {
		throw error(500, 'Invalid unit conversion factors');
	}
	const issueUnitPrice = (price * itf) / pf;
	if (!Number.isFinite(issueUnitPrice)) {
		throw error(500, 'Unit price conversion failed');
	}
	return issueUnitPrice.toFixed(2);
}
