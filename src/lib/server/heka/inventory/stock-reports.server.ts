import { type RequestEvent } from '@sveltejs/kit';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { ensureHospitalInventoryAccess } from './inventory-scope.server';

export type InventoryMovementRow = {
	kind: 'GRN' | 'DISSUE' | 'DCONSUME';
	refId: string;
	refNo: string | null;
	storeId: number;
	storeName: string | null;
	itemId: number;
	itemName: string | null;
	batchId: number | null;
	batchNo: string | null;
	qty: string;
	createdAt: string;
};

export async function listInventoryMovement(
	event: RequestEvent,
	input: { hospitalId: string; storeId?: number; limit?: number }
): Promise<InventoryMovementRow[]> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const limit = Math.min(300, Math.max(1, input.limit ?? 200));

	// GRN lines (stock in)
	const grnWhere = and(
		eq(table.goodsReceiptNoteTable.hospitalId, input.hospitalId),
		isNull(table.goodsReceiptNoteTable.deletedAt),
		isNull(table.goodsReceiptLineTable.deletedAt)
	);
	const grnStoreCond =
		typeof input.storeId === 'number'
			? eq(table.goodsReceiptNoteTable.storeId, input.storeId)
			: undefined;

	const grn = await ensureDb()
		.select({
			kind: sql<InventoryMovementRow['kind']>`'GRN'`,
			refId: sql<string>`${table.goodsReceiptNoteTable.id}::text`,
			refNo: table.goodsReceiptNoteTable.id,
			storeId: table.goodsReceiptNoteTable.storeId,
			storeName: table.storeTable.storeName,
			itemId: table.goodsReceiptLineTable.itemId,
			itemName: table.itemMasterTable.itemName,
			batchId: table.goodsReceiptLineTable.batchId,
			batchNo: table.itemBatchTable.batchNo,
			qty: table.goodsReceiptLineTable.receivedQty,
			createdAt: table.goodsReceiptNoteTable.createdAt
		})
		.from(table.goodsReceiptLineTable)
		.innerJoin(
			table.goodsReceiptNoteTable,
			eq(
				table.goodsReceiptLineTable.grnId,
				table.goodsReceiptNoteTable.id
			)
		)
		.innerJoin(
			table.storeTable,
			eq(table.goodsReceiptNoteTable.storeId, table.storeTable.id)
		)
		.innerJoin(
			table.itemMasterTable,
			eq(table.goodsReceiptLineTable.itemId, table.itemMasterTable.id)
		)
		.leftJoin(
			table.itemBatchTable,
			eq(table.goodsReceiptLineTable.batchId, table.itemBatchTable.id)
		)
		.where(grnStoreCond ? and(grnWhere, grnStoreCond) : grnWhere)
		.orderBy(desc(table.goodsReceiptNoteTable.createdAt))
		.limit(limit);

	// Department issue lines (stock out from from_store)
	const issueWhere = and(
		eq(table.invDepartmentIssueTable.hospitalId, input.hospitalId),
		isNull(table.invDepartmentIssueTable.deletedAt),
		isNull(table.invDepartmentIssueLineTable.deletedAt)
	);
	const issueStoreCond =
		typeof input.storeId === 'number'
			? eq(table.invDepartmentIssueTable.fromStoreId, input.storeId)
			: undefined;
	const diss = await ensureDb()
		.select({
			kind: sql<InventoryMovementRow['kind']>`'DISSUE'`,
			refId: sql<string>`${table.invDepartmentIssueTable.id}::text`,
			refNo: table.invDepartmentIssueTable.issueNo,
			storeId: table.invDepartmentIssueTable.fromStoreId,
			storeName: table.storeTable.storeName,
			itemId: table.invDepartmentIssueLineTable.itemId,
			itemName: table.itemMasterTable.itemName,
			batchId: table.invDepartmentIssueLineAllocTable.batchId,
			batchNo: table.itemBatchTable.batchNo,
			qty: table.invDepartmentIssueLineAllocTable.quantity,
			createdAt: table.invDepartmentIssueTable.createdAt
		})
		.from(table.invDepartmentIssueLineAllocTable)
		.innerJoin(
			table.invDepartmentIssueLineTable,
			eq(
				table.invDepartmentIssueLineAllocTable.lineId,
				table.invDepartmentIssueLineTable.id
			)
		)
		.innerJoin(
			table.invDepartmentIssueTable,
			eq(
				table.invDepartmentIssueLineTable.issueId,
				table.invDepartmentIssueTable.id
			)
		)
		.innerJoin(
			table.storeTable,
			eq(
				table.invDepartmentIssueTable.fromStoreId,
				table.storeTable.id
			)
		)
		.innerJoin(
			table.itemMasterTable,
			eq(
				table.invDepartmentIssueLineTable.itemId,
				table.itemMasterTable.id
			)
		)
		.innerJoin(
			table.itemBatchTable,
			eq(
				table.invDepartmentIssueLineAllocTable.batchId,
				table.itemBatchTable.id
			)
		)
		.where(
			issueStoreCond ? and(issueWhere, issueStoreCond) : issueWhere
		)
		.orderBy(desc(table.invDepartmentIssueTable.createdAt))
		.limit(limit);

	// Department consumption lines (stock out from store)
	const consWhere = and(
		eq(
			table.invDepartmentConsumptionTable.hospitalId,
			input.hospitalId
		),
		isNull(table.invDepartmentConsumptionTable.deletedAt),
		isNull(table.invDepartmentConsumptionLineTable.deletedAt)
	);
	const consStoreCond =
		typeof input.storeId === 'number'
			? eq(table.invDepartmentConsumptionTable.storeId, input.storeId)
			: undefined;
	const dcon = await ensureDb()
		.select({
			kind: sql<InventoryMovementRow['kind']>`'DCONSUME'`,
			refId: sql<string>`${table.invDepartmentConsumptionTable.id}::text`,
			refNo: table.invDepartmentConsumptionTable.consumptionNo,
			storeId: table.invDepartmentConsumptionTable.storeId,
			storeName: table.storeTable.storeName,
			itemId: table.invDepartmentConsumptionLineTable.itemId,
			itemName: table.itemMasterTable.itemName,
			batchId: table.invDepartmentConsumptionLineTable.batchId,
			batchNo: table.itemBatchTable.batchNo,
			qty: table.invDepartmentConsumptionLineTable.quantity,
			createdAt: table.invDepartmentConsumptionTable.createdAt
		})
		.from(table.invDepartmentConsumptionLineTable)
		.innerJoin(
			table.invDepartmentConsumptionTable,
			eq(
				table.invDepartmentConsumptionLineTable.consumptionId,
				table.invDepartmentConsumptionTable.id
			)
		)
		.innerJoin(
			table.storeTable,
			eq(
				table.invDepartmentConsumptionTable.storeId,
				table.storeTable.id
			)
		)
		.innerJoin(
			table.itemMasterTable,
			eq(
				table.invDepartmentConsumptionLineTable.itemId,
				table.itemMasterTable.id
			)
		)
		.innerJoin(
			table.itemBatchTable,
			eq(
				table.invDepartmentConsumptionLineTable.batchId,
				table.itemBatchTable.id
			)
		)
		.where(consStoreCond ? and(consWhere, consStoreCond) : consWhere)
		.orderBy(desc(table.invDepartmentConsumptionTable.createdAt))
		.limit(limit);

	// Merge and return newest-first (simple, bounded).
	const merged = [...grn, ...diss, ...dcon] as InventoryMovementRow[];
	merged.sort((a, b) =>
		a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
	);
	return merged.slice(0, limit);
}
