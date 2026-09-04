import { error } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import * as schema from '$lib/server/db/schema';
import { parseIntStrict } from './inv-validate.server';

type Db = NeonDatabase<typeof schema>;

/** GRN-linked cost lot: batch + expiry + source GRN line. */
const grnLineBatchIdentityCond = (input: {
	hospitalId: string;
	itemId: number;
	batchNo: string;
	expiryDate: string | null;
	goodsReceiptLineId: number;
}) =>
	and(
		eq(schema.itemBatchTable.hospitalId, input.hospitalId),
		eq(schema.itemBatchTable.itemId, input.itemId),
		eq(schema.itemBatchTable.batchNo, input.batchNo),
		input.expiryDate == null
			? isNull(schema.itemBatchTable.expiryDate)
			: eq(schema.itemBatchTable.expiryDate, input.expiryDate),
		eq(
			schema.itemBatchTable.goodsReceiptLineId,
			input.goodsReceiptLineId
		)
	);

/** Pre-provenance batches only (no goods_receipt_line_id). */
const legacyBatchIdentityCond = (input: {
	hospitalId: string;
	itemId: number;
	batchNo: string;
	expiryDate: string | null;
	supplierId: number | null;
}) =>
	and(
		eq(schema.itemBatchTable.hospitalId, input.hospitalId),
		eq(schema.itemBatchTable.itemId, input.itemId),
		eq(schema.itemBatchTable.batchNo, input.batchNo),
		input.expiryDate == null
			? isNull(schema.itemBatchTable.expiryDate)
			: eq(schema.itemBatchTable.expiryDate, input.expiryDate),
		input.supplierId == null
			? isNull(schema.itemBatchTable.supplierId)
			: eq(schema.itemBatchTable.supplierId, input.supplierId),
		isNull(schema.itemBatchTable.goodsReceiptLineId)
	);

/**
 * Resolves or creates `item_batch` for GRN posting.
 * Identity when `goodsReceiptLineId` is set: hospital + item + batch_no + expiry + GRN line.
 * Purchase price is stored on `goods_receipt_line` only.
 */
export async function findOrCreateItemBatch(
	tx: Db,
	input: {
		hospitalId: string;
		itemId: number;
		batchNo: string;
		expiryDate: string | null;
		supplierId: number | null;
		goodsReceiptNoteId?: string | null;
		goodsReceiptLineId?: number | null;
	}
): Promise<number> {
	const grnLineId = input.goodsReceiptLineId ?? null;

	if (grnLineId != null) {
		const [byLine] = await tx
			.select({ id: schema.itemBatchTable.id })
			.from(schema.itemBatchTable)
			.where(eq(schema.itemBatchTable.goodsReceiptLineId, grnLineId))
			.limit(1);
		if (byLine) return byLine.id;

		const grnIdentity = {
			hospitalId: input.hospitalId,
			itemId: input.itemId,
			batchNo: input.batchNo,
			expiryDate: input.expiryDate,
			goodsReceiptLineId: grnLineId
		};

		const [existingGrn] = await tx
			.select({ id: schema.itemBatchTable.id })
			.from(schema.itemBatchTable)
			.where(grnLineBatchIdentityCond(grnIdentity))
			.limit(1);
		if (existingGrn) return existingGrn.id;

		await tx.insert(schema.itemBatchTable).values({
			hospitalId: input.hospitalId,
			itemId: input.itemId,
			batchNo: input.batchNo,
			expiryDate: input.expiryDate,
			supplierId: input.supplierId,
			goodsReceiptNoteId: input.goodsReceiptNoteId ?? null,
			goodsReceiptLineId: grnLineId
		});

		const [againGrn] = await tx
			.select({ id: schema.itemBatchTable.id })
			.from(schema.itemBatchTable)
			.where(grnLineBatchIdentityCond(grnIdentity))
			.limit(1);
		if (!againGrn) error(500, 'item_batch insert race');
		return againGrn.id;
	}

	const legacyIdentity = {
		hospitalId: input.hospitalId,
		itemId: input.itemId,
		batchNo: input.batchNo,
		expiryDate: input.expiryDate,
		supplierId: input.supplierId
	};

	const [existingLegacy] = await tx
		.select({ id: schema.itemBatchTable.id })
		.from(schema.itemBatchTable)
		.where(legacyBatchIdentityCond(legacyIdentity))
		.limit(1);
	if (existingLegacy) return existingLegacy.id;

	await tx.insert(schema.itemBatchTable).values({
		hospitalId: input.hospitalId,
		itemId: input.itemId,
		batchNo: input.batchNo,
		expiryDate: input.expiryDate,
		supplierId: input.supplierId,
		goodsReceiptNoteId: input.goodsReceiptNoteId ?? null,
		goodsReceiptLineId: null
	});

	const [againLegacy] = await tx
		.select({ id: schema.itemBatchTable.id })
		.from(schema.itemBatchTable)
		.where(legacyBatchIdentityCond(legacyIdentity))
		.limit(1);
	if (!againLegacy) error(500, 'item_batch insert race');
	return againLegacy.id;
}

/** @deprecated Batches are created with GRN provenance on insert; kept for legacy backfills. */
export async function setItemBatchGrnProvenanceIfUnset(
	tx: Db,
	input: {
		batchId: number;
		goodsReceiptNoteId: string;
		goodsReceiptLineId: number;
	}
): Promise<void> {
	await tx
		.update(schema.itemBatchTable)
		.set({
			goodsReceiptNoteId: input.goodsReceiptNoteId,
			goodsReceiptLineId: input.goodsReceiptLineId
		})
		.where(
			and(
				eq(schema.itemBatchTable.id, input.batchId),
				isNull(schema.itemBatchTable.goodsReceiptLineId)
			)
		);
}

export async function addDeltaToInvStock(
	tx: Db,
	input: {
		hospitalId: string;
		itemId: number;
		storeId: number;
		batchId: number;
		delta: string;
		userId: string;
	}
): Promise<void> {
	const delta = parseIntStrict(input.delta, 'delta');
	const [row] = await tx
		.select()
		.from(schema.invStockTable)
		.where(
			and(
				eq(schema.invStockTable.storeId, input.storeId),
				eq(schema.invStockTable.batchId, input.batchId),
				isNull(schema.invStockTable.deletedAt)
			)
		)
		.limit(1);

	if (row) {
		const next = parseIntStrict(row.quantity, 'quantity') + delta;
		if (next < 0) error(400, 'Stock quantity would be negative');
		await tx
			.update(schema.invStockTable)
			.set({
				quantity: String(next),
				updatedBy: input.userId
			})
			.where(eq(schema.invStockTable.id, row.id));
	} else {
		if (delta < 0) error(400, 'No stock row to deduct');
		await tx.insert(schema.invStockTable).values({
			hospitalId: input.hospitalId,
			itemId: input.itemId,
			storeId: input.storeId,
			batchId: input.batchId,
			quantity: String(delta),
			createdBy: input.userId,
			updatedBy: input.userId
		});
	}
}
