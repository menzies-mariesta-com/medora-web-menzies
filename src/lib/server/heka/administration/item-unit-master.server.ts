import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	ItemUnitMasterSchema,
	ItemUnitMasterSchemaInsert,
	ItemUnitMasterSchemaUpdate
} from '$lib/server/db/schema-type';
import type { ItemUnitMasterListRow } from '$lib/model/type/heka/ui-rows.type';
import { StringUtil } from '$lib/util/string.util.svelte';
import { StatusEnum } from '$lib/model/enum/db-link';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { and, asc, count, eq, ilike, isNull, ne, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

const purchaseUnitAlias = alias(table.unitTable, 'item_unit_purchase');
const issueUnitAlias = alias(table.unitTable, 'item_unit_issue');

function hospitalScope(hospitalId: string) {
	return eq(table.itemUnitMasterTable.hospitalId, hospitalId);
}

function activeItemUnitRow() {
	return and(
		ne(table.itemUnitMasterTable.statusId, StatusEnum.DELETED),
		isNull(table.itemUnitMasterTable.deletedAt)
	);
}

function rowToPayload(
	row: ItemUnitMasterSchema,
	purchaseUnitName: string | null,
	issueUnitName: string | null
): ItemUnitMasterListRow {
	const p = Number(row.purchaseConversionFactor);
	const i = Number(row.issueConversionFactor);
	return {
		...row,
		purchaseUnitName,
		issueUnitName,
		conversionDisplay: StringUtil.itemUnitConversionDisplay({
			purchaseUnitName: purchaseUnitName ?? '',
			issueUnitName: issueUnitName ?? '',
			purchaseFactor: p,
			issueFactor: i
		})
	};
}

export async function getItemUnitMasterPaginated(
	hospitalId: string,
	params?: PaginationParams & { search?: string; statusId?: number }
): Promise<PaginatedResult<ItemUnitMasterListRow>> {
	const { page, pageSize, limit, offset } = normalizePagination(params);
	const parts = [hospitalScope(hospitalId), activeItemUnitRow()];
	const search = params?.search?.trim();
	if (search && search.length > 0) {
		parts.push(
			or(
				ilike(purchaseUnitAlias.name, `%${search}%`),
				ilike(issueUnitAlias.name, `%${search}%`)
			)
		);
	}
	if (typeof params?.statusId === 'number') {
		parts.push(eq(table.itemUnitMasterTable.statusId, params.statusId));
	}
	const whereClause = and(...parts);

	const rows = await ensureDb()
		.select({
			row: table.itemUnitMasterTable,
			purchaseUnitName: purchaseUnitAlias.name,
			issueUnitName: issueUnitAlias.name
		})
		.from(table.itemUnitMasterTable)
		.leftJoin(
			purchaseUnitAlias,
			eq(table.itemUnitMasterTable.purchaseUnitId, purchaseUnitAlias.id)
		)
		.leftJoin(
			issueUnitAlias,
			eq(table.itemUnitMasterTable.issueUnitId, issueUnitAlias.id)
		)
		.where(whereClause)
		.orderBy(
			asc(purchaseUnitAlias.name),
			asc(issueUnitAlias.name),
			asc(table.itemUnitMasterTable.id)
		)
		.limit(limit)
		.offset(offset);

	const data = rows.map((r) =>
		rowToPayload(
			r.row,
			r.purchaseUnitName ?? null,
			r.issueUnitName ?? null
		)
	);

	const [countResult] = await ensureDb()
		.select({ count: count() })
		.from(table.itemUnitMasterTable)
		.leftJoin(
			purchaseUnitAlias,
			eq(table.itemUnitMasterTable.purchaseUnitId, purchaseUnitAlias.id)
		)
		.leftJoin(
			issueUnitAlias,
			eq(table.itemUnitMasterTable.issueUnitId, issueUnitAlias.id)
		)
		.where(whereClause);
	const total = countResult?.count ?? 0;

	return {
		data,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize) || 1
	};
}

export async function getItemUnitMasterById(
	hospitalId: string,
	input: { id: number }
): Promise<ItemUnitMasterListRow | null> {
	const [r] = await ensureDb()
		.select({
			row: table.itemUnitMasterTable,
			purchaseUnitName: purchaseUnitAlias.name,
			issueUnitName: issueUnitAlias.name
		})
		.from(table.itemUnitMasterTable)
		.leftJoin(
			purchaseUnitAlias,
			eq(table.itemUnitMasterTable.purchaseUnitId, purchaseUnitAlias.id)
		)
		.leftJoin(
			issueUnitAlias,
			eq(table.itemUnitMasterTable.issueUnitId, issueUnitAlias.id)
		)
		.where(
			and(
				eq(table.itemUnitMasterTable.id, input.id),
				hospitalScope(hospitalId),
				activeItemUnitRow()
			)
		);
	if (!r) return null;
	return rowToPayload(
		r.row,
		r.purchaseUnitName ?? null,
		r.issueUnitName ?? null
	);
}

