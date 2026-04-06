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
import { and, count, eq, ilike, inArray, ne } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';

function assertStoreOwnerXor(payload: {
	userGroupId?: number | null;
	departmentId?: number | null;
}): void {
	const ug = payload.userGroupId ?? null;
	const dep = payload.departmentId ?? null;
	const hasUg = ug != null;
	const hasDep = dep != null;
	if (hasUg === hasDep) {
		throw new Error(
			'Store must be linked to exactly one of user group or department.'
		);
	}
}

async function branchIdsForHospital(
	hospitalId: string
): Promise<string[]> {
	const rows = await ensureDb()
		.select({ id: table.hospitalBranchTable.id })
		.from(table.hospitalBranchTable)
		.where(eq(table.hospitalBranchTable.hospitalId, hospitalId));
	return rows.map((r) => r.id);
}

// get all (optionally filtered by branchId and/or hospitalId)
export const getStore = query(
	'unchecked' as const,
	async (params?: {
		branchId?: string | null;
		hospitalId?: string | null;
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
			) as typeof whereExpr;
		} else if (params?.hospitalId != null && params.hospitalId !== '') {
			const ids = await branchIdsForHospital(params.hospitalId);
			if (ids.length === 0) {
				return [];
			}
			whereExpr = and(
				whereExpr,
				inArray(table.storeTable.branchId, ids)
			) as typeof whereExpr;
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
		.from(table.storeTable)
		.where(ne(table.storeTable.statusId, StatusEnum.DELETED));
	return row?.count ?? 0;
});

// get paginated (optional hospitalId scopes to that hospital's branches; name filter)
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
			) as typeof whereExpr;
		} else if (params?.hospitalId != null && params.hospitalId !== '') {
			const ids = await branchIdsForHospital(params.hospitalId);
			if (ids.length === 0) {
				return {
					data: [],
					total: 0,
					page,
					pageSize,
					totalPages: 1
				};
			}
			whereExpr = and(
				whereExpr,
				inArray(table.storeTable.branchId, ids)
			) as typeof whereExpr;
		}

		const nameFilter = params?.name?.trim();
		if (nameFilter) {
			whereExpr = and(
				whereExpr,
				ilike(table.storeTable.storeName, `%${nameFilter}%`)
			) as typeof whereExpr;
		}

		if (typeof params?.statusId === 'number') {
			whereExpr = and(
				whereExpr,
				eq(table.storeTable.statusId, params.statusId)
			) as typeof whereExpr;
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
			.where(
				and(
					eq(table.storeTable.id, id),
					ne(table.storeTable.statusId, StatusEnum.DELETED)
				)
			);
		return row ?? null;
	}
);

// create
export const createStore = command(
	'unchecked' as const,
	async (payload: StoreSchemaInsert): Promise<StoreSchema> => {
		assertStoreOwnerXor({
			userGroupId: payload.userGroupId,
			departmentId: payload.departmentId
		});
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
		const [existing] = await ensureDb()
			.select()
			.from(table.storeTable)
			.where(eq(table.storeTable.id, id));
		if (!existing) throw new Error('Store not found');
		const nextUg =
			rest.userGroupId !== undefined
				? rest.userGroupId
				: existing.userGroupId;
		const nextDep =
			rest.departmentId !== undefined
				? rest.departmentId
				: existing.departmentId;
		assertStoreOwnerXor({
			userGroupId: nextUg,
			departmentId: nextDep
		});
		const setObj: StoreSchemaUpdate = { ...rest };
		if (rest.userGroupId !== undefined && rest.userGroupId != null) {
			setObj.departmentId = null;
		}
		if (rest.departmentId !== undefined && rest.departmentId != null) {
			setObj.userGroupId = null;
		}
		const [row] = await ensureDb()
			.update(table.storeTable)
			.set(setObj)
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
