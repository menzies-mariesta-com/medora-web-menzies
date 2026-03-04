import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	SubCategorySchema,
	SubCategorySchemaInsert,
	SubCategorySchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ne } from 'drizzle-orm';

// get all (optionally filtered by categoryId)
export const getSubCategory = query(
	'unchecked' as const,
	async (params?: {
		categoryId?: number | null;
	}): Promise<SubCategorySchema[]> => {
		const notDeleted = ne(
			table.subCategoryTable.statusId,
			StatusEnum.DELETED
		);
		let whereExpr = notDeleted;

		if (params?.categoryId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.subCategoryTable.categoryId, params.categoryId)
			);
		}

		return ensureDb()
			.select()
			.from(table.subCategoryTable)
			.where(whereExpr)
			.orderBy(table.subCategoryTable.subCategoryName);
	}
);

// get count
export const getSubCategoryCount = query(
	async (): Promise<number> => {
		const [row] = await ensureDb()
			.select({ count: count() })
			.from(table.subCategoryTable);
		return row?.count ?? 0;
	}
);

// get paginated
export const getSubCategoryPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams & { categoryId?: number | null }
	): Promise<PaginatedResult<SubCategorySchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeleted = ne(
			table.subCategoryTable.statusId,
			StatusEnum.DELETED
		);
		let whereExpr = notDeleted;

		if (params?.categoryId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.subCategoryTable.categoryId, params.categoryId)
			);
		}

		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.subCategoryTable)
				.where(whereExpr)
				.orderBy(table.subCategoryTable.subCategoryName)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.subCategoryTable)
				.where(whereExpr)
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

// get one
export const getSubCategoryById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<SubCategorySchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.subCategoryTable)
			.where(eq(table.subCategoryTable.id, id));
		return row ?? null;
	}
);

// create
export const createSubCategory = command(
	'unchecked' as const,
	async (
		payload: SubCategorySchemaInsert
	): Promise<SubCategorySchema> => {
		const [row] = await ensureDb()
			.insert(table.subCategoryTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getSubCategory(undefined).refresh();
		getSubCategoryCount().refresh();
		getSubCategoryPaginated(undefined).refresh();
		return row;
	}
);

// update
export const updateSubCategory = command(
	'unchecked' as const,
	async (
		payload: SubCategorySchemaUpdate & { id: number }
	): Promise<SubCategorySchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.subCategoryTable)
			.set(rest as SubCategorySchemaUpdate)
			.where(eq(table.subCategoryTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getSubCategory(undefined).refresh();
		getSubCategoryCount().refresh();
		getSubCategoryPaginated(undefined).refresh();
		return row;
	}
);

// delete (soft)
export const deleteSubCategory = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.subCategoryTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.subCategoryTable.id, id));
		getSubCategory(undefined).refresh();
		getSubCategoryCount().refresh();
		getSubCategoryPaginated(undefined).refresh();
	}
);

// delete complete (hard)
export const deleteSubCategoryComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.subCategoryTable)
			.where(eq(table.subCategoryTable.id, id));
		getSubCategory(undefined).refresh();
		getSubCategoryCount().refresh();
		getSubCategoryPaginated(undefined).refresh();
	}
);
