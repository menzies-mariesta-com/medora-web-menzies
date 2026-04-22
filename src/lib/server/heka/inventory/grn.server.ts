import { error, type RequestEvent } from '@sveltejs/kit';
import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	InvGrnStatusTaggingEnum,
	InvPoStatusTaggingEnum
} from '$lib/model/enum/db-link';
import { normalizePagination } from '$lib/model/type/pagination.type';
import {
	assertStoreInHospital,
	ensureHospitalInventoryAccess,
	getCentralStoreForBranch
} from './inventory-scope.server';
import {
	addDeltaToInvStock,
	findOrCreateItemBatch,
	OPEN_STOCK_BATCH_NO
} from './item-batch.server';
import {
	issueQtyStringFromPurchaseReceipt,
	purchaseUnitPriceToIssueUnitPriceString
} from './item-unit-inventory.server';

/** Central receiving store for the branch of the PO’s store (for GRN UI). */
export async function getReceivingStoreForPurchaseOrder(
	event: RequestEvent,
	input: { hospitalId: string; poId: string }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const [po] = await ensureDb()
		.select()
		.from(table.purchaseOrderTable)
		.where(
			and(
				eq(table.purchaseOrderTable.id, input.poId),
				eq(table.purchaseOrderTable.hospitalId, input.hospitalId),
				isNull(table.purchaseOrderTable.deletedAt)
			)
		)
		.limit(1);
	if (!po) return null;
	const poStore = await assertStoreInHospital(input.hospitalId, po.storeId);
	if (!poStore.branchId) return null;
	const central = await getCentralStoreForBranch(poStore.branchId);
	if (!central) return null;
	return {
		storeId: central.id,
		storeName: central.storeName,
		branchId: poStore.branchId
	};
}

const PO_ALLOWS_GRN = new Set([
	InvPoStatusTaggingEnum.APPROVED,
	InvPoStatusTaggingEnum.SENT_TO_SUPPLIER,
	InvPoStatusTaggingEnum.PARTIALLY_RECEIVED
]);

export async function listGoodsReceiptNotes(
	event: RequestEvent,
	input: { hospitalId: string; page?: number; pageSize?: number; poId?: string }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const { page, pageSize, limit, offset } = normalizePagination(input);

	let cond = and(
		eq(table.goodsReceiptNoteTable.hospitalId, input.hospitalId),
		isNull(table.goodsReceiptNoteTable.deletedAt)
	);
	if (input.poId) {
		cond = and(cond, eq(table.goodsReceiptNoteTable.poId, input.poId))!;
	}

	const uCreated = alias(table.userTable, 'grn_created_by_user');
	const uUpdated = alias(table.userTable, 'grn_updated_by_user');
	const uReceived = alias(table.userTable, 'grn_received_by_user');
	const uCancelled = alias(table.userTable, 'grn_cancelled_by_user');

	const [data, cntRow] = await Promise.all([
		ensureDb()
			.select({
				grn: table.goodsReceiptNoteTable,
				storeName: table.storeTable.storeName,
				statusName: table.statusTaggingTable.name,
				supplierName: table.supplierTable.name,
				createdByName: uCreated.name,
				updatedByName: uUpdated.name,
				receivedByName: uReceived.name,
				cancelledByName: uCancelled.name
			})
			.from(table.goodsReceiptNoteTable)
			.innerJoin(
				table.storeTable,
				eq(table.goodsReceiptNoteTable.storeId, table.storeTable.id)
			)
			.innerJoin(
				table.statusTaggingTable,
				eq(
					table.goodsReceiptNoteTable.statusTaggingId,
					table.statusTaggingTable.id
				)
			)
			.leftJoin(
				table.purchaseOrderTable,
				eq(
					table.goodsReceiptNoteTable.poId,
					table.purchaseOrderTable.id
				)
			)
			.innerJoin(
				table.supplierTable,
				sql`${table.supplierTable.id} = coalesce(${table.purchaseOrderTable.supplierId}, ${table.goodsReceiptNoteTable.supplierId})`
			)
			.leftJoin(
				uCreated,
				eq(table.goodsReceiptNoteTable.createdBy, uCreated.id)
			)
			.leftJoin(
				uUpdated,
				eq(table.goodsReceiptNoteTable.updatedBy, uUpdated.id)
			)
			.leftJoin(
				uReceived,
				eq(table.goodsReceiptNoteTable.receivedBy, uReceived.id)
			)
			.leftJoin(
				uCancelled,
				eq(table.goodsReceiptNoteTable.cancelledBy, uCancelled.id)
			)
			.where(cond)
			.orderBy(desc(table.goodsReceiptNoteTable.createdAt))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ c: count() })
			.from(table.goodsReceiptNoteTable)
			.where(cond)
	]);

	const total = cntRow[0]?.c ?? 0;
	return {
		data: data.map((r) => ({
			...r.grn,
			storeName: r.storeName,
			statusName: r.statusName,
			supplierName: r.supplierName,
			createdByName: r.createdByName ?? null,
			updatedByName: r.updatedByName ?? null,
			receivedByName: r.receivedByName ?? null,
			cancelledByName: r.cancelledByName ?? null
		})),
		total,
		page,
		pageSize,
		totalPages: Math.ceil(Number(total) / pageSize) || 1
	};
}

