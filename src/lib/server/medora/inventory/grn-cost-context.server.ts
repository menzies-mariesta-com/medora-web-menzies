import { error } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { GrnCostContext } from '$lib/model/type/medora/sale-price-formula.type';
import { freeQtyToPurchaseUnitQty } from '$lib/tool/inventory/grn-free-qty-purchase.util';
import {
	listItemUnitMastersForItem,
	resolveItemUnitMasterForItemPurchaseUnit
} from './item-unit-inventory.server';

type GrnLineRow = {
	id: number;
	itemId: number;
	unitId: number;
	freeUnitId: number | null;
	purchasedQty: string;
	freeQty: string;
	purchasePrice: string | null;
	discountAmount: string;
	discountPercent: string;
	taxAmount: string;
	taxPercent: string;
};

async function toGrnLineCostInput(
	hospitalId: string,
	row: GrnLineRow,
	iumCache: Map<number, Awaited<ReturnType<typeof listItemUnitMastersForItem>>>
) {
	const purchasedQty = Number(row.purchasedQty);
	const freeQty = Number(row.freeQty);
	const linePurchaseUnitId = row.unitId;
	const freeUnitId = row.freeUnitId ?? linePurchaseUnitId;

	let freeQtyPurchaseUnit = 0;
	if (freeQty > 0) {
		const { ium } = await resolveItemUnitMasterForItemPurchaseUnit({
			hospitalId,
			itemId: row.itemId,
			purchaseUnitId: linePurchaseUnitId
		});
		let allIums = iumCache.get(row.itemId);
		if (!allIums) {
			allIums = await listItemUnitMastersForItem({
				hospitalId,
				itemId: row.itemId
			});
			iumCache.set(row.itemId, allIums);
		}
		const pfOrdered = Number(ium.purchaseConversionFactor);
		freeQtyPurchaseUnit = freeQtyToPurchaseUnitQty({
			freeQ: freeQty,
			freeUnitId,
			linePurchaseUnitId,
			lineIssueUnitId: ium.issueUnitId,
			linePurchaseConversionFactor: ium.purchaseConversionFactor,
			lineIssueConversionFactor: ium.issueConversionFactor,
			allIums
		});
		if (freeQtyPurchaseUnit <= 0 && freeUnitId !== linePurchaseUnitId) {
			throw error(
				400,
				'Invalid free unit for GRN line price calculation'
			);
		}
	}

	return {
		purchasedQty,
		freeQty,
		freeQtyPurchaseUnit,
		purchaseUnitPrice: Number(row.purchasePrice ?? 0),
		discountAmount: Number(row.discountAmount),
		discountPercent: Number(row.discountPercent),
		taxAmount: Number(row.taxAmount),
		taxPercent: Number(row.taxPercent)
	};
}

/** Loads all GRN lines + invoice charges for proportional cost allocation. */
export async function loadGrnCostContextForLine(input: {
	hospitalId: string;
	goodsReceiptLineId: number;
}): Promise<GrnCostContext> {
	const [grnLine] = await ensureDb()
		.select({
			id: table.goodsReceiptLineTable.id,
			grnId: table.goodsReceiptLineTable.grnId
		})
		.from(table.goodsReceiptLineTable)
		.where(eq(table.goodsReceiptLineTable.id, input.goodsReceiptLineId))
		.limit(1);
	if (!grnLine) throw error(400, 'Goods receipt line not found');

	const [grnNote] = await ensureDb()
		.select({
			hospitalId: table.goodsReceiptNoteTable.hospitalId,
			invoiceDiscountAmount:
				table.goodsReceiptNoteTable.invoiceDiscountAmount,
			invoiceDiscountPercent:
				table.goodsReceiptNoteTable.invoiceDiscountPercent,
			invoiceTaxAmount: table.goodsReceiptNoteTable.invoiceTaxAmount,
			invoiceTaxPercent: table.goodsReceiptNoteTable.invoiceTaxPercent
		})
		.from(table.goodsReceiptNoteTable)
		.where(eq(table.goodsReceiptNoteTable.id, grnLine.grnId))
		.limit(1);
	if (!grnNote) throw error(400, 'Goods receipt not found');

	const allLines = await ensureDb()
		.select({
			id: table.goodsReceiptLineTable.id,
			itemId: table.goodsReceiptLineTable.itemId,
			unitId: table.goodsReceiptLineTable.unitId,
			freeUnitId: table.goodsReceiptLineTable.freeUnitId,
			purchasedQty: table.goodsReceiptLineTable.purchasedQty,
			freeQty: table.goodsReceiptLineTable.freeQty,
			purchasePrice: table.goodsReceiptLineTable.purchasePrice,
			discountAmount: table.goodsReceiptLineTable.discountAmount,
			discountPercent: table.goodsReceiptLineTable.discountPercent,
			taxAmount: table.goodsReceiptLineTable.taxAmount,
			taxPercent: table.goodsReceiptLineTable.taxPercent
		})
		.from(table.goodsReceiptLineTable)
		.where(eq(table.goodsReceiptLineTable.grnId, grnLine.grnId))
		.orderBy(asc(table.goodsReceiptLineTable.id));

	const targetLineIndex = allLines.findIndex((l) => l.id === grnLine.id);
	if (targetLineIndex < 0) {
		throw error(400, 'GRN line not found in note');
	}

	const hospitalId = grnNote.hospitalId;
	const iumCache = new Map<
		number,
		Awaited<ReturnType<typeof listItemUnitMastersForItem>>
	>();

	const lines = await Promise.all(
		allLines.map((row) => toGrnLineCostInput(hospitalId, row, iumCache))
	);

	return {
		lines,
		invoice: {
			discountAmount: Number(grnNote.invoiceDiscountAmount),
			discountPercent: Number(grnNote.invoiceDiscountPercent),
			taxAmount: Number(grnNote.invoiceTaxAmount),
			taxPercent: Number(grnNote.invoiceTaxPercent)
		},
		targetLineIndex
	};
}
