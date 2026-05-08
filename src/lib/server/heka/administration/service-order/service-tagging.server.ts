import { error, type RequestEvent } from '@sveltejs/kit';
import { and, count, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
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
} from '$lib/model/type/pagination.type';
import { normalizePagination } from '$lib/model/type/pagination.type';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';

async function ensureBranchBelongsToHospital(
	hospitalId: string,
	branchId: string
): Promise<void> {
	const [row] = await ensureDb()
		.select({ id: table.hospitalBranchTable.id })
		.from(table.hospitalBranchTable)
		.where(
			and(
				eq(table.hospitalBranchTable.id, branchId),
				eq(table.hospitalBranchTable.hospitalId, hospitalId)
			)
		)
		.limit(1);
	if (!row) throw error(400, 'Invalid branch for this hospital');
}

async function hospitalIdForTaggingId(id: number): Promise<string | null> {
	const [row] = await ensureDb()
		.select({ hospitalId: table.hospitalBranchTable.hospitalId })
		.from(table.serviceTaggingTable)
		.innerJoin(
			table.hospitalBranchTable,
			eq(table.hospitalBranchTable.id, table.serviceTaggingTable.branchId)
		)
		.where(eq(table.serviceTaggingTable.id, id))
		.limit(1);
	return row?.hospitalId ?? null;
}

export async function getServiceTaggings(
	event: RequestEvent,
	input: {
		hospitalId: string;
		branchId?: string | null;
		serviceId?: number | null;
		serviceIds?: number[] | null;
		serviceAmount?: number | null;
		serviceTaxAmount?: number | null;
		statusId?: number | null;
		id?: number | null;
	}
): Promise<ServiceTaggingSchema[]> {
	await ensureCanAccessHospital(event, input.hospitalId);
	if (input.branchId) {
		await ensureBranchBelongsToHospital(input.hospitalId, input.branchId);
	}

	let whereExpr: SQL = ne(table.serviceTaggingTable.statusId, StatusEnum.DELETED);

	if (input.branchId) {
		whereExpr = and(
			whereExpr,
			eq(table.serviceTaggingTable.branchId, input.branchId)
		)!;
	}
	if (input.serviceId != null) {
		whereExpr = and(
			whereExpr,
			eq(table.serviceTaggingTable.serviceId, input.serviceId)
		)!;
	}
	if (input.serviceIds != null) {
		if (input.serviceIds.length === 0) return [];
		whereExpr = and(
			whereExpr,
			inArray(table.serviceTaggingTable.serviceId, input.serviceIds)
		)!;
	}
	if (input.id != null) {
		whereExpr = and(whereExpr, eq(table.serviceTaggingTable.id, input.id))!;
	}
	if (input.serviceAmount != null) {
		whereExpr = and(
			whereExpr,
			eq(table.serviceTaggingTable.serviceAmount, String(input.serviceAmount))
		)!;
	}
	if (input.serviceTaxAmount != null) {
		whereExpr = and(
			whereExpr,
			eq(
				table.serviceTaggingTable.serviceTaxAmount,
				String(input.serviceTaxAmount)
			)
		)!;
	}
	if (input.statusId != null) {
		whereExpr = and(
			whereExpr,
			eq(table.serviceTaggingTable.statusId, input.statusId)
		)!;
	}

	return ensureDb()
		.select()
		.from(table.serviceTaggingTable)
		.where(whereExpr);
}