export async function getGoodsReceiptNoteById(
	event: RequestEvent,
	input: { hospitalId: string; id: string }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const [row] = await ensureDb()
		.select()
		.from(table.goodsReceiptNoteTable)
		.where(
			and(
				eq(table.goodsReceiptNoteTable.id, input.id),
				eq(table.goodsReceiptNoteTable.hospitalId, input.hospitalId),
				isNull(table.goodsReceiptNoteTable.deletedAt)
			)
		)
		.limit(1);
	if (!row) return null;

	const lines = await ensureDb()
		.select()
		.from(table.goodsReceiptLineTable)
		.where(
			and(
				eq(table.goodsReceiptLineTable.grnId, input.id),
				isNull(table.goodsReceiptLineTable.deletedAt)
			)
		);

	return { ...row, lines };
}

export async function createAndPostGoodsReceipt(
	event: RequestEvent,
	input: {
		hospitalId: string;
		poId: string;
		storeId: number;
		receivedDate: string;
		lines: {
			poLineId: number;
			receivedQty: string;
			batchNo?: string | null;
			expiryDate?: string | null;
			/** Unit purchase price at receipt (required when item `is_batch_required`). */
			purchasePrice?: string | null;
		}[];
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');
	if (input.lines.length === 0) throw error(400, 'At least one line required');

	const [po] = await ensureDb()
		.select()
		.from(table.purchaseOrderTable)
		.where(
			and(
				eq(table.purchaseOrderTable.id, input.poId),
				eq(table.purchaseOrderTable.hospitalId, input.hospitalId),
				isNull(table.purchaseOrderTable.deletedAt)
			)
		)
		.limit(1);
	if (!po) throw error(404, 'PO not found');
	if (!PO_ALLOWS_GRN.has(po.statusTaggingId)) {
		throw error(400, 'PO status does not allow goods receipt');
	}

	const poStore = await assertStoreInHospital(input.hospitalId, po.storeId);
	const central = await getCentralStoreForBranch(poStore.branchId!);
	if (!central || central.id !== input.storeId) {
		throw error(
			400,
			'Goods must be received into the central store for this branch'
		);
	}

	const grnId = await ensureDb().transaction(async (tx) => {
		const [grn] = await tx
			.insert(table.goodsReceiptNoteTable)
			.values({
				hospitalId: input.hospitalId,
				poId: input.poId,
				supplierId: po.supplierId,
				storeId: input.storeId,
				receivedBy: userId,
				receivedDate: input.receivedDate,
				statusTaggingId: InvGrnStatusTaggingEnum.POSTED,
				createdBy: userId,
				updatedBy: userId
			})
			.returning({ id: table.goodsReceiptNoteTable.id });
		if (!grn) throw error(500, 'GRN insert failed');

		for (const ln of input.lines) {
			const [poLine] = await tx
				.select()
				.from(table.purchaseOrderLineTable)
				.where(
					and(
						eq(table.purchaseOrderLineTable.id, ln.poLineId),
						eq(table.purchaseOrderLineTable.poId, input.poId),
						isNull(table.purchaseOrderLineTable.deletedAt)
					)
				)
				.limit(1);
			if (!poLine) throw error(400, `Invalid PO line ${ln.poLineId}`);
			const recv = Number(ln.receivedQty);
			if (!Number.isFinite(recv) || recv <= 0)
				throw error(400, 'Invalid received quantity');
			const prev = Number(poLine.qtyReceivedCumulative);
			const ordered = Number(poLine.quantity);
			if (prev + recv > ordered + 1e-9) {
				throw error(400, 'Received quantity exceeds ordered quantity');
			}

			const [im] = await tx
				.select({
					isBatchRequired: table.itemMasterTable.isBatchRequired,
					manufacturerId: table.itemMasterTable.manufacturerId
				})
				.from(table.itemMasterTable)
				.where(eq(table.itemMasterTable.id, poLine.itemId))
				.limit(1);
			if (!im) throw error(400, 'Item not found');

			let batchNo: string;
			let expiryDate: string | null;
			let purchasePriceStr: string;
			if (im.isBatchRequired) {
				const bn = ln.batchNo?.trim();
				if (!bn) throw error(400, 'batch_no required for this item');
				if (!ln.expiryDate) throw error(400, 'expiry_date required for this item');
				const pp = ln.purchasePrice?.trim();
				if (!pp || !Number.isFinite(Number(pp)) || Number(pp) <= 0) {
					throw error(400, 'purchase_price required');
				}
				batchNo = bn;
				expiryDate = ln.expiryDate;
				purchasePriceStr = Number(pp).toFixed(4);
			} else {
				batchNo =
					ln.batchNo?.trim() && ln.batchNo.trim().length > 0
						? ln.batchNo.trim()
						: OPEN_STOCK_BATCH_NO;
				expiryDate = ln.expiryDate ?? null;
				const pp = ln.purchasePrice?.trim();
				if (!pp || !Number.isFinite(Number(pp)) || Number(pp) <= 0) {
					throw error(400, 'purchase_price required');
				}
				purchasePriceStr = Number(pp).toFixed(4);
			}

			const manufacturerId =
				poLine.manufacturerId ?? im.manufacturerId ?? null;

			const issueUnitPriceStr = await purchaseUnitPriceToIssueUnitPriceString({
				hospitalId: input.hospitalId,
				itemId: poLine.itemId,
				purchaseUnitId: poLine.unitId,
				purchaseUnitPriceStr: purchasePriceStr
			});

			const batchId = await findOrCreateItemBatch(tx, {
				hospitalId: input.hospitalId,
				itemId: poLine.itemId,
				batchNo,
				expiryDate,
				manufacturerId,
				supplierId: po.supplierId,
				// item_batch.purchase_price stores normalized price per issue unit
				purchasePrice: issueUnitPriceStr
			});

			const [grnLine] = await tx
				.insert(table.goodsReceiptLineTable)
				.values({
					grnId: grn.id,
					poLineId: ln.poLineId,
					itemId: poLine.itemId,
					receivedQty: ln.receivedQty,
					batchNo,
					expiryDate,
					batchId,
					purchasePrice: purchasePriceStr,
					unitId: poLine.unitId,
					createdBy: userId,
					updatedBy: userId
				})
				.returning({ id: table.goodsReceiptLineTable.id });
			if (!grnLine) throw error(500, 'GRN line failed');

			const issueDelta = await issueQtyStringFromPurchaseReceipt({
				hospitalId: input.hospitalId,
				itemId: poLine.itemId,
				purchaseUnitId: poLine.unitId,
				purchaseQtyStr: ln.receivedQty
			});

			await addDeltaToInvStock(tx, {
				hospitalId: input.hospitalId,
				itemId: poLine.itemId,
				storeId: input.storeId,
				batchId,
				delta: issueDelta,
				userId
			});

			const newCum = (prev + recv).toFixed(6);
			await tx
				.update(table.purchaseOrderLineTable)
				.set({
					qtyReceivedCumulative: newCum,
					updatedBy: userId
				})
				.where(eq(table.purchaseOrderLineTable.id, ln.poLineId));
		}

		const poLines = await tx
			.select()
			.from(table.purchaseOrderLineTable)
			.where(
				and(
					eq(table.purchaseOrderLineTable.poId, input.poId),
					isNull(table.purchaseOrderLineTable.deletedAt)
				)
			);

		let allClosed = true;
		for (const pl of poLines) {
			if (Number(pl.qtyReceivedCumulative) < Number(pl.quantity) - 1e-9) {
				allClosed = false;
				break;
			}
		}

		await tx
			.update(table.purchaseOrderTable)
			.set({
				statusTaggingId: allClosed
					? InvPoStatusTaggingEnum.CLOSED
					: InvPoStatusTaggingEnum.PARTIALLY_RECEIVED,
				updatedBy: userId
			})
			.where(eq(table.purchaseOrderTable.id, input.poId));

		return grn.id;
	});

	return getGoodsReceiptNoteById(event, {
		hospitalId: input.hospitalId,
		id: grnId
	});
}

export async function createAndPostDirectGoodsReceipt(
	event: RequestEvent,
	input: {
		hospitalId: string;
		storeId: number;
		supplierId: number;
		receivedDate: string;
		lines: {
			itemId: number;
			receivedQty: string;
			unitId: number;
			batchNo?: string | null;
			expiryDate?: string | null;
			purchasePrice?: string | null;
		}[];
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');
	if (input.lines.length === 0) throw error(400, 'At least one line required');

	const store = await assertStoreInHospital(input.hospitalId, input.storeId);
	if (!store.branchId) {
		throw error(400, 'Store is missing branch context');
	}
	const central = await getCentralStoreForBranch(store.branchId);
	if (!central || central.id !== input.storeId) {
		throw error(
			400,
			'Goods must be received into the central store for this branch'
		);
	}

	const grnId = await ensureDb().transaction(async (tx) => {
		const [grn] = await tx
			.insert(table.goodsReceiptNoteTable)
			.values({
				hospitalId: input.hospitalId,
				poId: null,
				supplierId: input.supplierId,
				storeId: input.storeId,
				receivedBy: userId,
				receivedDate: input.receivedDate,
				statusTaggingId: InvGrnStatusTaggingEnum.POSTED,
				createdBy: userId,
				updatedBy: userId
			})
			.returning({ id: table.goodsReceiptNoteTable.id });
		if (!grn) throw error(500, 'GRN insert failed');

		for (const ln of input.lines) {
			const recv = Number(ln.receivedQty);
			if (!Number.isFinite(recv) || recv <= 0) {
				throw error(400, 'Invalid received quantity');
			}
			const [im] = await tx
				.select({
					isBatchRequired: table.itemMasterTable.isBatchRequired,
					manufacturerId: table.itemMasterTable.manufacturerId
				})
				.from(table.itemMasterTable)
				.where(eq(table.itemMasterTable.id, ln.itemId))
				.limit(1);
			if (!im) throw error(400, 'Item not found');

			let batchNo: string;
			let expiryDate: string | null;
			let purchasePriceStr: string;
			if (im.isBatchRequired) {
				const bn = ln.batchNo?.trim();
				if (!bn) throw error(400, 'batch_no required for this item');
				if (!ln.expiryDate) {
					throw error(400, 'expiry_date required for this item');
				}
				const pp = ln.purchasePrice?.trim();
				if (!pp || !Number.isFinite(Number(pp)) || Number(pp) <= 0) {
					throw error(400, 'purchase_price required');
				}
				batchNo = bn;
				expiryDate = ln.expiryDate;
				purchasePriceStr = Number(pp).toFixed(4);
			} else {
				batchNo =
					ln.batchNo?.trim() && ln.batchNo.trim().length > 0
						? ln.batchNo.trim()
						: OPEN_STOCK_BATCH_NO;
				expiryDate = ln.expiryDate ?? null;
				const pp = ln.purchasePrice?.trim();
				if (!pp || !Number.isFinite(Number(pp)) || Number(pp) <= 0) {
					throw error(400, 'purchase_price required');
				}
				purchasePriceStr = Number(pp).toFixed(4);
			}

			const manufacturerId = im.manufacturerId ?? null;

			const issueUnitPriceStr = await purchaseUnitPriceToIssueUnitPriceString({
				hospitalId: input.hospitalId,
				itemId: ln.itemId,
				purchaseUnitId: ln.unitId,
				purchaseUnitPriceStr: purchasePriceStr
			});
			const batchId = await findOrCreateItemBatch(tx, {
				hospitalId: input.hospitalId,
				itemId: ln.itemId,
				batchNo,
				expiryDate,
				manufacturerId,
				supplierId: input.supplierId,
				// item_batch.purchase_price stores normalized price per issue unit
				purchasePrice: issueUnitPriceStr
			});

			const [grnLine] = await tx
				.insert(table.goodsReceiptLineTable)
				.values({
					grnId: grn.id,
					poLineId: null,
					itemId: ln.itemId,
					receivedQty: ln.receivedQty,
					batchNo,
					expiryDate,
					batchId,
					purchasePrice: purchasePriceStr,
					unitId: ln.unitId,
					createdBy: userId,
					updatedBy: userId
				})
				.returning({ id: table.goodsReceiptLineTable.id });
			if (!grnLine) throw error(500, 'GRN line failed');

			const issueDelta = await issueQtyStringFromPurchaseReceipt({
				hospitalId: input.hospitalId,
				itemId: ln.itemId,
				purchaseUnitId: ln.unitId,
				purchaseQtyStr: ln.receivedQty
			});

			await addDeltaToInvStock(tx, {
				hospitalId: input.hospitalId,
				itemId: ln.itemId,
				storeId: input.storeId,
				batchId,
				delta: issueDelta,
				userId
			});
		}

		return grn.id;
	});

	return getGoodsReceiptNoteById(event, {
		hospitalId: input.hospitalId,
		id: grnId
	});
}
