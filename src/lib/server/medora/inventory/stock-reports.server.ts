import { type RequestEvent } from '@sveltejs/kit';
import {
	and,
	desc,
	eq,
	gte,
	isNull,
	lte,
	sql,
	type SQL
} from 'drizzle-orm';
import type { AnyColumn } from 'drizzle-orm/column';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { InventoryMovementKindFilter } from '$lib/model/type/medora/inventory-report.type';
import { resolveItemUnitMastersByItemAndPurchaseUnit } from '$lib/server/medora/administration/item-master.server';
import { ensureHospitalInventoryAccess } from './inventory-scope.server';
import { issueQtyStringFromPurchaseReceipt } from './item-unit-inventory.server';
import { MAX_REPORT_EXPORT_ROWS } from './reports/report-export.server';

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
	/** DCONSUME only: per issue unit snapshot. */
	empSalePrice: string | null;
	/** DCONSUME only: issue qty × emp sale price. */
	lineAmount: string | null;
	createdAt: string;
};

function movementLineAmount(
	issueQty: string | null,
	empSalePrice: string | null
): string | null {
	if (!issueQty?.trim() || !empSalePrice?.trim()) return null;
	const q = Number(issueQty);
	const p = Number(empSalePrice);
	if (!Number.isFinite(q) || !Number.isFinite(p)) return null;
	return (Math.round(q * p * 100) / 100).toFixed(2);
}

function includeKind(
	kind: InventoryMovementKindFilter | undefined,
	target: InventoryMovementRow['kind']
): boolean {
	if (!kind || kind === 'all') return true;
	return kind === target;
}

function applyCreatedAtDateRange(
	cond: SQL | undefined,
	createdAtCol: AnyColumn,
	dateFrom?: string,
	dateTo?: string
): SQL | undefined {
	let next = cond;
	const from = dateFrom?.trim();
	const to = dateTo?.trim();
	if (from) {
		next = and(next, gte(sql`${createdAtCol}::date`, sql`${from}::date`));
	}
	if (to) {
		next = and(next, lte(sql`${createdAtCol}::date`, sql`${to}::date`));
	}
	return next;
}

function applyMovementColumnFilters(
	rows: InventoryMovementRow[],
	filters?: Record<string, string>
): InventoryMovementRow[] {
	if (!filters) return rows;
	const active = Object.entries(filters).filter(([, v]) => v?.trim());
	if (active.length === 0) return rows;

	return rows.filter((row) => {
		for (const [colId, raw] of active) {
			const filter = raw.trim().toLowerCase();
			if (!filter) continue;

			switch (colId) {
				case 'kind': {
					if (row.kind.toLowerCase() !== filter) return false;
					break;
				}
				case 'refNo': {
					const value = (row.refNo ?? '').toLowerCase();
					if (!value.includes(filter)) return false;
					break;
				}
				case 'storeId': {
					const filterId = Number(raw.trim());
					if (
						!Number.isFinite(filterId) ||
						row.storeId !== filterId
					) {
						return false;
					}
					break;
				}
				case 'storeName': {
					const value = (row.storeName ?? '').toLowerCase();
					if (value !== filter && !value.includes(filter)) return false;
					break;
				}
				case 'itemName': {
					const value = (row.itemName ?? '').toLowerCase();
					if (!value.includes(filter)) return false;
					break;
				}
				case 'batchNo': {
					const value = (row.batchNo ?? '').toLowerCase();
					if (!value.includes(filter)) return false;
					break;
				}
				case 'qty': {
					const value = String(row.qty).toLowerCase();
					if (!value.includes(filter)) return false;
					break;
				}
				case 'createdAt': {
					const value = (row.createdAt ?? '').toLowerCase();
					if (!value.includes(filter)) return false;
					break;
				}
				default:
					break;
			}
		}
		return true;
	});
}

