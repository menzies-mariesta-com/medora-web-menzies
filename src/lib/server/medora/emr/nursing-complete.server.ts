import { error, type RequestEvent } from '@sveltejs/kit';
import { and, count, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import type { ServiceOrderDetailSchema } from '$lib/server/db/schema-type';

function requireUser(event: RequestEvent): void {
	if (!event.locals?.user) throw error(401, 'Unauthorized');
}

function serviceOrderDetailStatusFilter(statusId?: number) {
	return statusId != null
		? eq(table.serviceOrderDetailTable.statusId, statusId)
		: eq(table.serviceOrderDetailTable.statusId, StatusEnum.ACTIVE);
}

export async function getNursingIncompleteLineCountForVisit(
	event: RequestEvent,
	input: { hospitalId: string; visitId: number; statusId?: number }
): Promise<number> {
	requireUser(event);
	await ensureCanAccessHospital(event, input.hospitalId);

	const orders = await ensureDb()
		.select({ id: table.serviceOrderTable.id })
		.from(table.serviceOrderTable)
		.innerJoin(
			table.patientVisitTable,
			eq(table.patientVisitTable.id, table.serviceOrderTable.visitId)
		)
		.where(
			and(
				eq(table.serviceOrderTable.visitId, input.visitId),
				eq(table.patientVisitTable.hospitalId, input.hospitalId),
				ne(table.serviceOrderTable.statusId, StatusEnum.DELETED)
			)
		);
	const orderIds = orders.map((o) => o.id);
	if (orderIds.length === 0) return 0;

	const whereExpr = and(
		inArray(table.serviceOrderDetailTable.serviceOrderId, orderIds),
		sql`${table.serviceOrderDetailTable.nursingCompleteTime} is null`,
		serviceOrderDetailStatusFilter(input.statusId)
	);

	const rows = await ensureDb()
		.select({ count: count() })
		.from(table.serviceOrderDetailTable)
		.where(whereExpr);

	return rows[0]?.count ?? 0;
}

export async function getServiceOrderDetailPaginatedForOrders(
	event: RequestEvent,
	params: PaginationParams & {
		hospitalId: string;
		serviceOrderIds: number[];
		statusId?: number;
	}
): Promise<PaginatedResult<ServiceOrderDetailSchema>> {
	requireUser(event);
	await ensureCanAccessHospital(event, params.hospitalId);
	const { page, pageSize, limit, offset } =
		normalizePagination(params);

	if (!params.serviceOrderIds.length) {
		return { data: [], total: 0, page, pageSize, totalPages: 1 };
	}

	const baseConditions = [
		inArray(
			table.serviceOrderDetailTable.serviceOrderId,
			params.serviceOrderIds
		)
	];
	if (params.statusId != null) {
		baseConditions.push(
			eq(table.serviceOrderDetailTable.statusId, params.statusId)
		);
	} else {
		baseConditions.push(
			eq(table.serviceOrderDetailTable.statusId, StatusEnum.ACTIVE)
		);
	}
	const whereExpr = and(...baseConditions);

	const [data, countResult] = await Promise.all([
		ensureDb()
			.select()
			.from(table.serviceOrderDetailTable)
			.where(whereExpr)
			.orderBy(
				desc(
					sql`coalesce(${table.serviceOrderDetailTable.updatedAt}, ${table.serviceOrderDetailTable.createdAt})`
				)
			)
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.serviceOrderDetailTable)
			.where(whereExpr)
	]);

	const total = countResult[0]?.count ?? 0;
	return {
		data: data as unknown as ServiceOrderDetailSchema[],
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize) || 1
	};
}

export async function markServiceOrderDetailNursingComplete(
	event: RequestEvent,
	input: { hospitalId: string; id: number }
): Promise<ServiceOrderDetailSchema> {
	requireUser(event);
	await ensureCanAccessHospital(event, input.hospitalId);

	const nowIso = new Date().toISOString();
	const [row] = await ensureDb()
		.update(table.serviceOrderDetailTable)
		.set({
			nursingCompleteTime: nowIso as any,
			updatedBy: event.locals.user?.id ?? null
		} as any)
		.where(
			and(
				eq(table.serviceOrderDetailTable.id, input.id),
				eq(table.serviceOrderDetailTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.returning();

	if (!row) throw error(404, 'Order detail not found');
	return row as unknown as ServiceOrderDetailSchema;
}

export async function markServiceOrderDetailNursingCompleteBatch(
	event: RequestEvent,
	input: {
		hospitalId: string;
		visitId: number;
		batchSize: number;
		statusId?: number;
	}
): Promise<{
	markedCount: number;
	remainingIncompleteCount: number;
}> {
	requireUser(event);
	await ensureCanAccessHospital(event, input.hospitalId);

	const orders = await ensureDb()
		.select({ id: table.serviceOrderTable.id })
		.from(table.serviceOrderTable)
		.innerJoin(
			table.patientVisitTable,
			eq(table.patientVisitTable.id, table.serviceOrderTable.visitId)
		)
		.where(
			and(
				eq(table.serviceOrderTable.visitId, input.visitId),
				eq(table.patientVisitTable.hospitalId, input.hospitalId),
				ne(table.serviceOrderTable.statusId, StatusEnum.DELETED)
			)
		);
	const orderIds = orders.map((o) => o.id);
	if (orderIds.length === 0) {
		return { markedCount: 0, remainingIncompleteCount: 0 };
	}

	const whereExpr = and(
		inArray(table.serviceOrderDetailTable.serviceOrderId, orderIds),
		sql`${table.serviceOrderDetailTable.nursingCompleteTime} is null`,
		serviceOrderDetailStatusFilter(input.statusId)
	);

	const candidates = await ensureDb()
		.select({ id: table.serviceOrderDetailTable.id })
		.from(table.serviceOrderDetailTable)
		.where(whereExpr)
		.orderBy(desc(table.serviceOrderDetailTable.id))
		.limit(Math.max(1, Math.min(500, input.batchSize || 1)));

	const ids = candidates.map((c) => c.id);
	if (ids.length === 0) {
		const remainingIncompleteCount =
			await getNursingIncompleteLineCountForVisit(event, {
				hospitalId: input.hospitalId,
				visitId: input.visitId,
				statusId: input.statusId
			});
		return { markedCount: 0, remainingIncompleteCount };
	}

	const nowIso = new Date().toISOString();
	await ensureDb()
		.update(table.serviceOrderDetailTable)
		.set({
			nursingCompleteTime: nowIso as any,
			updatedBy: event.locals.user?.id ?? null
		} as any)
		.where(inArray(table.serviceOrderDetailTable.id, ids));

	const remainingIncompleteCount =
		await getNursingIncompleteLineCountForVisit(event, {
			hospitalId: input.hospitalId,
			visitId: input.visitId,
			statusId: input.statusId
		});

	return { markedCount: ids.length, remainingIncompleteCount };
}