export async function getServiceTaggingsPaginated(
	event: RequestEvent,
	params: PaginationParams & {
		hospitalId: string;
		branchId?: string | null;
		serviceId?: number | null;
		serviceIds?: number[] | null;
		serviceAmount?: number | null;
		serviceTaxAmount?: number | null;
		statusId?: number | null;
		id?: number | null;
	}
): Promise<PaginatedResult<ServiceTaggingSchema>> {
	await ensureCanAccessHospital(event, params.hospitalId);
	if (params.branchId) {
		await ensureBranchBelongsToHospital(params.hospitalId, params.branchId);
	}

	const { page, pageSize, limit, offset } = normalizePagination(params);

	let whereExpr: SQL = ne(table.serviceTaggingTable.statusId, StatusEnum.DELETED);

	if (params.branchId) {
		whereExpr = and(
			whereExpr,
			eq(table.serviceTaggingTable.branchId, params.branchId)
		)!;
	}
	if (params.serviceId != null) {
		whereExpr = and(
			whereExpr,
			eq(table.serviceTaggingTable.serviceId, params.serviceId)
		)!;
	}
	if (params.serviceIds != null) {
		if (params.serviceIds.length === 0) {
			return { data: [], total: 0, page, pageSize, totalPages: 1 };
		}
		whereExpr = and(
			whereExpr,
			inArray(table.serviceTaggingTable.serviceId, params.serviceIds)
		)!;
	}
	if (params.id != null) {
		whereExpr = and(whereExpr, eq(table.serviceTaggingTable.id, params.id))!;
	}
	if (params.serviceAmount != null) {
		whereExpr = and(
			whereExpr,
			eq(table.serviceTaggingTable.serviceAmount, String(params.serviceAmount))
		)!;
	}
	if (params.serviceTaxAmount != null) {
		whereExpr = and(
			whereExpr,
			eq(
				table.serviceTaggingTable.serviceTaxAmount,
				String(params.serviceTaxAmount)
			)
		)!;
	}
	if (params.statusId != null) {
		whereExpr = and(
			whereExpr,
			eq(table.serviceTaggingTable.statusId, params.statusId)
		)!;
	}

	const [data, countResult] = await Promise.all([
		ensureDb()
			.select()
			.from(table.serviceTaggingTable)
			.where(whereExpr)
			.orderBy(desc(table.serviceTaggingTable.id))
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

export async function createServiceTagging(
	event: RequestEvent,
	input: ServiceTaggingSchemaInsert & { hospitalId: string }
): Promise<ServiceTaggingSchema> {
	await ensureCanAccessHospital(event, input.hospitalId);
	await ensureBranchBelongsToHospital(input.hospitalId, input.branchId);

	const { hospitalId: _hid, ...payload } = input;
	const [row] = await ensureDb()
		.insert(table.serviceTaggingTable)
		.values(payload)
		.returning();
	if (!row) throw new Error('Failed to create service tagging');
	return row;
}

export async function updateServiceTagging(
	event: RequestEvent,
	input: ServiceTaggingSchemaUpdate & { id: number; hospitalId: string }
): Promise<ServiceTaggingSchema> {
	await ensureCanAccessHospital(event, input.hospitalId);
	const hid = await hospitalIdForTaggingId(input.id);
	if (!hid) throw error(404, 'Service tagging not found');
	if (hid !== input.hospitalId) throw error(403, 'Forbidden');

	const { id, hospitalId: _hid, ...data } = input;
	const [row] = await ensureDb()
		.update(table.serviceTaggingTable)
		.set(data)
		.where(eq(table.serviceTaggingTable.id, id))
		.returning();
	if (!row) throw error(404, 'Service tagging not found');
	return row;
}

export async function deleteServiceTagging(
	event: RequestEvent,
	input: { hospitalId: string; id: number }
): Promise<void> {
	await ensureCanAccessHospital(event, input.hospitalId);
	const hid = await hospitalIdForTaggingId(input.id);
	if (!hid) throw error(404, 'Service tagging not found');
	if (hid !== input.hospitalId) throw error(403, 'Forbidden');

	await ensureDb()
		.update(table.serviceTaggingTable)
		.set({
			statusId: StatusEnum.DELETED,
			deletedAt: sql`now()`,
			deletedBy: event.locals.user?.id ?? null
		})
		.where(eq(table.serviceTaggingTable.id, input.id));
}