export async function createItemUnitMaster(
	hospitalId: string,
	payload: Omit<
		ItemUnitMasterSchemaInsert,
		'hospitalId' | 'statusId'
	>
): Promise<ItemUnitMasterSchema> {
	const p = Number(payload.purchaseConversionFactor);
	const i = Number(payload.issueConversionFactor);
	if (!Number.isFinite(p) || p <= 0) {
		throw new Error('Purchase conversion factor must be a positive number.');
	}
	if (!Number.isFinite(i) || i <= 0) {
		throw new Error('Issue conversion factor must be a positive number.');
	}

	const [existing] = await ensureDb()
		.select({ id: table.itemUnitMasterTable.id })
		.from(table.itemUnitMasterTable)
		.where(
			and(
				hospitalScope(hospitalId),
				eq(table.itemUnitMasterTable.purchaseUnitId, payload.purchaseUnitId),
				eq(table.itemUnitMasterTable.issueUnitId, payload.issueUnitId),
				activeItemUnitRow()
			)
		)
		.limit(1);
	if (existing) {
		throw new Error(
			'This unit conversion already exists. Edit the existing row.'
		);
	}

	const [row] = await ensureDb()
		.insert(table.itemUnitMasterTable)
		.values({
			hospitalId,
			purchaseUnitId: payload.purchaseUnitId,
			purchaseConversionFactor: String(p),
			issueUnitId: payload.issueUnitId,
			issueConversionFactor: String(i),
			statusId: StatusEnum.ACTIVE
		})
		.returning();
	if (!row) throw new Error('Insert failed');

	return row;
}

export async function updateItemUnitMaster(
	hospitalId: string,
	payload: ItemUnitMasterSchemaUpdate & { id: number }
): Promise<ItemUnitMasterSchema> {
	const { id, ...rest } = payload;
	const [existing] = await ensureDb()
		.select()
		.from(table.itemUnitMasterTable)
		.where(
			and(
				eq(table.itemUnitMasterTable.id, id),
				hospitalScope(hospitalId),
				activeItemUnitRow()
			)
		);
	if (!existing) throw new Error('Record not found.');

	let nextPurchase = existing.purchaseConversionFactor;
	let nextIssue = existing.issueConversionFactor;
	let nextPurchaseUnit = existing.purchaseUnitId;
	let nextIssueUnit = existing.issueUnitId;

	if (rest.purchaseConversionFactor !== undefined) {
		const p = Number(rest.purchaseConversionFactor);
		if (!Number.isFinite(p) || p <= 0) {
			throw new Error('Purchase conversion factor must be a positive number.');
		}
		nextPurchase = String(p);
	}
	if (rest.issueConversionFactor !== undefined) {
		const i = Number(rest.issueConversionFactor);
		if (!Number.isFinite(i) || i <= 0) {
			throw new Error('Issue conversion factor must be a positive number.');
		}
		nextIssue = String(i);
	}
	if (rest.purchaseUnitId !== undefined) {
		nextPurchaseUnit = rest.purchaseUnitId;
	}
	if (rest.issueUnitId !== undefined) {
		nextIssueUnit = rest.issueUnitId;
	}

	const [conflict] = await ensureDb()
		.select({ id: table.itemUnitMasterTable.id })
		.from(table.itemUnitMasterTable)
		.where(
			and(
				hospitalScope(hospitalId),
				eq(table.itemUnitMasterTable.purchaseUnitId, nextPurchaseUnit),
				eq(table.itemUnitMasterTable.issueUnitId, nextIssueUnit),
				activeItemUnitRow(),
				ne(table.itemUnitMasterTable.id, id)
			)
		)
		.limit(1);
	if (conflict) {
		throw new Error('That unit conversion already exists.');
	}

	const setValues: ItemUnitMasterSchemaUpdate = {
		purchaseUnitId: nextPurchaseUnit,
		issueUnitId: nextIssueUnit,
		purchaseConversionFactor: nextPurchase,
		issueConversionFactor: nextIssue
	};
	if (rest.statusId !== undefined) setValues.statusId = rest.statusId;

	const [row] = await ensureDb()
		.update(table.itemUnitMasterTable)
		.set(setValues)
		.where(eq(table.itemUnitMasterTable.id, id))
		.returning();
	if (!row) throw new Error('Update failed');

	return row;
}

export async function deleteItemUnitMaster(
	hospitalId: string,
	input: { id: number }
): Promise<void> {
	const [existing] = await ensureDb()
		.select()
		.from(table.itemUnitMasterTable)
		.where(
			and(
				eq(table.itemUnitMasterTable.id, input.id),
				hospitalScope(hospitalId),
				activeItemUnitRow()
			)
		);
	if (!existing) throw new Error('Record not found.');

	const [ref] = await ensureDb()
		.select({ id: table.itemMasterItemUnitMasterTable.id })
		.from(table.itemMasterItemUnitMasterTable)
		.where(
			and(
				eq(table.itemMasterItemUnitMasterTable.hospitalId, hospitalId),
				eq(table.itemMasterItemUnitMasterTable.itemUnitMasterId, input.id),
				isNull(table.itemMasterItemUnitMasterTable.deletedAt)
			)
		)
		.limit(1);
	if (ref) {
		throw new Error(
			'This unit conversion is tagged to one or more items. Remove it from those items first.'
		);
	}

	await ensureDb()
		.update(table.itemUnitMasterTable)
		.set({
			statusId: StatusEnum.DELETED,
			deletedAt: new Date().toISOString()
		})
		.where(eq(table.itemUnitMasterTable.id, input.id));
}
