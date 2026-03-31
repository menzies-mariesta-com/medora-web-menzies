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
import {
	and,
	asc,
	count,
	eq,
	inArray,
	isNull,
	ne
} from 'drizzle-orm';

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
			) as typeof whereExpr;
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
			) as typeof whereExpr;
		}

		if (params?.serviceId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceOrderDetailTable.serviceId, params.serviceId)
			) as typeof whereExpr;
		}

		if (params?.id != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceOrderDetailTable.id, params.id)
			) as typeof whereExpr;
		}

		if (params?.statusId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceOrderDetailTable.statusId, params.statusId)
			) as typeof whereExpr;
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
			.from(table.serviceOrderDetailTable)
			.where(
				ne(table.serviceOrderDetailTable.statusId, StatusEnum.DELETED)
			);
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
			) as typeof whereExpr;
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
			) as typeof whereExpr;
		}

		if (params?.serviceId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceOrderDetailTable.serviceId, params.serviceId)
			) as typeof whereExpr;
		}

		if (params?.id != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceOrderDetailTable.id, params.id)
			) as typeof whereExpr;
		}

		if (params?.statusId != null) {
			whereExpr = and(
				whereExpr,
				eq(table.serviceOrderDetailTable.statusId, params.statusId)
			) as typeof whereExpr;
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
			.where(
				and(
					eq(table.serviceOrderDetailTable.id, id),
					ne(
						table.serviceOrderDetailTable.statusId,
						StatusEnum.DELETED
					)
				)
			);
		return row ?? null;
	}
);

/** Flat list of order line items for a visit (all non-deleted orders + details). */
export const getServiceOrderDetailRowsForVisit = query(
	'unchecked' as const,
	async ({
		visitId
	}: {
		visitId: number;
	}): Promise<
		(ServiceOrderDetailSchema & {
			orderNo: string | null;
			serviceName: string | null;
		})[]
	> => {
		const orders = await ensureDb().query.serviceOrderTable.findMany({
			where: (t, { and, eq, ne }) =>
				and(
					eq(t.visitId, visitId),
					ne(t.statusId, StatusEnum.DELETED)
				),
			columns: { id: true, orderNo: true },
			with: {
				details: {
					where: (d, { ne }) => ne(d.statusId, StatusEnum.DELETED),
					with: {
						serviceItem: true
					}
				}
			}
		});

		// Preload sub-category names for all service items on this visit.
		const subCategoryIds = new Set<number>();
		for (const ord of orders) {
			for (const d of ord.details) {
				const sid = d.serviceItem?.subCategoryId;
				if (sid != null) subCategoryIds.add(sid);
			}
		}

		let subCategoryNameById = new Map<number, string | null>();
		if (subCategoryIds.size > 0) {
			const subCategories = await ensureDb()
				.select({
					id: table.subCategoryTable.id,
					name: table.subCategoryTable.subCategoryName
				})
				.from(table.subCategoryTable)
				.where(
					inArray(
						table.subCategoryTable.id,
						Array.from(subCategoryIds)
					)
				);
			subCategoryNameById = new Map(
				subCategories.map((row) => [row.id, row.name])
			);
		}

		const out: (ServiceOrderDetailSchema & {
			orderNo: string | null;
			serviceName: string | null;
			subCategoryId: number | null;
			subCategoryName: string | null;
		})[] = [];

		for (const ord of orders) {
			for (const d of ord.details) {
				const { serviceItem, ...detailRow } = d;
				const subCategoryId = serviceItem?.subCategoryId ?? null;
				const subCategoryName =
					subCategoryId != null
						? subCategoryNameById.get(subCategoryId) ?? null
						: null;
				out.push({
					...detailRow,
					orderNo: ord.orderNo ?? null,
					serviceName: serviceItem?.serviceName ?? null,
					subCategoryId,
					subCategoryName
				});
			}
		}
		out.sort((a, b) => b.id - a.id);
		return out;
	}
);

async function refreshServiceOrderDetailQueriesForVisitByOrderId(
	serviceOrderId: number
): Promise<void> {
	const [ord] = await ensureDb()
		.select({ visitId: table.serviceOrderTable.visitId })
		.from(table.serviceOrderTable)
		.where(eq(table.serviceOrderTable.id, serviceOrderId))
		.limit(1);
	if (ord) {
		getServiceOrderDetailRowsForVisit({
			visitId: ord.visitId
		}).refresh();
	}
}

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
		await refreshServiceOrderDetailQueriesForVisitByOrderId(
			row.serviceOrderId
		);
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
		await refreshServiceOrderDetailQueriesForVisitByOrderId(
			row.serviceOrderId
		);
		return row;
	}
);

