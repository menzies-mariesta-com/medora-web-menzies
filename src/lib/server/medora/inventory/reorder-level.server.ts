import { error, type RequestEvent } from '@sveltejs/kit';
import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import { purchaseQtyToIssueQtyString } from '$lib/server/medora/inventory/item-unit-inventory.server';
import {
	assertStoreInHospital,
	ensureHospitalInventoryAccess
} from './inventory-scope.server';

export type ReorderLevelRow = {
	id: number;
	hospitalId: string;
	storeId: number;
	storeName: string | null;
	itemId: number;
	itemName: string | null;
	minQty: string;
	itemUnitMasterId: number | null;
	purchaseConversionFactor?: string | null;
	issueConversionFactor?: string | null;
	purchaseUnitName?: string | null;
	issueUnitName?: string | null;
	createdAt: string;
	updatedAt: string;
};

export type ReorderLevelLookups = {
	stores: { id: number; name: string | null }[];
	items: { id: number; name: string | null }[];
};

function parsePurchaseMinQty(raw: unknown): string {
	const n = Number(raw);
	if (!Number.isFinite(n) || n < 0)
		throw error(400, 'minQty must be a non-negative number');
	return String(Math.floor(n));
}

async function assertItemUnitMasterLinked(input: {
	hospitalId: string;
	itemId: number;
	itemUnitMasterId: number;
}) {
	const [row] = await ensureDb()
		.select({
			id: table.itemUnitMasterTable.id,
			purchaseConversionFactor:
				table.itemUnitMasterTable.purchaseConversionFactor,
			issueConversionFactor:
				table.itemUnitMasterTable.issueConversionFactor
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
				eq(
					table.itemMasterItemUnitMasterTable.hospitalId,
					input.hospitalId
				),
				eq(
					table.itemMasterItemUnitMasterTable.itemMasterId,
					input.itemId
				),
				eq(table.itemUnitMasterTable.id, input.itemUnitMasterId),
				isNull(table.itemMasterItemUnitMasterTable.deletedAt),
				isNull(table.itemUnitMasterTable.deletedAt),
				ne(table.itemUnitMasterTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!row)
		throw error(400, 'Invalid item unit master for this item');
	return row;
}

export async function getReorderLevelLookups(
	event: RequestEvent,
	input: { hospitalId: string }
): Promise<ReorderLevelLookups> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);

	const [stores, items] = await Promise.all([
		ensureDb()
			.select({
				id: table.storeTable.id,
				name: table.storeTable.storeName
			})
			.from(table.storeTable)
			.innerJoin(
				table.hospitalBranchTable,
				eq(table.storeTable.branchId, table.hospitalBranchTable.id)
			)
			.where(
				and(
					eq(table.hospitalBranchTable.hospitalId, input.hospitalId),
					sql`${table.storeTable.statusId} <> ${StatusEnum.DELETED}`,
					isNull(table.storeTable.deletedAt)
				)
			)
			.orderBy(asc(table.storeTable.storeName)),
		ensureDb()
			.select({
				id: table.itemMasterTable.id,
				name: table.itemMasterTable.itemName
			})
			.from(table.itemMasterTable)
			.where(
				and(
					eq(table.itemMasterTable.hospitalId, input.hospitalId),
					ne(table.itemMasterTable.statusId, StatusEnum.DELETED),
					isNull(table.itemMasterTable.deletedAt)
				)
			)
			.orderBy(asc(table.itemMasterTable.itemName))
	]);

	return {
		stores: stores.map((s) => ({ id: s.id, name: s.name })),
		items: items.map((it) => ({ id: it.id, name: it.name }))
	};
}

