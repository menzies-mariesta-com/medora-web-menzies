import { error } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import * as schema from '$lib/server/db/schema';
import { parseIntStrict } from './inv-validate.server';

export const OPEN_STOCK_BATCH_NO = '__OPEN_STOCK__';

type Db = NeonDatabase<typeof schema>;

export async function findOrCreateItemBatch(
	tx: Db,
	input: {
		hospitalId: string;
		itemId: number;
		batchNo: string;
		expiryDate: string | null;
		manufacturerId: number | null;
		supplierId: number | null;
		/** Normalized unit price per issue/stock unit (stored in `item_batch.purchase_price`). */
		purchasePrice: string;
	}
): Promise<number> {
	const price = input.purchasePrice;
	const [existing] = await tx
		.select({ id: schema.itemBatchTable.id })
		.from(schema.itemBatchTable)
		.where(
			and(
				eq(schema.itemBatchTable.hospitalId, input.hospitalId),
				eq(schema.itemBatchTable.itemId, input.itemId),
				eq(schema.itemBatchTable.batchNo, input.batchNo),
				input.expiryDate == null
					? isNull(schema.itemBatchTable.expiryDate)
					: eq(schema.itemBatchTable.expiryDate, input.expiryDate),
				input.manufacturerId == null
					? isNull(schema.itemBatchTable.manufacturerId)
					: eq(
							schema.itemBatchTable.manufacturerId,
							input.manufacturerId
						),
				input.supplierId == null
					? isNull(schema.itemBatchTable.supplierId)
					: eq(schema.itemBatchTable.supplierId, input.supplierId),
				eq(schema.itemBatchTable.purchasePrice, price)
			)
		)
		.limit(1);
	if (existing) return existing.id;

	await tx.insert(schema.itemBatchTable).values({
		hospitalId: input.hospitalId,
		itemId: input.itemId,
		batchNo: input.batchNo,
		expiryDate: input.expiryDate,
		manufacturerId: input.manufacturerId,
		supplierId: input.supplierId,
		purchasePrice: price
	});

	const [again] = await tx
		.select({ id: schema.itemBatchTable.id })
		.from(schema.itemBatchTable)
		.where(
			and(
				eq(schema.itemBatchTable.hospitalId, input.hospitalId),
				eq(schema.itemBatchTable.itemId, input.itemId),
				eq(schema.itemBatchTable.batchNo, input.batchNo),
				input.expiryDate == null
					? isNull(schema.itemBatchTable.expiryDate)
					: eq(schema.itemBatchTable.expiryDate, input.expiryDate),
				input.manufacturerId == null
					? isNull(schema.itemBatchTable.manufacturerId)
					: eq(
							schema.itemBatchTable.manufacturerId,
							input.manufacturerId
						),
				input.supplierId == null
					? isNull(schema.itemBatchTable.supplierId)
					: eq(schema.itemBatchTable.supplierId, input.supplierId),
				eq(schema.itemBatchTable.purchasePrice, price)
			)
		)
		.limit(1);
	if (!again) error(500, 'item_batch insert race');
	return again.id;
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
