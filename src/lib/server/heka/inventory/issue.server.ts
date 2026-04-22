import { error, type RequestEvent } from '@sveltejs/kit';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { InvStockIssueStatusTaggingEnum } from '$lib/model/enum/db-link';
import {
	assertStoreInHospital,
	ensureHospitalInventoryAccess
} from './inventory-scope.server';
import { addDeltaToInvStock } from './item-batch.server';

export async function postStockIssue(
	event: RequestEvent,
	input: {
		hospitalId: string;
		storeId: number;
		issuedTo: string | null;
		reason: string | null;
		lines: {
			itemId: number;
			qty: string;
			unitId: number;
			/** When set, deduct only this batch (must have stock in store). */
			batchId?: number | null;
		}[];
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');
	if (input.lines.length === 0) throw error(400, 'At least one line required');

	await assertStoreInHospital(input.hospitalId, input.storeId);

	const issueId = await ensureDb().transaction(async (tx) => {
		const [iss] = await tx
			.insert(table.invStockIssueTable)
			.values({
				hospitalId: input.hospitalId,
				storeId: input.storeId,
				statusTaggingId: InvStockIssueStatusTaggingEnum.POSTED,
				issuedTo: input.issuedTo,
				reason: input.reason,
				postedAt: sql`now()`,
				requestedBy: userId,
				createdBy: userId,
				updatedBy: userId
			})
			.returning({ id: table.invStockIssueTable.id });
		if (!iss) throw error(500, 'Issue insert failed');

		for (const line of input.lines) {
			let remaining = Number(line.qty);
			if (!Number.isFinite(remaining) || remaining <= 0) {
				throw error(400, 'Invalid quantity');
			}

			if (line.batchId != null) {
				const [b] = await tx
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
				if (!b) throw error(400, 'Invalid batch for item');

				const [stk] = await tx
					.select()
					.from(table.invStockTable)
					.where(
						and(
							eq(table.invStockTable.storeId, input.storeId),
							eq(table.invStockTable.batchId, line.batchId),
							isNull(table.invStockTable.deletedAt),
							sql`${table.invStockTable.quantity}::numeric > 0`
						)
					)
					.limit(1);
				if (!stk || Number(stk.quantity) + 1e-9 < remaining) {
					throw error(400, 'Insufficient stock for issue');
				}

				await addDeltaToInvStock(tx, {
					hospitalId: input.hospitalId,
					itemId: line.itemId,
					storeId: input.storeId,
					batchId: line.batchId,
					delta: (-remaining).toFixed(6),
					userId
				});

				await tx.insert(table.invStockIssueLineTable).values({
					issueId: iss.id,
					itemId: line.itemId,
					qty: line.qty,
					unitId: line.unitId,
					batchId: line.batchId,
					createdBy: userId,
					updatedBy: userId
				});
				continue;
			}

			const rows = await tx
				.select({
					stock: table.invStockTable,
					expiryDate: table.itemBatchTable.expiryDate
				})
				.from(table.invStockTable)
				.innerJoin(
					table.itemBatchTable,
					eq(table.invStockTable.batchId, table.itemBatchTable.id)
				)
				.where(
					and(
						eq(table.invStockTable.storeId, input.storeId),
						eq(table.invStockTable.itemId, line.itemId),
						isNull(table.invStockTable.deletedAt),
						sql`${table.invStockTable.quantity}::numeric > 0`
					)
				)
				.orderBy(
					sql`${table.itemBatchTable.expiryDate} ASC NULLS LAST`,
					asc(table.invStockTable.id)
				);

			for (const row of rows) {
				if (remaining <= 0) break;
				const avail = Number(row.stock.quantity);
				const take = Math.min(remaining, avail);
				await addDeltaToInvStock(tx, {
					hospitalId: input.hospitalId,
					itemId: line.itemId,
					storeId: input.storeId,
					batchId: row.stock.batchId,
					delta: (-take).toFixed(6),
					userId
				});
				await tx.insert(table.invStockIssueLineTable).values({
					issueId: iss.id,
					itemId: line.itemId,
					qty: take.toFixed(6),
					unitId: line.unitId,
					batchId: row.stock.batchId,
					createdBy: userId,
					updatedBy: userId
				});
				remaining -= take;
			}

			if (remaining > 1e-6) {
				throw error(400, 'Insufficient stock for issue');
			}
		}

		return iss.id;
	});

	return issueId;
}