export async function listReorderLevels(
	event: RequestEvent,
	input: {
		hospitalId: string;
		storeId?: number;
		q?: string;
		limit?: number;
	}
): Promise<ReorderLevelRow[]> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);

	const limit = Math.min(500, Math.max(1, input.limit ?? 200));
	const iumPu = alias(table.unitTable, 'reorder_ium_pu');
	const iumIss = alias(table.unitTable, 'reorder_ium_iu');

	let whereExpr = and(
		eq(table.invItemReorderLevelTable.hospitalId, input.hospitalId),
		isNull(table.invItemReorderLevelTable.deletedAt),
		sql`${table.storeTable.statusId} <> ${StatusEnum.DELETED}`,
		eq(table.hospitalBranchTable.hospitalId, input.hospitalId),
		eq(table.itemMasterTable.hospitalId, input.hospitalId),
		ne(table.itemMasterTable.statusId, StatusEnum.DELETED)
	);

	if (typeof input.storeId === 'number') {
		await assertStoreInHospital(input.hospitalId, input.storeId);
		whereExpr = and(
			whereExpr,
			eq(table.invItemReorderLevelTable.storeId, input.storeId)
		)!;
	}

	const q = input.q?.trim();
	if (q) {
		const pattern = `%${q.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
		whereExpr = and(
			whereExpr,
			sql`(${table.itemMasterTable.itemName} ilike ${pattern} or ${table.storeTable.storeName} ilike ${pattern})`
		)!;
	}

	const rl = table.invItemReorderLevelTable;

	const rows = await ensureDb()
		.select({
			id: rl.id,
			hospitalId: rl.hospitalId,
			storeId: rl.storeId,
			storeName: table.storeTable.storeName,
			itemId: rl.itemId,
			itemName: table.itemMasterTable.itemName,
			minQty: sql<string>`${rl.minQty}::text`,
			itemUnitMasterId: rl.itemUnitMasterId,
			purchaseConversionFactor:
				table.itemUnitMasterTable.purchaseConversionFactor,
			issueConversionFactor:
				table.itemUnitMasterTable.issueConversionFactor,
			purchaseUnitName: iumPu.name,
			issueUnitName: iumIss.name,
			createdAt: rl.createdAt,
			updatedAt: rl.updatedAt
		})
		.from(rl)
		.innerJoin(table.storeTable, eq(rl.storeId, table.storeTable.id))
		.innerJoin(
			table.hospitalBranchTable,
			eq(table.storeTable.branchId, table.hospitalBranchTable.id)
		)
		.innerJoin(
			table.itemMasterTable,
			eq(rl.itemId, table.itemMasterTable.id)
		)
		.leftJoin(
			table.itemUnitMasterTable,
			eq(rl.itemUnitMasterId, table.itemUnitMasterTable.id)
		)
		.leftJoin(
			iumPu,
			eq(table.itemUnitMasterTable.purchaseUnitId, iumPu.id)
		)
		.leftJoin(
			iumIss,
			eq(table.itemUnitMasterTable.issueUnitId, iumIss.id)
		)
		.where(whereExpr)
		.orderBy(
			asc(table.storeTable.storeName),
			asc(table.itemMasterTable.itemName)
		)
		.limit(limit);

	return rows;
}

async function selectJoinedReorderRow(
	id: number
): Promise<ReorderLevelRow | null> {
	const iumPu = alias(table.unitTable, 'reorder_ium_pu_single');
	const iumIss = alias(table.unitTable, 'reorder_ium_iu_single');
	const rl = table.invItemReorderLevelTable;

	const [joined] = await ensureDb()
		.select({
			id: rl.id,
			hospitalId: rl.hospitalId,
			storeId: rl.storeId,
			storeName: table.storeTable.storeName,
			itemId: rl.itemId,
			itemName: table.itemMasterTable.itemName,
			minQty: sql<string>`${rl.minQty}::text`,
			itemUnitMasterId: rl.itemUnitMasterId,
			purchaseConversionFactor:
				table.itemUnitMasterTable.purchaseConversionFactor,
			issueConversionFactor:
				table.itemUnitMasterTable.issueConversionFactor,
			purchaseUnitName: iumPu.name,
			issueUnitName: iumIss.name,
			createdAt: rl.createdAt,
			updatedAt: rl.updatedAt
		})
		.from(rl)
		.innerJoin(table.storeTable, eq(rl.storeId, table.storeTable.id))
		.innerJoin(
			table.itemMasterTable,
			eq(rl.itemId, table.itemMasterTable.id)
		)
		.leftJoin(
			table.itemUnitMasterTable,
			eq(rl.itemUnitMasterId, table.itemUnitMasterTable.id)
		)
		.leftJoin(
			iumPu,
			eq(table.itemUnitMasterTable.purchaseUnitId, iumPu.id)
		)
		.leftJoin(
			iumIss,
			eq(table.itemUnitMasterTable.issueUnitId, iumIss.id)
		)
		.where(eq(rl.id, id))
		.limit(1);
	return joined ?? null;
}

/** Upserts reorder row; stores {@link minQty} by converting purchase qty → issue qty via item unit master. */
export async function upsertReorderLevel(
	event: RequestEvent,
	input: {
		hospitalId: string;
		storeId: number;
		itemId: number;
		itemUnitMasterId: number;
		minQtyPurchase: unknown;
		/** When editing an existing row; if store/item triple changes, the old row is soft-deleted first. */
		replaceRowId?: number;
	}
): Promise<ReorderLevelRow> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	await assertStoreInHospital(input.hospitalId, input.storeId);

	const purchaseQtyStr = parsePurchaseMinQty(input.minQtyPurchase);

	const [item] = await ensureDb()
		.select({ id: table.itemMasterTable.id })
		.from(table.itemMasterTable)
		.where(
			and(
				eq(table.itemMasterTable.id, input.itemId),
				eq(table.itemMasterTable.hospitalId, input.hospitalId),
				ne(table.itemMasterTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!item) throw error(400, 'Invalid item for this hospital');

	const ium = await assertItemUnitMasterLinked({
		hospitalId: input.hospitalId,
		itemId: input.itemId,
		itemUnitMasterId: input.itemUnitMasterId
	});

	const minQtyIssue = purchaseQtyToIssueQtyString(
		purchaseQtyStr,
		String(ium.purchaseConversionFactor),
		String(ium.issueConversionFactor)
	);

	const t = table.invItemReorderLevelTable;

	const row = await ensureDb().transaction(async (tx) => {
		if (
			input.replaceRowId != null &&
			Number.isFinite(input.replaceRowId)
		) {
			const [existing] = await tx
				.select({
					id: t.id,
					storeId: t.storeId,
					itemId: t.itemId
				})
				.from(t)
				.where(
					and(
						eq(t.id, input.replaceRowId),
						eq(t.hospitalId, input.hospitalId),
						isNull(t.deletedAt)
					)
				)
				.limit(1);
			if (!existing) throw error(404, 'Reorder row not found');
			const tripleChanged =
				existing.storeId !== input.storeId ||
				existing.itemId !== input.itemId;
			if (tripleChanged) {
				await tx
					.update(t)
					.set({ deletedAt: sql`now()` })
					.where(eq(t.id, input.replaceRowId));
			}
		}

		const [ins] = await tx
			.insert(t)
			.values({
				hospitalId: input.hospitalId,
				storeId: input.storeId,
				itemId: input.itemId,
				minQty: minQtyIssue,
				itemUnitMasterId: input.itemUnitMasterId
			})
			.onConflictDoUpdate({
				target: [t.hospitalId, t.storeId, t.itemId],
				targetWhere: isNull(t.deletedAt),
				set: {
					minQty: minQtyIssue,
					itemUnitMasterId: input.itemUnitMasterId,
					updatedAt: sql`now()`
				}
			})
			.returning({ id: t.id });

		if (!ins) throw error(500, 'Failed to save reorder level');

		return ins;
	});

	const joined = await selectJoinedReorderRow(row.id);
	if (!joined) throw error(500, 'Failed to load saved reorder level');
	return joined;
}

export async function deleteReorderLevel(
	event: RequestEvent,
	input: { hospitalId: string; id: number }
): Promise<void> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const [row] = await ensureDb()
		.select({ hospitalId: table.invItemReorderLevelTable.hospitalId })
		.from(table.invItemReorderLevelTable)
		.where(eq(table.invItemReorderLevelTable.id, input.id))
		.limit(1);
	if (!row) return;
	if (row.hospitalId !== input.hospitalId)
		throw error(403, 'Forbidden');

	await ensureDb()
		.update(table.invItemReorderLevelTable)
		.set({ deletedAt: sql`now()` })
		.where(
			and(
				eq(table.invItemReorderLevelTable.id, input.id),
				isNull(table.invItemReorderLevelTable.deletedAt)
			)
		);
}
