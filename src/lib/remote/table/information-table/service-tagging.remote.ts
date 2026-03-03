import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	ServiceTaggingSchema,
	ServiceTaggingSchemaInsert,
	ServiceTaggingSchemaUpdate,
} from '$lib/server/db/schema-type';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getServiceTagging = query(async (): Promise<ServiceTaggingSchema[]> => {
	const data = await ensureDb().select().from(table.serviceTaggingTable);
	return data;
});

// get count
export const getServiceTaggingCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.serviceTaggingTable);
	return row?.count ?? 0;
});

// get paginated
export const getServiceTaggingPaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<ServiceTaggingSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb().select().from(table.serviceTaggingTable).limit(limit).offset(offset),
			ensureDb().select({ count: count() }).from(table.serviceTaggingTable),
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
export const getServiceTaggingById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<ServiceTaggingSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.serviceTaggingTable)
			.where(eq(table.serviceTaggingTable.id, id));
		return row ?? null;
	}
);

// create
export const createServiceTagging = command(
	'unchecked' as const,
	async (payload: ServiceTaggingSchemaInsert): Promise<ServiceTaggingSchema> => {
		const [row] = await ensureDb()
			.insert(table.serviceTaggingTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getServiceTagging().refresh();
		return row;
	}
);

// update
export const updateServiceTagging = command(
	'unchecked' as const,
	async (
		payload: { id: number } & ServiceTaggingSchemaUpdate,
	): Promise<ServiceTaggingSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.serviceTaggingTable)
			.set(rest as ServiceTaggingSchemaUpdate)
			.where(eq(table.serviceTaggingTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getServiceTagging().refresh();
		return row;
	}
);

// delete (hard)
export const deleteServiceTagging = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.serviceTaggingTable)
			.where(eq(table.serviceTaggingTable.id, id));
		getServiceTagging().refresh();
	}
);

// delete complete (hard, alias)
export const deleteServiceTaggingComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.serviceTaggingTable)
			.where(eq(table.serviceTaggingTable.id, id));
		getServiceTagging().refresh();
	}
);

import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	ServiceTaggingSchema,
	ServiceTaggingSchemaInsert,
	ServiceTaggingSchemaUpdate,
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ne } from 'drizzle-orm';

// get all (optionally filtered by branchId/serviceId)
export const getServiceTagging = query(
	'unchecked' as const,
	async (params?: { branchId?: string | null; serviceId?: number | null }): Promise<
		ServiceTaggingSchema[]
	> => {
		const notDeleted = ne(table.serviceTaggingTable.statusId, StatusEnum.DELETED);
		let whereExpr = notDeleted;

		if (params?.branchId != null && params.branchId !== '') {
			whereExpr = and(whereExpr, eq(table.serviceTaggingTable.branchId, params.branchId));
		}
		if (params?.serviceId != null) {
			whereExpr = and(whereExpr, eq(table.serviceTaggingTable.serviceItemId, params.serviceId));
		}

		return ensureDb()
			.select()
			.from(table.serviceTaggingTable)
			.where(whereExpr);
	}
);

// get count
export const getServiceTaggingCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.serviceTaggingTable);
	return row?.count ?? 0;
});

// get paginated
export const getServiceTaggingPaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams & { branchId?: string | null; serviceId?: number | null }): Promise<
		PaginatedResult<ServiceTaggingSchema>
	> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const notDeleted = ne(table.serviceTaggingTable.statusId, StatusEnum.DELETED);
		let whereExpr = notDeleted;

		if (params?.branchId != null && params.branchId !== '') {
			whereExpr = and(whereExpr, eq(table.serviceTaggingTable.branchId, params.branchId));
		}
		if (params?.serviceId != null) {
			whereExpr = and(whereExpr, eq(table.serviceTaggingTable.serviceItemId, params.serviceId));
		}

		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.serviceTaggingTable)
				.where(whereExpr)
				.limit(limit)
				.offset(offset),
			ensureDb().select({ count: count() }).from(table.serviceTaggingTable).where(whereExpr),
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
export const getServiceTaggingById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<ServiceTaggingSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.serviceTaggingTable)
			.where(eq(table.serviceTaggingTable.id, id));
		return row ?? null;
	}
);

// create
export const createServiceTagging = command(
	'unchecked' as const,
	async (payload: ServiceTaggingSchemaInsert): Promise<ServiceTaggingSchema> => {
		const [row] = await ensureDb()
			.insert(table.serviceTaggingTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getServiceTagging(undefined).refresh();
		getServiceTaggingCount().refresh();
		getServiceTaggingPaginated(undefined).refresh();
		return row;
	}
);

// update
export const updateServiceTagging = command(
	'unchecked' as const,
	async (payload: ServiceTaggingSchemaUpdate & { id: number }): Promise<ServiceTaggingSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.serviceTaggingTable)
			.set(rest as ServiceTaggingSchemaUpdate)
			.where(eq(table.serviceTaggingTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getServiceTagging(undefined).refresh();
		getServiceTaggingCount().refresh();
		getServiceTaggingPaginated(undefined).refresh();
		return row;
	}
);

// delete (soft)
export const deleteServiceTagging = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.serviceTaggingTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.serviceTaggingTable.id, id));
		getServiceTagging(undefined).refresh();
		getServiceTaggingCount().refresh();
		getServiceTaggingPaginated(undefined).refresh();
	}
);

// delete complete (hard)
export const deleteServiceTaggingComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.serviceTaggingTable).where(eq(table.serviceTaggingTable.id, id));
		getServiceTagging(undefined).refresh();
		getServiceTaggingCount().refresh();
		getServiceTaggingPaginated(undefined).refresh();
	}
);