// delete (soft)
export const deleteServiceOrderDetail = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		const [existing] = await ensureDb()
			.select({
				serviceOrderId: table.serviceOrderDetailTable.serviceOrderId
			})
			.from(table.serviceOrderDetailTable)
			.where(eq(table.serviceOrderDetailTable.id, id))
			.limit(1);
		await ensureDb()
			.update(table.serviceOrderDetailTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.serviceOrderDetailTable.id, id));
		getServiceOrderDetail(undefined).refresh();
		getServiceOrderDetailCount().refresh();
		getServiceOrderDetailPaginated(undefined).refresh();
		if (existing) {
			await refreshServiceOrderDetailQueriesForVisitByOrderId(
				existing.serviceOrderId
			);
		}
	}
);

// delete complete (hard)
export const deleteServiceOrderDetailComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		const [existing] = await ensureDb()
			.select({
				serviceOrderId: table.serviceOrderDetailTable.serviceOrderId
			})
			.from(table.serviceOrderDetailTable)
			.where(eq(table.serviceOrderDetailTable.id, id))
			.limit(1);
		await ensureDb()
			.delete(table.serviceOrderDetailTable)
			.where(eq(table.serviceOrderDetailTable.id, id));
		getServiceOrderDetail(undefined).refresh();
		getServiceOrderDetailCount().refresh();
		getServiceOrderDetailPaginated(undefined).refresh();
		if (existing) {
			await refreshServiceOrderDetailQueriesForVisitByOrderId(
				existing.serviceOrderId
			);
		}
	}
);

// mark nursing complete time (once)
export const markServiceOrderDetailNursingComplete = command(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<ServiceOrderDetailSchema | null> => {
		const [updated] = await ensureDb()
			.update(table.serviceOrderDetailTable)
			.set({
				nursingCompleteTime: new Date().toISOString()
			} as ServiceOrderDetailSchemaUpdate)
			.where(
				and(
					eq(table.serviceOrderDetailTable.id, id),
					isNull(table.serviceOrderDetailTable.nursingCompleteTime)
				)
			)
			.returning();

		// If already completed, return current row instead of failing.
		if (!updated) {
			const [existing] = await ensureDb()
				.select()
				.from(table.serviceOrderDetailTable)
				.where(eq(table.serviceOrderDetailTable.id, id));
			return existing ?? null;
		}

		getServiceOrderDetail(undefined).refresh();
		getServiceOrderDetailCount().refresh();
		getServiceOrderDetailPaginated(undefined).refresh();
		if (updated) {
			await refreshServiceOrderDetailQueriesForVisitByOrderId(
				updated.serviceOrderId
			);
		}
		return updated;
	}
);

const MAX_NURSING_COMPLETE_BATCH = 100;

/** Lines on this visit not yet marked nursing complete (respects optional detail status filter). */
export const getNursingIncompleteLineCountForVisit = query(
	'unchecked' as const,
	async ({
		visitId,
		hospitalId,
		statusId
	}: {
		visitId: number;
		hospitalId: string;
		statusId?: number | null;
	}): Promise<number> => {
		const [visitRow] = await ensureDb()
			.select({ id: table.patientVisitTable.id })
			.from(table.patientVisitTable)
			.where(
				and(
					eq(table.patientVisitTable.id, visitId),
					eq(table.patientVisitTable.hospitalId, hospitalId)
				)
			)
			.limit(1);

		if (!visitRow) return 0;

		const orders = await ensureDb()
			.select({ id: table.serviceOrderTable.id })
			.from(table.serviceOrderTable)
			.where(
				and(
					eq(table.serviceOrderTable.visitId, visitId),
					ne(table.serviceOrderTable.statusId, StatusEnum.DELETED)
				)
			);

		const orderIds = orders.map((o) => o.id);
		if (orderIds.length === 0) return 0;

		const detailWhere = buildNursingIncompleteDetailWhere(
			orderIds,
			statusId
		);
		const [row] = await ensureDb()
			.select({ count: count() })
			.from(table.serviceOrderDetailTable)
			.where(detailWhere);
		return row?.count ?? 0;
	}
);