export async function listInventoryMovement(
	event: RequestEvent,
	input: {
		hospitalId: string;
		storeId?: number;
		itemId?: number;
		kind?: InventoryMovementKindFilter;
		dateFrom?: string;
		dateTo?: string;
		columnFilters?: Record<string, string>;
		limit?: number;
	}
): Promise<InventoryMovementRow[]> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const limit = Math.min(
		MAX_REPORT_EXPORT_ROWS,
		Math.max(1, input.limit ?? 5000)
	);
	const perSourceLimit = limit;

	const grnRows: InventoryMovementRow[] = [];
	const dissRows: InventoryMovementRow[] = [];
	let dconRaw: Awaited<
		ReturnType<typeof fetchDepartmentConsumptionMovementRows>
	> = [];

	if (includeKind(input.kind, 'GRN')) {
		let grnWhere = and(
			eq(table.goodsReceiptNoteTable.hospitalId, input.hospitalId),
			isNull(table.goodsReceiptNoteTable.deletedAt),
			isNull(table.goodsReceiptLineTable.deletedAt)
		);
		if (typeof input.storeId === 'number') {
			grnWhere = and(
				grnWhere,
				eq(table.goodsReceiptNoteTable.storeId, input.storeId)
			)!;
		}
		if (typeof input.itemId === 'number') {
			grnWhere = and(
				grnWhere,
				eq(table.goodsReceiptLineTable.itemId, input.itemId)
			)!;
		}
		grnWhere = applyCreatedAtDateRange(
			grnWhere,
			table.goodsReceiptNoteTable.createdAt,
			input.dateFrom,
			input.dateTo
		);

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
				qty: table.goodsReceiptLineTable.purchasedQty,
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
			.where(grnWhere)
			.orderBy(desc(table.goodsReceiptNoteTable.createdAt))
			.limit(perSourceLimit);

		for (const r of grn) {
			grnRows.push({
				kind: r.kind,
				refId: r.refId,
				refNo: r.refNo != null ? String(r.refNo) : null,
				storeId: r.storeId,
				storeName: r.storeName,
				itemId: r.itemId,
				itemName: r.itemName,
				batchId: r.batchId,
				batchNo: r.batchNo,
				qty: String(r.qty),
				empSalePrice: null,
				lineAmount: null,
				createdAt: r.createdAt
			});
		}
	}

	if (includeKind(input.kind, 'DISSUE')) {
		let issueWhere = and(
			eq(table.invDepartmentIssueTable.hospitalId, input.hospitalId),
			isNull(table.invDepartmentIssueTable.deletedAt),
			isNull(table.invDepartmentIssueLineTable.deletedAt)
		);
		if (typeof input.storeId === 'number') {
			issueWhere = and(
				issueWhere,
				eq(table.invDepartmentIssueTable.fromStoreId, input.storeId)
			)!;
		}
		if (typeof input.itemId === 'number') {
			issueWhere = and(
				issueWhere,
				eq(table.invDepartmentIssueLineTable.itemId, input.itemId)
			)!;
		}
		issueWhere = applyCreatedAtDateRange(
			issueWhere,
			table.invDepartmentIssueTable.createdAt,
			input.dateFrom,
			input.dateTo
		);

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
			.where(issueWhere)
			.orderBy(desc(table.invDepartmentIssueTable.createdAt))
			.limit(perSourceLimit);

		for (const r of diss) {
			dissRows.push({
				kind: r.kind,
				refId: r.refId,
				refNo: r.refNo,
				storeId: r.storeId,
				storeName: r.storeName,
				itemId: r.itemId,
				itemName: r.itemName,
				batchId: r.batchId,
				batchNo: r.batchNo,
				qty: String(r.qty),
				empSalePrice: null,
				lineAmount: null,
				createdAt: r.createdAt
			});
		}
	}

	if (includeKind(input.kind, 'DCONSUME')) {
		dconRaw = await fetchDepartmentConsumptionMovementRows(
			input,
			perSourceLimit
		);
	}

	const dconEnriched: InventoryMovementRow[] = [];
	if (dconRaw.length > 0) {
		const iumMap = await resolveItemUnitMastersByItemAndPurchaseUnit(
			input.hospitalId,
			dconRaw.map((r) => ({
				itemId: r.itemId,
				purchaseUnitId: r.unitId
			}))
		);
		for (const r of dconRaw) {
			let issueQty: string | null = null;
			const ium = iumMap.get(`${r.itemId}:${r.unitId}`);
			if (ium) {
				try {
					issueQty = await issueQtyStringFromPurchaseReceipt({
						hospitalId: input.hospitalId,
						itemId: r.itemId,
						purchaseUnitId: r.unitId,
						purchaseQtyStr: String(r.qty)
					});
				} catch {
					issueQty = null;
				}
			}
			const emp =
				r.empSalePrice != null ? String(r.empSalePrice).trim() : null;
			dconEnriched.push({
				kind: 'DCONSUME',
				refId: r.refId,
				refNo: r.refNo,
				storeId: r.storeId,
				storeName: r.storeName,
				itemId: r.itemId,
				itemName: r.itemName,
				batchId: r.batchId,
				batchNo: r.batchNo,
				qty: String(r.qty),
				empSalePrice: emp || null,
				lineAmount: movementLineAmount(issueQty, emp),
				createdAt: r.createdAt
			});
		}
	}

	const merged = [...grnRows, ...dissRows, ...dconEnriched];
	merged.sort((a, b) =>
		a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
	);
	const filtered = applyMovementColumnFilters(merged, input.columnFilters);
	return filtered.slice(0, limit);
}

async function fetchDepartmentConsumptionMovementRows(
	input: {
		hospitalId: string;
		storeId?: number;
		itemId?: number;
		dateFrom?: string;
		dateTo?: string;
	},
	limit: number
) {
	let consWhere = and(
		eq(
			table.invDepartmentConsumptionTable.hospitalId,
			input.hospitalId
		),
		isNull(table.invDepartmentConsumptionTable.deletedAt),
		isNull(table.invDepartmentConsumptionLineTable.deletedAt)
	);
	if (typeof input.storeId === 'number') {
		consWhere = and(
			consWhere,
			eq(table.invDepartmentConsumptionTable.storeId, input.storeId)
		)!;
	}
	if (typeof input.itemId === 'number') {
		consWhere = and(
			consWhere,
			eq(table.invDepartmentConsumptionLineTable.itemId, input.itemId)
		)!;
	}
	consWhere = applyCreatedAtDateRange(
		consWhere,
		table.invDepartmentConsumptionTable.createdAt,
		input.dateFrom,
		input.dateTo
	);

	return ensureDb()
		.select({
			refId: sql<string>`${table.invDepartmentConsumptionTable.id}::text`,
			refNo: table.invDepartmentConsumptionTable.consumptionNo,
			storeId: table.invDepartmentConsumptionTable.storeId,
			storeName: table.storeTable.storeName,
			itemId: table.invDepartmentConsumptionLineTable.itemId,
			itemName: table.itemMasterTable.itemName,
			batchId: table.invDepartmentConsumptionLineTable.batchId,
			batchNo: table.itemBatchTable.batchNo,
			qty: table.invDepartmentConsumptionLineTable.quantity,
			unitId: table.invDepartmentConsumptionLineTable.unitId,
			empSalePrice: table.invDepartmentConsumptionLineTable.empSalePrice,
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
		.where(consWhere)
		.orderBy(desc(table.invDepartmentConsumptionTable.createdAt))
		.limit(limit);
}
