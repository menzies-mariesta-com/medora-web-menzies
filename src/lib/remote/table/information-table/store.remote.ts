import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	StoreSchema,
	StoreSchemaInsert,
	StoreSchemaUpdate
} from '$lib/server/db/schema-type';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ne } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';

// get all (optionally filtered by branchId)
export const getStore = query(
	'unchecked' as const,
	async (params?: {
		branchId?: string | null;
	}): Promise<StoreSchema[]> => {
		const notDeleted = ne(
			table.storeTable.statusId,
			StatusEnum.DELETED
		);
		let whereExpr = notDeleted;

		if (params?.branchId != null && params.branchId !== '') {
			whereExpr = and(
				whereExpr,
				eq(table.storeTable.branchId, params.branchId)
			);
		}

		return ensureDb()
			.select()
			.from(table.storeTable)
			.where(whereExpr)
			.orderBy(table.storeTable.storeName);
	}
);

// get count
export const getStoreCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.storeTable);
	return row?.count ?? 0;
});

// get paginated
export const getStorePaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams & { branchId?: string | null }
	): Promise<PaginatedResult<StoreSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeleted = ne(
			table.storeTable.statusId,
			StatusEnum.DELETED
		);
		let whereExpr = notDeleted;

		if (params?.branchId != null && params.branchId !== '') {
			whereExpr = and(
				whereExpr,
				eq(table.storeTable.branchId, params.branchId)
			);
		}

		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.storeTable)
				.where(whereExpr)
				.orderBy(table.storeTable.storeName)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.storeTable)
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
export const getStoreById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<StoreSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.storeTable)
			.where(eq(table.storeTable.id, id));
		return row ?? null;
	}
);

// create
export const createStore = command(
	'unchecked' as const,
	async (payload: StoreSchemaInsert): Promise<StoreSchema> => {
		const [row] = await ensureDb()
			.insert(table.storeTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getStore(undefined).refresh();
		getStoreCount().refresh();
		getStorePaginated(undefined).refresh();
		return row;
	}
);

// update
export const updateStore = command(
	'unchecked' as const,
	async (
		payload: StoreSchemaUpdate & { id: number }
	): Promise<StoreSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.storeTable)
			.set(rest as StoreSchemaUpdate)
			.where(eq(table.storeTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getStore(undefined).refresh();
		getStoreCount().refresh();
		getStorePaginated(undefined).refresh();
		return row;
	}
);

// delete (soft)
export const deleteStore = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.storeTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.storeTable.id, id));
		getStore(undefined).refresh();
		getStoreCount().refresh();
		getStorePaginated(undefined).refresh();
	}
);

// delete complete (hard)
export const deleteStoreComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.storeTable)
			.where(eq(table.storeTable.id, id));
		getStore(undefined).refresh();
		getStoreCount().refresh();
		getStorePaginated(undefined).refresh();
	}
);