function buildNursingIncompleteDetailWhere(
	orderIds: number[],
	statusId?: number | null
) {
	const notDeleted = ne(
		table.serviceOrderDetailTable.statusId,
		StatusEnum.DELETED
	);
	let whereExpr = and(
		notDeleted,
		inArray(table.serviceOrderDetailTable.serviceOrderId, orderIds),
		isNull(table.serviceOrderDetailTable.nursingCompleteTime)
	) as ReturnType<typeof and>;
	if (statusId != null && Number.isFinite(statusId)) {
		whereExpr = and(
			whereExpr,
			eq(table.serviceOrderDetailTable.statusId, statusId)
		) as typeof whereExpr;
	}
	return whereExpr;
}

/** Mark up to `batchSize` incomplete lines for the visit (oldest order first, then detail id). */
export const markServiceOrderDetailNursingCompleteBatch = command(
	'unchecked' as const,
	async ({
		visitId,
		hospitalId,
		batchSize,
		statusId
	}: {
		visitId: number;
		hospitalId: string;
		batchSize: number;
		statusId?: number | null;
	}): Promise<{
		markedCount: number;
		remainingIncompleteCount: number;
	}> => {
		const capped = Math.min(
			Math.max(1, Math.floor(batchSize)),
			MAX_NURSING_COMPLETE_BATCH
		);

		const [visitRow] = await ensureDb()
			.select({ id: table.patientVisitTable.id })
			.from(table.patientVisitTable)
			.where(
				and(
					eq(table.patientVisitTable.id, visitId),
					eq(table.patientVisitTable.hospitalId, hospitalId)
				)
			)
			.limit(1);

		if (!visitRow) {
			return { markedCount: 0, remainingIncompleteCount: 0 };
		}

		const orders = await ensureDb()
			.select({ id: table.serviceOrderTable.id })
			.from(table.serviceOrderTable)
			.where(
				and(
					eq(table.serviceOrderTable.visitId, visitId),
					ne(table.serviceOrderTable.statusId, StatusEnum.DELETED)
				)
			)
			.orderBy(
				asc(table.serviceOrderTable.orderDate),
				asc(table.serviceOrderTable.id)
			);

		const orderIds = orders.map((o) => o.id);
		if (orderIds.length === 0) {
			return { markedCount: 0, remainingIncompleteCount: 0 };
		}

		const detailWhere = buildNursingIncompleteDetailWhere(
			orderIds,
			statusId
		);

		const [remainingBefore] = await ensureDb()
			.select({ count: count() })
			.from(table.serviceOrderDetailTable)
			.where(detailWhere);

		const totalIncomplete = remainingBefore?.count ?? 0;
		if (totalIncomplete === 0) {
			return { markedCount: 0, remainingIncompleteCount: 0 };
		}

		const candidates = await ensureDb()
			.select({
				id: table.serviceOrderDetailTable.id,
				serviceOrderId: table.serviceOrderDetailTable.serviceOrderId
			})
			.from(table.serviceOrderDetailTable)
			.where(detailWhere)
			.orderBy(
				asc(table.serviceOrderDetailTable.serviceOrderId),
				asc(table.serviceOrderDetailTable.id)
			)
			.limit(capped);

		if (candidates.length === 0) {
			return {
				markedCount: 0,
				remainingIncompleteCount: totalIncomplete
			};
		}

		const ids = candidates.map((c) => c.id);
		const now = new Date().toISOString();
		const updated = await ensureDb()
			.update(table.serviceOrderDetailTable)
			.set({
				nursingCompleteTime: now
			} as ServiceOrderDetailSchemaUpdate)
			.where(inArray(table.serviceOrderDetailTable.id, ids))
			.returning({
				id: table.serviceOrderDetailTable.id,
				serviceOrderId: table.serviceOrderDetailTable.serviceOrderId
			});

		getServiceOrderDetail(undefined).refresh();
		getServiceOrderDetailCount().refresh();
		getServiceOrderDetailPaginated(undefined).refresh();

		const orderIdsTouched = new Set(
			updated.map((r) => r.serviceOrderId)
		);
		for (const oid of orderIdsTouched) {
			await refreshServiceOrderDetailQueriesForVisitByOrderId(oid);
		}

		const remainingIncompleteCount = Math.max(
			0,
			totalIncomplete - updated.length
		);

		return {
			markedCount: updated.length,
			remainingIncompleteCount
		};
	}
);
