import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	ServiceTaggingSchema,
	ServiceTaggingSchemaInsert,
	ServiceTaggingSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, inArray, ne } from 'drizzle-orm';

// get all (optionally filtered by branchId/serviceId and column filters)
export const getServiceTagging = query(
	'unchecked' as const,
	async (params?: {
		branchId?: string | null;
		serviceId?: number | null;
		serviceIds?: number[] | null;
		serviceAmount?: number | null;
		serviceTaxAmount?: number | null;
		statusId?: number | null;
		id?: number | null;
	}): Promise<ServiceTaggingSchema[]> => {
		const notDeleted = ne(
			table.serviceTaggingTable.statusId,
			StatusEnum.DELETED
		);
		let whereExpr = notDeleted;

		if (params?.branchId != null && params.branchId !== '') {
			whereExpr = and(
				whereExpr,
				eq(table.serviceTaggingTable.branchId, params.branchId)
			) as typeof whereExpr;
		}
		if (params?.serviceId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceTaggingTable.serviceId, params.serviceId)
			) as typeof whereExpr;
		}

		if (params?.serviceIds && params.serviceIds.length > 0) {
			whereExpr = and(
				whereExpr,
				inArray(
					table.serviceTaggingTable.serviceId,
					params.serviceIds
				)
			) as typeof whereExpr;
		}

		if (params?.id != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceTaggingTable.id, params.id)
			) as typeof whereExpr;
		}

		if (params?.serviceAmount != null) {
			whereExpr = and(
				whereExpr,
				eq(
					table.serviceTaggingTable.serviceAmount,
					String(params.serviceAmount)
				)
			) as typeof whereExpr;
		}

		if (params?.serviceTaxAmount != null) {
			whereExpr = and(
				whereExpr,
				eq(
					table.serviceTaggingTable.serviceTaxAmount,
					String(params.serviceTaxAmount)
				)
			) as typeof whereExpr;
		}

		if (params?.statusId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceTaggingTable.statusId, params.statusId)
			) as typeof whereExpr;
		}

		return ensureDb()
			.select()
			.from(table.serviceTaggingTable)
			.where(whereExpr);
	}
);

// get count
export const getServiceTaggingCount = query(
	async (): Promise<number> => {
		const [row] = await ensureDb()
			.select({ count: count() })
			.from(table.serviceTaggingTable)
			.where(
				ne(table.serviceTaggingTable.statusId, StatusEnum.DELETED)
			);
		return row?.count ?? 0;
	}
);

// get paginated (supports same filters as getServiceTagging)
export const getServiceTaggingPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams & {
			branchId?: string | null;
			serviceId?: number | null;
			serviceIds?: number[] | null;
			serviceAmount?: number | null;
			serviceTaxAmount?: number | null;
			statusId?: number | null;
			id?: number | null;
		}
	): Promise<PaginatedResult<ServiceTaggingSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeleted = ne(
			table.serviceTaggingTable.statusId,
			StatusEnum.DELETED
		);
		let whereExpr = notDeleted;

		if (params?.branchId != null && params.branchId !== '') {
			whereExpr = and(
				whereExpr,
				eq(table.serviceTaggingTable.branchId, params.branchId)
			) as typeof whereExpr;
		}
		if (params?.serviceId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceTaggingTable.serviceId, params.serviceId)
			) as typeof whereExpr;
		}

		if (params?.serviceIds && params.serviceIds.length > 0) {
			whereExpr = and(
				whereExpr,
				inArray(
					table.serviceTaggingTable.serviceId,
					params.serviceIds
				)
			) as typeof whereExpr;
		}

		if (params?.id != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceTaggingTable.id, params.id)
			) as typeof whereExpr;
		}

		if (params?.serviceAmount != null) {
			whereExpr = and(
				whereExpr,
				eq(
					table.serviceTaggingTable.serviceAmount,
					String(params.serviceAmount)
				)
			) as typeof whereExpr;
		}

		if (params?.serviceTaxAmount != null) {
			whereExpr = and(
				whereExpr,
				eq(
					table.serviceTaggingTable.serviceTaxAmount,
					String(params.serviceTaxAmount)
				)
			) as typeof whereExpr;
		}

		if (params?.statusId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceTaggingTable.statusId, params.statusId)
			) as typeof whereExpr;
		}

		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.serviceTaggingTable)
				.where(whereExpr)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.serviceTaggingTable)
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
export const getServiceTaggingById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<ServiceTaggingSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.serviceTaggingTable)
			.where(
				and(
					eq(table.serviceTaggingTable.id, id),
					ne(table.serviceTaggingTable.statusId, StatusEnum.DELETED)
				)
			);
		return row ?? null;
	}
);

// create
export const createServiceTagging = command(
	'unchecked' as const,
	async (
		payload: ServiceTaggingSchemaInsert
	): Promise<ServiceTaggingSchema> => {
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
	async (
		payload: ServiceTaggingSchemaUpdate & { id: number }
	): Promise<ServiceTaggingSchema> => {
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
		await ensureDb()
			.delete(table.serviceTaggingTable)
			.where(eq(table.serviceTaggingTable.id, id));
		getServiceTagging(undefined).refresh();
		getServiceTaggingCount().refresh();
		getServiceTaggingPaginated(undefined).refresh();
	}
);
