import { error, type RequestEvent } from '@sveltejs/kit';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { InvStoreTransferStatusTaggingEnum } from '$lib/model/enum/db-link';
import {
	assertStoreInHospital,
	ensureHospitalInventoryAccess
} from './inventory-scope.server';
import { addDeltaToInvStock } from './item-batch.server';
import { parsePositiveIntQty } from './inv-validate.server';

export async function postStoreTransfer(
	event: RequestEvent,
	input: {
		hospitalId: string;
		fromStoreId: number;
		toStoreId: number;
		remark: string | null;
		/** When set, links this move to a posted GRN (e.g. to requesting store). */
		sourceGrnId?: string | null;
		lines: {
			itemId: number;
			batchId: number;
			quantity: string;
			unitId: number;
		}[];
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');
	if (input.fromStoreId === input.toStoreId) {
		throw error(400, 'Stores must differ');
	}
	if (input.lines.length === 0) throw error(400, 'At least one line required');

	await assertStoreInHospital(input.hospitalId, input.fromStoreId);
	await assertStoreInHospital(input.hospitalId, input.toStoreId);

	const transferId = await ensureDb().transaction(async (tx) => {
		const [xfer] = await tx
			.insert(table.invStoreTransferTable)
			.values({
				hospitalId: input.hospitalId,
				fromStoreId: input.fromStoreId,
				toStoreId: input.toStoreId,
				statusTaggingId: InvStoreTransferStatusTaggingEnum.POSTED,
				requestedBy: userId,
				postedAt: sql`now()`,
				remark: input.remark,
				sourceGrnId: input.sourceGrnId ?? null,
				createdBy: userId,
				updatedBy: userId
			})
			.returning({ id: table.invStoreTransferTable.id });
		if (!xfer) throw error(500, 'Transfer insert failed');

		for (const line of input.lines) {
			const qty = parsePositiveIntQty(line.quantity, 'quantity');

			const [batch] = await tx
				.select()
				.from(table.itemBatchTable)
				.where(
					and(
						eq(table.itemBatchTable.id, line.batchId),
						eq(table.itemBatchTable.hospitalId, input.hospitalId),
						eq(table.itemBatchTable.itemId, line.itemId)
					)
				)
				.limit(1);
			if (!batch) throw error(400, 'Invalid batch for item');

			const [src] = await tx
				.select()
				.from(table.invStockTable)
				.where(
					and(
						eq(table.invStockTable.storeId, input.fromStoreId),
						eq(table.invStockTable.batchId, line.batchId),
						isNull(table.invStockTable.deletedAt)
					)
				)
				.limit(1);
			if (!src || Number(src.quantity) + 1e-9 < qty) {
				throw error(400, 'Insufficient stock for transfer');
			}

			await addDeltaToInvStock(tx, {
				hospitalId: input.hospitalId,
				itemId: line.itemId,
				storeId: input.fromStoreId,
				batchId: line.batchId,
				delta: String(-qty),
				userId
			});

			await addDeltaToInvStock(tx, {
				hospitalId: input.hospitalId,
				itemId: line.itemId,
				storeId: input.toStoreId,
				batchId: line.batchId,
				delta: String(qty),
				userId
			});

			await tx.insert(table.invStoreTransferLineTable).values({
				transferId: xfer.id,
				itemId: line.itemId,
				quantity: line.quantity,
				unitId: line.unitId,
				batchId: line.batchId,
				createdBy: userId,
				updatedBy: userId
			});
		}

		return xfer.id;
	});

	return transferId;
}
