import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	ServiceOrderDetailSchema,
	ServiceOrderDetailSchemaInsert,
	ServiceOrderDetailSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, inArray, ne } from 'drizzle-orm';

// get all (optionally filtered by serviceOrderId/serviceId/status/id)
export const getServiceOrderDetail = query(
	'unchecked' as const,
	async (params?: {
		serviceOrderId?: number | null;
		serviceOrderIds?: number[] | null;
		serviceId?: number | null;
		statusId?: number | null;
		id?: number | null;
	}): Promise<ServiceOrderDetailSchema[]> => {
		const notDeleted = ne(
			table.serviceOrderDetailTable.statusId,
			StatusEnum.DELETED
		);
		let whereExpr = notDeleted;

		if (params?.serviceOrderId != null) {
			whereExpr = and(
				whereExpr,
				eq(
					table.serviceOrderDetailTable.serviceOrderId,
					params.serviceOrderId
				)
			);
		}

		if (
			params?.serviceOrderIds &&
			params.serviceOrderIds.length > 0
		) {
			whereExpr = and(
				whereExpr,
				inArray(
					table.serviceOrderDetailTable.serviceOrderId,
					params.serviceOrderIds
				)
			);
		}

		if (params?.serviceId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceOrderDetailTable.serviceId, params.serviceId)
			);
		}

		if (params?.id != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceOrderDetailTable.id, params.id)
			);
		}

		if (params?.statusId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceOrderDetailTable.statusId, params.statusId)
			);
		}

		return ensureDb()
			.select()
			.from(table.serviceOrderDetailTable)
			.where(whereExpr);
	}
);

// get count
export const getServiceOrderDetailCount = query(
	async (): Promise<number> => {
		const [row] = await ensureDb()
			.select({ count: count() })
			.from(table.serviceOrderDetailTable);
		return row?.count ?? 0;
	}
);

// get paginated (supports same filters as getServiceOrderDetail)
export const getServiceOrderDetailPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams & {
			serviceOrderId?: number | null;
			serviceOrderIds?: number[] | null;
			serviceId?: number | null;
			statusId?: number | null;
			id?: number | null;
		}
	): Promise<PaginatedResult<ServiceOrderDetailSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeleted = ne(
			table.serviceOrderDetailTable.statusId,
			StatusEnum.DELETED
		);
		let whereExpr = notDeleted;

		if (params?.serviceOrderId != null) {
			whereExpr = and(
				whereExpr,
				eq(
					table.serviceOrderDetailTable.serviceOrderId,
					params.serviceOrderId
				)
			);
		}

		if (
			params?.serviceOrderIds &&
			params.serviceOrderIds.length > 0
		) {
			whereExpr = and(
				whereExpr,
				inArray(
					table.serviceOrderDetailTable.serviceOrderId,
					params.serviceOrderIds
				)
			);
		}

		if (params?.serviceId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceOrderDetailTable.serviceId, params.serviceId)
			);
		}

		if (params?.id != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceOrderDetailTable.id, params.id)
			);
		}

		if (params?.statusId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceOrderDetailTable.statusId, params.statusId)
			);
		}

		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.serviceOrderDetailTable)
				.where(whereExpr)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.serviceOrderDetailTable)
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
export const getServiceOrderDetailById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<ServiceOrderDetailSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.serviceOrderDetailTable)
			.where(eq(table.serviceOrderDetailTable.id, id));
		return row ?? null;
	}
);

// create
export const createServiceOrderDetail = command(
	'unchecked' as const,
	async (
		payload: ServiceOrderDetailSchemaInsert
	): Promise<ServiceOrderDetailSchema> => {
		const [row] = await ensureDb()
			.insert(table.serviceOrderDetailTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getServiceOrderDetail(undefined).refresh();
		getServiceOrderDetailCount().refresh();
		getServiceOrderDetailPaginated(undefined).refresh();
		return row;
	}
);

// update
export const updateServiceOrderDetail = command(
	'unchecked' as const,
	async (
		payload: ServiceOrderDetailSchemaUpdate & { id: number }
	): Promise<ServiceOrderDetailSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.serviceOrderDetailTable)
			.set(rest as ServiceOrderDetailSchemaUpdate)
			.where(eq(table.serviceOrderDetailTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getServiceOrderDetail(undefined).refresh();
		getServiceOrderDetailCount().refresh();
		getServiceOrderDetailPaginated(undefined).refresh();
		return row;
	}
);

// delete (soft)
export const deleteServiceOrderDetail = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.serviceOrderDetailTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.serviceOrderDetailTable.id, id));
		getServiceOrderDetail(undefined).refresh();
		getServiceOrderDetailCount().refresh();
		getServiceOrderDetailPaginated(undefined).refresh();
	}
);

// delete complete (hard)
export const deleteServiceOrderDetailComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.serviceOrderDetailTable)
			.where(eq(table.serviceOrderDetailTable.id, id));
		getServiceOrderDetail(undefined).refresh();
		getServiceOrderDetailCount().refresh();
		getServiceOrderDetailPaginated(undefined).refresh();
	}
);
