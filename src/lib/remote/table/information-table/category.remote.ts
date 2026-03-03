import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	CategorySchema,
	CategorySchemaInsert,
	CategorySchemaUpdate,
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ne } from 'drizzle-orm';

// get all (optionally filtered by hospitalId/branchId)
export const getCategory = query(
	'unchecked' as const,
	async (params?: { hospitalId?: string | null; branchId?: string | null }): Promise<CategorySchema[]> => {
		const notDeleted = ne(table.categoryTable.statusId, StatusEnum.DELETED);
		let whereExpr = notDeleted;

		if (params?.hospitalId != null && params.hospitalId !== '') {
			whereExpr = and(whereExpr, eq(table.categoryTable.hospitalId, params.hospitalId));
		}
		if (params?.branchId != null && params.branchId !== '') {
			whereExpr = and(whereExpr, eq(table.categoryTable.branchId, params.branchId));
		}

		return ensureDb()
			.select()
			.from(table.categoryTable)
			.where(whereExpr)
			.orderBy(table.categoryTable.categoryName);
	}
);

// get count
export const getCategoryCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.categoryTable);
	return row?.count ?? 0;
});

// get paginated
export const getCategoryPaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams & { hospitalId?: string | null; branchId?: string | null }): Promise<
		PaginatedResult<CategorySchema>
	> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const notDeleted = ne(table.categoryTable.statusId, StatusEnum.DELETED);
		let whereExpr = notDeleted;

		if (params?.hospitalId != null && params.hospitalId !== '') {
			whereExpr = and(whereExpr, eq(table.categoryTable.hospitalId, params.hospitalId));
		}
		if (params?.branchId != null && params.branchId !== '') {
			whereExpr = and(whereExpr, eq(table.categoryTable.branchId, params.branchId));
		}

		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.categoryTable)
				.where(whereExpr)
				.orderBy(table.categoryTable.categoryName)
				.limit(limit)
				.offset(offset),
			ensureDb().select({ count: count() }).from(table.categoryTable).where(whereExpr),
		]);
		const total = countResult[0]?.count ?? 0;
		return {
			data,
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize) || 1,
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
			.where(eq(table.categoryTable.id, id));
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
	async (payload: CategorySchemaUpdate & { id: number }): Promise<CategorySchema> => {
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
		await ensureDb().delete(table.categoryTable).where(eq(table.categoryTable.id, id));
		getCategory(undefined).refresh();
		getCategoryCount().refresh();
		getCategoryPaginated(undefined).refresh();
	}
);
