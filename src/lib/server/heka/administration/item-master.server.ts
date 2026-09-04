import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	ItemMasterSchema,
	ItemMasterSchemaInsert,
	ItemMasterSchemaUpdate,
	UnitSchema,
	UnitTypeSchema
} from '$lib/server/db/schema-type';
import {
	CategoryEnum,
	StatusEnum,
	YesNoEnum
} from '$lib/model/enum/db-link';
import {
	ITEM_MASTER_CATEGORY_IDS,
	isItemMasterCategoryId
} from '$lib/model/enum/item-master-category.enum';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import {
	and,
	asc,
	count,
	eq,
	ilike,
	inArray,
	isNull,
	ne
} from 'drizzle-orm';
import { getPharmacyGenericById } from '$lib/server/heka/administration/pharmacy-generic.server';
import { alias } from 'drizzle-orm/pg-core';
import { StringUtil } from '$lib/util/string.util.svelte';

export type ItemMasterListPayload = ItemMasterSchema & {
	pharmacyGenericName: string | null;
	itemUnitMasterIds?: number[];
	/** Item unit master id with {@link YesNoEnum#YES} on the link row; null when no links. */
	defaultItemUnitMasterId?: number | null;
};

const purchaseUnitAlias = alias(
	table.unitTable,
	'item_unit_purchase'
);
const issueUnitAlias = alias(table.unitTable, 'item_unit_issue');

function assertItemMasterCategory(categoryId: number): void {
	if (!isItemMasterCategoryId(categoryId)) {
		throw new Error(
			'Item category must be General Supply, Pharmacy Supply, or Medical Supply.'
		);
	}
}

/** Trimmed non-empty string, otherwise null (shared optional text fields). */
function trimEmptyToNull(value: string | null | undefined): string | null {
	const t = value?.trim();
	return t ? t : null;
}

/** Parses optional markup percent (0–999); defaults to `0.00`. */
export function parseItemMarkupPercent(
	raw: string | number | null | undefined
): string {
	if (raw == null || raw === '') return '0.00';
	const n = Number(raw);
	if (!Number.isFinite(n) || n < 0 || n > 999) {
		throw new Error('Item markup must be between 0 and 999.');
	}
	return n.toFixed(2);
}

function hospitalItemScope(hospitalId: string) {
	return eq(table.itemMasterTable.hospitalId, hospitalId);
}

async function resolvePharmacyGenericIdForWrite(input: {
	hospitalId: string;
	categoryId: number;
	pharmacyGenericId: number | null | undefined;
}): Promise<number | null> {
	if (input.categoryId === CategoryEnum.PHARMACY_SUPPLY) {
		const gid = input.pharmacyGenericId;
		if (gid == null || !Number.isFinite(gid)) {
			throw new Error(
				'Pharmacy generic is required for Pharmacy Supply items.'
			);
		}
		const g = await getPharmacyGenericById(input.hospitalId, {
			id: gid
		});
		if (!g) {
			throw new Error('Invalid or inactive pharmacy generic.');
		}
		return gid;
	}
	return null;
}

export async function getItemMasterCategories() {
	return ensureDb()
		.select()
		.from(table.categoryTable)
		.where(
			and(
				inArray(table.categoryTable.id, [
					...ITEM_MASTER_CATEGORY_IDS
				]),
				ne(table.categoryTable.statusId, StatusEnum.DELETED)
			)
		)
		.orderBy(asc(table.categoryTable.categoryName));
}

export async function getUnitTypesForItemMaster(): Promise<
	UnitTypeSchema[]
> {
	return ensureDb()
		.select()
		.from(table.unitTypeTable)
		.where(ne(table.unitTypeTable.statusId, StatusEnum.DELETED))
		.orderBy(asc(table.unitTypeTable.name));
}

export async function getUnitsForItemMaster(params?: {
	unitTypeId?: number | null;
}): Promise<UnitSchema[]> {
	const notDeleted = ne(table.unitTable.statusId, StatusEnum.DELETED);
	const typeId = params?.unitTypeId;
	const whereExpr =
		typeId != null && Number.isFinite(typeId)
			? and(notDeleted, eq(table.unitTable.unitTypeId, typeId))
			: notDeleted;
	return ensureDb()
		.select()
		.from(table.unitTable)
		.where(whereExpr)
		.orderBy(asc(table.unitTable.name));
}

export async function getUnitById(input: {
	id: number;
}): Promise<UnitSchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.unitTable)
		.where(eq(table.unitTable.id, input.id));
	return row ?? null;
}

