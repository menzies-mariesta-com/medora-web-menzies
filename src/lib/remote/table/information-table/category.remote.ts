import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	CategorySchema,
	CategorySchemaInsert,
	CategorySchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ilike, ne } from 'drizzle-orm';

// get all (status not deleted)
export const getCategory = query(
	'unchecked' as const,
	async (): Promise<CategorySchema[]> => {
		const notDeleted = ne(
			table.categoryTable.statusId,
			StatusEnum.DELETED
		);
		return ensureDb()
			.select()
			.from(table.categoryTable)
			.where(notDeleted)
			.orderBy(table.categoryTable.categoryName);
	}
);

// get count
export const getCategoryCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.categoryTable)
		.where(ne(table.categoryTable.statusId, StatusEnum.DELETED));
	return row?.count ?? 0;
});

// get paginated
export const getCategoryPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams & {
			id?: number | null;
			categoryName?: string | null;
			statusId?: number | null;
		}
	): Promise<PaginatedResult<CategorySchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeleted = ne(
			table.categoryTable.statusId,
			StatusEnum.DELETED
		);
		let whereExpr = notDeleted;

		if (params?.id != null) {
			whereExpr = and(
				whereExpr,
				eq(table.categoryTable.id, params.id)
			) as typeof whereExpr;
		}

		const categoryNameTerm = params?.categoryName?.trim();
		if (categoryNameTerm) {
			whereExpr = and(
				whereExpr,
				ilike(
					table.categoryTable.categoryName,
					`%${categoryNameTerm}%`
				)
			) as typeof whereExpr;
		}

		if (params?.statusId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.categoryTable.statusId, params.statusId)
			) as typeof whereExpr;
		}

		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.categoryTable)
				.where(whereExpr)
				.orderBy(table.categoryTable.categoryName)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.categoryTable)
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
export const getCategoryById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<CategorySchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.categoryTable)
			.where(
				and(
					eq(table.categoryTable.id, id),
					ne(table.categoryTable.statusId, StatusEnum.DELETED)
				)
			);
		return row ?? null;
	}
);

// create
export const createCategory = command(
	'unchecked' as const,
	async (payload: CategorySchemaInsert): Promise<CategorySchema> => {
		const [row] = await ensureDb()
			.insert(table.categoryTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getCategory(undefined).refresh();
		getCategoryCount().refresh();
		getCategoryPaginated(undefined).refresh();
		return row;
	}
);

// update
export const updateCategory = command(
	'unchecked' as const,
	async (
		payload: CategorySchemaUpdate & { id: number }
	): Promise<CategorySchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.categoryTable)
			.set(rest as CategorySchemaUpdate)
			.where(eq(table.categoryTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getCategory(undefined).refresh();
		getCategoryCount().refresh();
		getCategoryPaginated(undefined).refresh();
		return row;
	}
);

// delete (soft)
export const deleteCategory = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.categoryTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.categoryTable.id, id));
		getCategory(undefined).refresh();
		getCategoryCount().refresh();
		getCategoryPaginated(undefined).refresh();
	}
);

// delete complete (hard)
export const deleteCategoryComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.categoryTable)
			.where(eq(table.categoryTable.id, id));
		getCategory(undefined).refresh();
		getCategoryCount().refresh();
		getCategoryPaginated(undefined).refresh();
	}
);
