import { query, command } from '$app/server';
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
	ITEM_MASTER_CATEGORY_IDS,
	isItemMasterCategoryId
} from '$lib/model/enum/item-master-category.enum';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, asc, count, eq, ilike, inArray, ne } from 'drizzle-orm';

function assertItemMasterCategory(categoryId: number): void {
	if (!isItemMasterCategoryId(categoryId)) {
		throw new Error(
			'Item category must be General Supply, Pharmacy Supply, or Medical Supply.'
		);
	}
}

function normalizeBarcode(
	value: string | null | undefined
): string | null {
	const t = value?.trim();
	return t ? t : null;
}

async function assertBarcodeAvailable(
	barcode: string | null,
	excludeItemId?: number
): Promise<void> {
	if (!barcode) return;
	const [existing] = await ensureDb()
		.select({ id: table.itemMasterTable.id })
		.from(table.itemMasterTable)
		.where(
			and(
				eq(table.itemMasterTable.barcode, barcode),
				ne(table.itemMasterTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (existing && existing.id !== excludeItemId) {
		throw new Error(
			'This barcode is already assigned to another item.'
		);
	}
}

/** The three category master rows used by Item Master (ids 11–13). */
export const getItemMasterCategories = query(
	'unchecked' as const,
	async () => {
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
);

/** Active unit types (filter for unit dropdown). */
export const getUnitTypesForItemMaster = query(
	async (): Promise<UnitTypeSchema[]> => {
		return ensureDb()
			.select()
			.from(table.unitTypeTable)
			.where(ne(table.unitTypeTable.statusId, StatusEnum.DELETED))
			.orderBy(asc(table.unitTypeTable.name));
	}
);

/**
 * Active units, optionally filtered by `unitTypeId` (from Unit Type master).
 * When `unitTypeId` is omitted, returns all active units (legacy behaviour).
 */
export const getUnitsForItemMaster = query(
	'unchecked' as const,
	async (params?: {
		unitTypeId?: number | null;
	}): Promise<UnitSchema[]> => {
		const notDeleted = ne(
			table.unitTable.statusId,
			StatusEnum.DELETED
		);
		const typeId = params?.unitTypeId;
		const whereExpr =
			typeId != null && Number.isFinite(typeId)
				? and(
						notDeleted,
						eq(table.unitTable.unitTypeId, typeId)
					)
				: notDeleted;
		return ensureDb()
			.select()
			.from(table.unitTable)
			.where(whereExpr)
			.orderBy(asc(table.unitTable.name));
	}
);

export const getUnitById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<UnitSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.unitTable)
			.where(eq(table.unitTable.id, id));
		return row ?? null;
	}
);

export const getItemMaster = query(
	async (): Promise<ItemMasterSchema[]> => {
		return ensureDb()
			.select()
			.from(table.itemMasterTable)
			.where(ne(table.itemMasterTable.statusId, StatusEnum.DELETED))
			.orderBy(asc(table.itemMasterTable.itemName));
	}
);

export const getItemMasterPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<ItemMasterSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const conditions = [
			ne(table.itemMasterTable.statusId, StatusEnum.DELETED)
		];
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
		const barcodeFilter = params?.barcode?.trim();
		if (barcodeFilter) {
			conditions.push(
				ilike(
					table.itemMasterTable.barcode,
					`%${barcodeFilter}%`
				)
			);
		}
		if (typeof params?.categoryId === 'number') {
			conditions.push(
				eq(table.itemMasterTable.categoryId, params.categoryId)
			);
		}
		if (typeof params?.statusId === 'number') {
			conditions.push(
				eq(table.itemMasterTable.statusId, params.statusId)
			);
		}
		const whereClause = and(...conditions);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.itemMasterTable)
				.where(whereClause)
				.orderBy(asc(table.itemMasterTable.itemName))
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.itemMasterTable)
				.where(whereClause)
		]);
		const total = countResult[0]?.count ?? 0;
		return {
			data,
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize) || 1
		};
	}
);

export const getItemMasterById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<ItemMasterSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.itemMasterTable)
			.where(
				and(
					eq(table.itemMasterTable.id, id),
					ne(table.itemMasterTable.statusId, StatusEnum.DELETED)
				)
			);
		return row ?? null;
	}
);

/** Lookup by exact barcode (for scanners / POS). */
export const getItemMasterByBarcode = query(
	'unchecked' as const,
	async ({
		barcode
	}: {
		barcode: string;
	}): Promise<ItemMasterSchema | null> => {
		const b = normalizeBarcode(barcode);
		if (!b) return null;
		const [row] = await ensureDb()
			.select()
			.from(table.itemMasterTable)
			.where(
				and(
					eq(table.itemMasterTable.barcode, b),
					ne(table.itemMasterTable.statusId, StatusEnum.DELETED)
				)
			);
		return row ?? null;
	}
);

export const createItemMaster = command(
	'unchecked' as const,
	async (
		payload: ItemMasterSchemaInsert
	): Promise<ItemMasterSchema> => {
		assertItemMasterCategory(payload.categoryId);
		const barcode = normalizeBarcode(payload.barcode);
		await assertBarcodeAvailable(barcode);
		const [row] = await ensureDb()
			.insert(table.itemMasterTable)
			.values({ ...payload, barcode })
			.returning();
		if (!row) throw new Error('Insert failed');
		getItemMaster().refresh();
		getItemMasterPaginated(undefined).refresh();
		return row;
	}
);

export const updateItemMaster = command(
	'unchecked' as const,
	async (
		payload: ItemMasterSchemaUpdate & { id: number }
	): Promise<ItemMasterSchema> => {
		const { id, ...rest } = payload;
		if (rest.categoryId != null) {
			assertItemMasterCategory(rest.categoryId);
		}
		let setPayload = { ...rest } as ItemMasterSchemaUpdate;
		if (rest.barcode !== undefined) {
			const barcode = normalizeBarcode(rest.barcode);
			await assertBarcodeAvailable(barcode, id);
			setPayload = { ...setPayload, barcode };
		}
		const [row] = await ensureDb()
			.update(table.itemMasterTable)
			.set(setPayload)
			.where(eq(table.itemMasterTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getItemMaster().refresh();
		getItemMasterPaginated(undefined).refresh();
		return row;
	}
);

export const deleteItemMaster = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.itemMasterTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.itemMasterTable.id, id));
		getItemMaster().refresh();
		getItemMasterPaginated(undefined).refresh();
	}
);