export async function getItemMasterPaginated(
	hospitalId: string,
	params?: PaginationParams
): Promise<PaginatedResult<ItemMasterListPayload>> {
	const { page, pageSize, limit, offset } =
		normalizePagination(params);
	const conditions = [hospitalItemScope(hospitalId)];
	if (typeof params?.statusId === 'number') {
		conditions.push(
			eq(table.itemMasterTable.statusId, params.statusId)
		);
	} else {
		conditions.push(
			eq(table.itemMasterTable.statusId, StatusEnum.ACTIVE)
		);
	}
	const nameFilter = params?.name?.trim();
	if (nameFilter) {
		conditions.push(
			ilike(table.itemMasterTable.itemName, `%${nameFilter}%`)
		);
	}
	const codeFilter = params?.itemCode?.trim();
	if (codeFilter) {
		conditions.push(
			ilike(table.itemMasterTable.itemCode, `%${codeFilter}%`)
		);
	}
	if (typeof params?.categoryId === 'number') {
		conditions.push(
			eq(table.itemMasterTable.categoryId, params.categoryId)
		);
	}
	const whereClause = and(...conditions);

	const rows = await ensureDb()
		.select({
			item: table.itemMasterTable,
			pharmacyGenericName: table.pharmacyGenericTable.name
		})
		.from(table.itemMasterTable)
		.leftJoin(
			table.pharmacyGenericTable,
			eq(
				table.itemMasterTable.pharmacyGenericId,
				table.pharmacyGenericTable.id
			)
		)
		.where(whereClause)
		.orderBy(asc(table.itemMasterTable.itemName))
		.limit(limit)
		.offset(offset);

	const data: ItemMasterListPayload[] = rows.map((r) => ({
		...r.item,
		pharmacyGenericName: r.pharmacyGenericName ?? null
	}));

	const [countResult] = await ensureDb()
		.select({ count: count() })
		.from(table.itemMasterTable)
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

export async function getItemMasterById(input: {
	hospitalId: string;
	id: number;
}): Promise<ItemMasterListPayload | null> {
	const [row] = await ensureDb()
		.select({
			item: table.itemMasterTable,
			pharmacyGenericName: table.pharmacyGenericTable.name
		})
		.from(table.itemMasterTable)
		.leftJoin(
			table.pharmacyGenericTable,
			eq(
				table.itemMasterTable.pharmacyGenericId,
				table.pharmacyGenericTable.id
			)
		)
		.where(
			and(
				hospitalItemScope(input.hospitalId),
				eq(table.itemMasterTable.id, input.id),
				ne(table.itemMasterTable.statusId, StatusEnum.DELETED)
			)
		);
	if (!row) return null;

	const links = await ensureDb()
		.select({
			itemUnitMasterId:
				table.itemMasterItemUnitMasterTable.itemUnitMasterId,
			isDefaultYesNo:
				table.itemMasterItemUnitMasterTable.isDefaultYesNo
		})
		.from(table.itemMasterItemUnitMasterTable)
		.where(
			and(
				eq(
					table.itemMasterItemUnitMasterTable.hospitalId,
					input.hospitalId
				),
				eq(
					table.itemMasterItemUnitMasterTable.itemMasterId,
					input.id
				),
				isNull(table.itemMasterItemUnitMasterTable.deletedAt)
			)
		)
		.orderBy(asc(table.itemMasterItemUnitMasterTable.id));
	const itemUnitMasterIds = links
		.map((l) => l.itemUnitMasterId)
		.filter((id): id is number => typeof id === 'number');
	let defaultItemUnitMasterId: number | null = null;
	for (const l of links) {
		if (
			l.isDefaultYesNo === YesNoEnum.YES &&
			typeof l.itemUnitMasterId === 'number'
		) {
			defaultItemUnitMasterId = l.itemUnitMasterId;
			break;
		}
	}
	if (
		defaultItemUnitMasterId == null &&
		itemUnitMasterIds.length > 0
	) {
		defaultItemUnitMasterId = itemUnitMasterIds[0] ?? null;
	}

	return {
		...row.item,
		pharmacyGenericName: row.pharmacyGenericName ?? null,
		itemUnitMasterIds,
		defaultItemUnitMasterId
	};
}

export async function listItemUnitMastersForItemMaster(
	hospitalId: string
): Promise<
	{
		id: number;
		conversionDisplay: string;
		purchaseUnitId: number;
		issueUnitId: number;
		/** Purchase unit label for line UIs (e.g. metric tiles). */
		purchaseUnitName: string;
		issueUnitName: string;
		purchaseConversionFactor: string;
		issueConversionFactor: string;
	}[]
> {
	const rows = await ensureDb()
		.select({
			id: table.itemUnitMasterTable.id,
			purchaseUnitId: table.itemUnitMasterTable.purchaseUnitId,
			issueUnitId: table.itemUnitMasterTable.issueUnitId,
			purchaseFactor:
				table.itemUnitMasterTable.purchaseConversionFactor,
			issueFactor: table.itemUnitMasterTable.issueConversionFactor,
			purchaseUnitName: purchaseUnitAlias.name,
			issueUnitName: issueUnitAlias.name
		})
		.from(table.itemUnitMasterTable)
		.leftJoin(
			purchaseUnitAlias,
			eq(
				table.itemUnitMasterTable.purchaseUnitId,
				purchaseUnitAlias.id
			)
		)
		.leftJoin(
			issueUnitAlias,
			eq(table.itemUnitMasterTable.issueUnitId, issueUnitAlias.id)
		)
		.where(
			and(
				eq(table.itemUnitMasterTable.hospitalId, hospitalId),
				ne(table.itemUnitMasterTable.statusId, StatusEnum.DELETED),
				ne(purchaseUnitAlias.statusId, StatusEnum.DELETED),
				ne(issueUnitAlias.statusId, StatusEnum.DELETED)
			)
		)
		.orderBy(asc(purchaseUnitAlias.name), asc(issueUnitAlias.name));

	return rows.map((r) => ({
		id: r.id,
		purchaseUnitId: r.purchaseUnitId,
		issueUnitId: r.issueUnitId,
		conversionDisplay: StringUtil.itemUnitConversionDisplay({
			purchaseUnitName: r.purchaseUnitName ?? '',
			issueUnitName: r.issueUnitName ?? '',
			purchaseFactor: Number(r.purchaseFactor),
			issueFactor: Number(r.issueFactor)
		}),
		purchaseUnitName: r.purchaseUnitName ?? '',
		issueUnitName: r.issueUnitName ?? '',
		purchaseConversionFactor: String(r.purchaseFactor),
		issueConversionFactor: String(r.issueFactor)
	}));
}

/**
 * For inventory lines that store `unitId` = purchase UOM, resolve the Item Unit Master
 * (item ↔ IUM link + IUM row with matching `purchaseUnitId`). If multiple IUMs share the
 * same purchase unit, prefers the item link with {@link YesNoEnum#YES} default, then
 * lowest IUM id.
 */
export async function resolveItemUnitMastersByItemAndPurchaseUnit(
	hospitalId: string,
	pairs: { itemId: number; purchaseUnitId: number }[]
): Promise<
	Map<
		string,
		{
			id: number;
			conversionDisplay: string;
			purchaseConversionFactor: string;
			issueConversionFactor: string;
			issueUnitName: string;
		}
	>
> {
	const out = new Map<
		string,
		{
			id: number;
			conversionDisplay: string;
			purchaseConversionFactor: string;
			issueConversionFactor: string;
			issueUnitName: string;
		}
	>();
	if (pairs.length === 0) return out;
	const keySet = new Set(
		pairs.map((p) => `${p.itemId}:${p.purchaseUnitId}`)
	);
	const itemIds = [
		...new Set(
			pairs
				.map((p) => p.itemId)
				.filter((n) => Number.isFinite(n) && n > 0)
		)
	];
	const purIds = [
		...new Set(
			pairs
				.map((p) => p.purchaseUnitId)
				.filter((n) => Number.isFinite(n) && n > 0)
		)
	];
	if (itemIds.length === 0 || purIds.length === 0) return out;

	const rows = await ensureDb()
		.select({
			itemMasterId: table.itemMasterItemUnitMasterTable.itemMasterId,
			purchaseUnitId: table.itemUnitMasterTable.purchaseUnitId,
			iumId: table.itemUnitMasterTable.id,
			isDefault: table.itemMasterItemUnitMasterTable.isDefaultYesNo,
			purchaseFactor:
				table.itemUnitMasterTable.purchaseConversionFactor,
			issueFactor: table.itemUnitMasterTable.issueConversionFactor,
			purchaseUnitName: purchaseUnitAlias.name,
			issueUnitName: issueUnitAlias.name
		})
		.from(table.itemMasterItemUnitMasterTable)
		.innerJoin(
			table.itemUnitMasterTable,
			and(
				eq(
					table.itemUnitMasterTable.id,
					table.itemMasterItemUnitMasterTable.itemUnitMasterId
				),
				eq(table.itemUnitMasterTable.hospitalId, hospitalId),
				ne(table.itemUnitMasterTable.statusId, StatusEnum.DELETED)
			)
		)
		.leftJoin(
			purchaseUnitAlias,
			and(
				eq(
					table.itemUnitMasterTable.purchaseUnitId,
					purchaseUnitAlias.id
				),
				ne(purchaseUnitAlias.statusId, StatusEnum.DELETED)
			)
		)
		.leftJoin(
			issueUnitAlias,
			and(
				eq(table.itemUnitMasterTable.issueUnitId, issueUnitAlias.id),
				ne(issueUnitAlias.statusId, StatusEnum.DELETED)
			)
		)
		.where(
			and(
				eq(
					table.itemMasterItemUnitMasterTable.hospitalId,
					hospitalId
				),
				isNull(table.itemMasterItemUnitMasterTable.deletedAt),
				inArray(
					table.itemMasterItemUnitMasterTable.itemMasterId,
					itemIds
				),
				inArray(table.itemUnitMasterTable.purchaseUnitId, purIds)
			)
		);

	const byKey = new Map<
		string,
		{
			id: number;
			conversionDisplay: string;
			isDefault: number;
			sortId: number;
			purchaseConversionFactor: string;
			issueConversionFactor: string;
			issueUnitName: string;
		}[]
	>();
	for (const r of rows) {
		const k = `${r.itemMasterId}:${r.purchaseUnitId}`;
		if (!keySet.has(k)) continue;
		const conversionDisplay = StringUtil.itemUnitConversionDisplay({
			purchaseUnitName: r.purchaseUnitName ?? '',
			issueUnitName: r.issueUnitName ?? '',
			purchaseFactor: Number(r.purchaseFactor),
			issueFactor: Number(r.issueFactor)
		});
		const rec = {
			id: r.iumId,
			conversionDisplay,
			isDefault: r.isDefault,
			sortId: r.iumId,
			purchaseConversionFactor: String(r.purchaseFactor),
			issueConversionFactor: String(r.issueFactor),
			issueUnitName: r.issueUnitName ?? ''
		};
		const arr = byKey.get(k) ?? [];
		arr.push(rec);
		byKey.set(k, arr);
	}
	for (const [k, arr] of byKey) {
		arr.sort(
			(a, b) => b.isDefault - a.isDefault || a.sortId - b.sortId
		);
		const best = arr[0];
		if (best) {
			out.set(k, {
				id: best.id,
				conversionDisplay: best.conversionDisplay,
				purchaseConversionFactor: best.purchaseConversionFactor,
				issueConversionFactor: best.issueConversionFactor,
				issueUnitName: best.issueUnitName
			});
		}
	}

	return out;
}

export async function setItemUnitMastersForItem(
	hospitalId: string,
	input: {
		itemMasterId: number;
		itemUnitMasterIds: number[];
		defaultItemUnitMasterId?: number | null;
	}
): Promise<void> {
	const uniqueIds = Array.from(
		new Set(
			(input.itemUnitMasterIds ?? [])
				.map((x) => Number(x))
				.filter((n) => Number.isFinite(n) && n > 0)
		)
	);

	let defaultIumId: number | null = null;
	if (uniqueIds.length > 0) {
		const raw = input.defaultItemUnitMasterId;
		if (raw != null && Number.isFinite(Number(raw))) {
			const n = Number(raw);
			if (!uniqueIds.includes(n)) {
				throw new Error(
					'Default unit conversion must be one of the included conversions.'
				);
			}
			defaultIumId = n;
		} else {
			defaultIumId = uniqueIds[0] ?? null;
		}
	}

	// Validate item exists in hospital
	const [item] = await ensureDb()
		.select({ id: table.itemMasterTable.id })
		.from(table.itemMasterTable)
		.where(
			and(
				eq(table.itemMasterTable.hospitalId, hospitalId),
				eq(table.itemMasterTable.id, input.itemMasterId),
				ne(table.itemMasterTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!item) throw new Error('Item not found.');

	// Validate conversions belong to hospital
	if (uniqueIds.length > 0) {
		const allowed = await ensureDb()
			.select({ id: table.itemUnitMasterTable.id })
			.from(table.itemUnitMasterTable)
			.where(
				and(
					eq(table.itemUnitMasterTable.hospitalId, hospitalId),
					inArray(table.itemUnitMasterTable.id, uniqueIds),
					ne(table.itemUnitMasterTable.statusId, StatusEnum.DELETED)
				)
			);
		const allowedIds = new Set(allowed.map((r) => r.id));
		for (const id of uniqueIds) {
			if (!allowedIds.has(id)) {
				throw new Error('Invalid unit conversion selection.');
			}
		}
	}

	// Replace links
	await ensureDb()
		.delete(table.itemMasterItemUnitMasterTable)
		.where(
			and(
				eq(
					table.itemMasterItemUnitMasterTable.hospitalId,
					hospitalId
				),
				eq(
					table.itemMasterItemUnitMasterTable.itemMasterId,
					input.itemMasterId
				)
			)
		);

	if (uniqueIds.length === 0) return;

	await ensureDb()
		.insert(table.itemMasterItemUnitMasterTable)
		.values(
			uniqueIds.map((id) => ({
				hospitalId,
				itemMasterId: input.itemMasterId,
				itemUnitMasterId: id,
				isDefaultYesNo:
					defaultIumId != null && id === defaultIumId
						? YesNoEnum.YES
						: YesNoEnum.NO
			}))
		);
}

export async function createItemMaster(
	hospitalId: string,
	payload: Omit<
		ItemMasterSchemaInsert,
		'hospitalId' | 'pharmacyGenericId'
	> & {
		pharmacyGenericId?: number | null;
	}
): Promise<ItemMasterSchema> {
	assertItemMasterCategory(payload.categoryId);

	const categoryId = payload.categoryId;
	const pharmacyGenericId = await resolvePharmacyGenericIdForWrite({
		hospitalId,
		categoryId,
		pharmacyGenericId: payload.pharmacyGenericId
	});

	const { pharmacyGenericId: _p, ...restPayload } = payload;
	const manufacturerName = trimEmptyToNull(restPayload.manufacturerName);
	const itemMarkupPercent = parseItemMarkupPercent(
		restPayload.itemMarkupPercent
	);

	const [row] = await ensureDb()
		.insert(table.itemMasterTable)
		.values({
			...restPayload,
			hospitalId,
			pharmacyGenericId,
			manufacturerName,
			itemMarkupPercent
		})
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updateItemMaster(
	hospitalId: string,
	payload: ItemMasterSchemaUpdate & { id: number }
): Promise<ItemMasterSchema> {
	const { id, ...rest } = payload;

	const [existingRow] = await ensureDb()
		.select()
		.from(table.itemMasterTable)
		.where(
			and(
				hospitalItemScope(hospitalId),
				eq(table.itemMasterTable.id, id),
				ne(table.itemMasterTable.statusId, StatusEnum.DELETED)
			)
		);
	if (!existingRow) throw new Error('Item not found.');

	if (rest.categoryId != null) {
		assertItemMasterCategory(rest.categoryId);
	}

	const nextCategoryId = rest.categoryId ?? existingRow.categoryId;
	let nextPharmacyGenericId = existingRow.pharmacyGenericId;
	if (
		rest.categoryId !== undefined &&
		rest.categoryId !== CategoryEnum.PHARMACY_SUPPLY
	) {
		nextPharmacyGenericId = null;
	} else if (rest.pharmacyGenericId !== undefined) {
		nextPharmacyGenericId = rest.pharmacyGenericId;
	}

	const finalPharmacyGenericId =
		await resolvePharmacyGenericIdForWrite({
			hospitalId,
			categoryId: nextCategoryId,
			pharmacyGenericId: nextPharmacyGenericId
		});

	const setPayload: ItemMasterSchemaUpdate = { ...rest };
	if (rest.manufacturerName !== undefined) {
		setPayload.manufacturerName = trimEmptyToNull(rest.manufacturerName);
	}
	if (rest.itemMarkupPercent !== undefined) {
		setPayload.itemMarkupPercent = parseItemMarkupPercent(
			rest.itemMarkupPercent
		);
	}
	setPayload.pharmacyGenericId = finalPharmacyGenericId;

	const [row] = await ensureDb()
		.update(table.itemMasterTable)
		.set(setPayload)
		.where(
			and(
				hospitalItemScope(hospitalId),
				eq(table.itemMasterTable.id, id)
			)
		)
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function deleteItemMaster(input: {
	hospitalId: string;
	id: number;
}): Promise<void> {
	await ensureDb()
		.update(table.itemMasterTable)
		.set({ statusId: StatusEnum.INACTIVE })
		.where(
			and(
				hospitalItemScope(input.hospitalId),
				eq(table.itemMasterTable.id, input.id)
			)
		);
}
