import { type RequestEvent } from '@sveltejs/kit';
import { and, asc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum, YesNoEnum } from '$lib/model/enum/db-link';
import {
	assertStoreInHospital,
	ensureHospitalInventoryAccess
} from './inventory-scope.server';

async function defaultIssueUnitNameByItemIds(
	hospitalId: string,
	itemIds: number[]
): Promise<Map<number, string | null>> {
	const map = new Map<number, string | null>();
	if (itemIds.length === 0) return map;
	const issueU = table.unitTable;
	const rows = await ensureDb()
		.select({
			itemId: table.itemMasterItemUnitMasterTable.itemMasterId,
			issueUnitName: issueU.name
		})
		.from(table.itemMasterItemUnitMasterTable)
		.innerJoin(
			table.itemUnitMasterTable,
			eq(
				table.itemMasterItemUnitMasterTable.itemUnitMasterId,
				table.itemUnitMasterTable.id
			)
		)
		.innerJoin(issueU, eq(table.itemUnitMasterTable.issueUnitId, issueU.id))
		.where(
			and(
				eq(table.itemMasterItemUnitMasterTable.hospitalId, hospitalId),
				inArray(
					table.itemMasterItemUnitMasterTable.itemMasterId,
					itemIds
				),
				eq(
					table.itemMasterItemUnitMasterTable.isDefaultYesNo,
					YesNoEnum.YES
				),
				isNull(table.itemMasterItemUnitMasterTable.deletedAt),
				isNull(table.itemUnitMasterTable.deletedAt),
				ne(table.itemUnitMasterTable.statusId, StatusEnum.DELETED)
			)
		);
	for (const r of rows) {
		map.set(r.itemId, r.issueUnitName ?? null);
	}
	return map;
}

const MAX_ITEM_IDS_AGG = 150;

export async function listStockAggregated(
	event: RequestEvent,
	input: {
		hospitalId: string;
		storeId?: number;
		itemId?: number;
		/** When set (non-empty), restricts to these item master ids (batch-friendly for line editors). */
		itemIds?: number[];
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);

	let cond = and(
		eq(table.invStockTable.hospitalId, input.hospitalId),
		isNull(table.invStockTable.deletedAt),
		eq(table.hospitalBranchTable.hospitalId, input.hospitalId),
		sql`${table.storeTable.statusId} <> ${StatusEnum.DELETED}`
	);

	if (typeof input.storeId === 'number') {
		await assertStoreInHospital(input.hospitalId, input.storeId);
		cond = and(cond, eq(table.invStockTable.storeId, input.storeId))!;
	}
	const itemIdsUnique = [
		...new Set(
			(input.itemIds ?? []).filter(
				(n) => typeof n === 'number' && Number.isFinite(n) && n > 0
			)
		)
	].slice(0, MAX_ITEM_IDS_AGG);
	if (itemIdsUnique.length > 0) {
		cond = and(cond, inArray(table.invStockTable.itemId, itemIdsUnique))!;
	} else if (typeof input.itemId === 'number') {
		cond = and(cond, eq(table.invStockTable.itemId, input.itemId))!;
	}

	const rows = await ensureDb()
		.select({
			storeId: table.invStockTable.storeId,
			itemId: table.invStockTable.itemId,
			itemName: table.itemMasterTable.itemName,
			storeName: table.storeTable.storeName,
			totalQty: sql<string>`coalesce(sum(${table.invStockTable.quantity}::numeric), 0)::text`
		})
		.from(table.invStockTable)
		.innerJoin(
			table.storeTable,
			eq(table.invStockTable.storeId, table.storeTable.id)
		)
		.innerJoin(
			table.hospitalBranchTable,
			eq(table.storeTable.branchId, table.hospitalBranchTable.id)
		)
		.innerJoin(
			table.itemMasterTable,
			eq(table.invStockTable.itemId, table.itemMasterTable.id)
		)
		.where(cond)
		.groupBy(
			table.invStockTable.storeId,
			table.invStockTable.itemId,
			table.itemMasterTable.itemName,
			table.storeTable.storeName
		);

	const uom = await defaultIssueUnitNameByItemIds(
		input.hospitalId,
		[...new Set(rows.map((r) => r.itemId))]
	);
	return rows.map((r) => ({
		...r,
		issueUnitName: uom.get(r.itemId) ?? null
	}));
}

export async function listStockLots(
	event: RequestEvent,
	input: { hospitalId: string; storeId?: number; itemId?: number }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);

	let cond = and(
		eq(table.invStockTable.hospitalId, input.hospitalId),
		isNull(table.invStockTable.deletedAt),
		eq(table.hospitalBranchTable.hospitalId, input.hospitalId),
		sql`${table.storeTable.statusId} <> ${StatusEnum.DELETED}`
	);
	if (typeof input.storeId === 'number') {
		await assertStoreInHospital(input.hospitalId, input.storeId);
		cond = and(cond, eq(table.invStockTable.storeId, input.storeId))!;
	}
	if (typeof input.itemId === 'number') {
		cond = and(cond, eq(table.invStockTable.itemId, input.itemId))!;
	}

	const lotRows = await ensureDb()
		.select({
			stock: table.invStockTable,
			batch: table.itemBatchTable,
			itemName: table.itemMasterTable.itemName,
			storeName: table.storeTable.storeName
		})
		.from(table.invStockTable)
		.innerJoin(
			table.itemBatchTable,
			eq(table.invStockTable.batchId, table.itemBatchTable.id)
		)
		.innerJoin(
			table.storeTable,
			eq(table.invStockTable.storeId, table.storeTable.id)
		)
		.innerJoin(
			table.hospitalBranchTable,
			eq(table.storeTable.branchId, table.hospitalBranchTable.id)
		)
		.innerJoin(
			table.itemMasterTable,
			eq(table.invStockTable.itemId, table.itemMasterTable.id)
		)
		.where(cond)
		.orderBy(
			sql`${table.itemBatchTable.expiryDate} ASC NULLS LAST`,
			asc(table.invStockTable.id)
		);
	const uom = await defaultIssueUnitNameByItemIds(
		input.hospitalId,
		[...new Set(lotRows.map((r) => r.stock.itemId))]
	);
	return lotRows.map((r) => ({
		...r,
		issueUnitName: uom.get(r.stock.itemId) ?? null
	}));
}
