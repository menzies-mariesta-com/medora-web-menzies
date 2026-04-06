import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	ServiceOrderSchema,
	ServiceOrderSchemaInsert,
	ServiceOrderSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { getServiceOrderDetailRowsForVisit } from '$lib/remote/table/information-table/service-order-detail.remote';
import { and, count, eq, ne } from 'drizzle-orm';
import { assertVisitNotClinicallySigned } from '$lib/server/visit-clinical-lock.server';

// get all (optionally filtered by branchId/visitId/status/id)
export const getServiceOrder = query(
	'unchecked' as const,
	async (params?: {
		branchId?: string | null;
		visitId?: number | null;
		statusId?: number | null;
		id?: number | null;
	}): Promise<ServiceOrderSchema[]> => {
		const notDeleted = ne(
			table.serviceOrderTable.statusId,
			StatusEnum.DELETED
		);
		let whereExpr = notDeleted;

		if (params?.branchId != null && params.branchId !== '') {
			whereExpr = and(
				whereExpr,
				eq(table.serviceOrderTable.branchId, params.branchId)
			) as typeof whereExpr;
		}

		if (params?.visitId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceOrderTable.visitId, params.visitId)
			) as typeof whereExpr;
		}

		if (params?.id != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceOrderTable.id, params.id)
			) as typeof whereExpr;
		}

		if (params?.statusId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceOrderTable.statusId, params.statusId)
			) as typeof whereExpr;
		}

		return ensureDb()
			.select()
			.from(table.serviceOrderTable)
			.where(whereExpr)
			.orderBy(table.serviceOrderTable.orderDate);
	}
);

// get count
export const getServiceOrderCount = query(
	async (): Promise<number> => {
		const [row] = await ensureDb()
			.select({ count: count() })
			.from(table.serviceOrderTable)
			.where(
				ne(table.serviceOrderTable.statusId, StatusEnum.DELETED)
			);
		return row?.count ?? 0;
	}
);

// get paginated (supports same filters as getServiceOrder)
export const getServiceOrderPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams & {
			branchId?: string | null;
			visitId?: number | null;
			statusId?: number | null;
			id?: number | null;
		}
	): Promise<PaginatedResult<ServiceOrderSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeleted = ne(
			table.serviceOrderTable.statusId,
			StatusEnum.DELETED
		);
		let whereExpr = notDeleted;

		if (params?.branchId != null && params.branchId !== '') {
			whereExpr = and(
				whereExpr,
				eq(table.serviceOrderTable.branchId, params.branchId)
			) as typeof whereExpr;
		}

		if (params?.visitId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceOrderTable.visitId, params.visitId)
			) as typeof whereExpr;
		}

		if (params?.id != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceOrderTable.id, params.id)
			) as typeof whereExpr;
		}

		if (params?.statusId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceOrderTable.statusId, params.statusId)
			) as typeof whereExpr;
		}

		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.serviceOrderTable)
				.where(whereExpr)
				.orderBy(table.serviceOrderTable.orderDate)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.serviceOrderTable)
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
export const getServiceOrderById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<ServiceOrderSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.serviceOrderTable)
			.where(
				and(
					eq(table.serviceOrderTable.id, id),
					ne(table.serviceOrderTable.statusId, StatusEnum.DELETED)
				)
			);
		return row ?? null;
	}
);

// create
export const createServiceOrder = command(
	'unchecked' as const,
	async (
		payload: ServiceOrderSchemaInsert
	): Promise<ServiceOrderSchema> => {
		await assertVisitNotClinicallySigned(payload.visitId);
		const [row] = await ensureDb()
			.insert(table.serviceOrderTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getServiceOrder(undefined).refresh();
		getServiceOrderCount().refresh();
		getServiceOrderPaginated(undefined).refresh();
		getServiceOrderDetailRowsForVisit({
			visitId: row.visitId
		}).refresh();
		return row;
	}
);

// update
export const updateServiceOrder = command(
	'unchecked' as const,
	async (
		payload: ServiceOrderSchemaUpdate & { id: number }
	): Promise<ServiceOrderSchema> => {
		const { id, ...rest } = payload;
		const [existingOrd] = await ensureDb()
			.select({ visitId: table.serviceOrderTable.visitId })
			.from(table.serviceOrderTable)
			.where(eq(table.serviceOrderTable.id, id))
			.limit(1);
		if (!existingOrd) throw new Error('Service order not found');
		await assertVisitNotClinicallySigned(existingOrd.visitId);
		const [row] = await ensureDb()
			.update(table.serviceOrderTable)
			.set(rest as ServiceOrderSchemaUpdate)
			.where(eq(table.serviceOrderTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getServiceOrder(undefined).refresh();
		getServiceOrderCount().refresh();
		getServiceOrderPaginated(undefined).refresh();
		return row;
	}
);

// delete (soft)
export const deleteServiceOrder = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		const [existingOrd] = await ensureDb()
			.select({ visitId: table.serviceOrderTable.visitId })
			.from(table.serviceOrderTable)
			.where(eq(table.serviceOrderTable.id, id))
			.limit(1);
		if (existingOrd)
			await assertVisitNotClinicallySigned(existingOrd.visitId);
		await ensureDb()
			.update(table.serviceOrderTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.serviceOrderTable.id, id));
		getServiceOrder(undefined).refresh();
		getServiceOrderCount().refresh();
		getServiceOrderPaginated(undefined).refresh();
	}
);

// delete complete (hard)
export const deleteServiceOrderComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		const [existingOrd] = await ensureDb()
			.select({ visitId: table.serviceOrderTable.visitId })
			.from(table.serviceOrderTable)
			.where(eq(table.serviceOrderTable.id, id))
			.limit(1);
		if (existingOrd)
			await assertVisitNotClinicallySigned(existingOrd.visitId);
		await ensureDb()
			.delete(table.serviceOrderTable)
			.where(eq(table.serviceOrderTable.id, id));
		getServiceOrder(undefined).refresh();
		getServiceOrderCount().refresh();
		getServiceOrderPaginated(undefined).refresh();
	}
);
