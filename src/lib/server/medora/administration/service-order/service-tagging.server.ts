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
import { paginatedEntityStatusEq } from '$lib/server/medora/paginated-entity-status-filter.server';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/model/type/pagination.type';
import { normalizePagination } from '$lib/model/type/pagination.type';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	normalizeMoneyDecimal2dpOrNull,
	optionalMoneyDecimal2dp,
	requireMoneyDecimal2dp
} from '$lib/server/medora/money-field.server';

const SERVICE_TAGGING_MONEY_OPTS = { allowNegative: false } as const;

function normalizeServiceTaggingRow<T extends ServiceTaggingSchema>(
	row: T
): T {
	return {
		...row,
		serviceAmount: normalizeMoneyDecimal2dpOrNull(row.serviceAmount),
		serviceTaxAmount: normalizeMoneyDecimal2dpOrNull(row.serviceTaxAmount)
	};
}

function normalizeServiceTaggingWritePayload(
	payload: ServiceTaggingSchemaInsert
): ServiceTaggingSchemaInsert {
	return {
		...payload,
		serviceAmount: requireMoneyDecimal2dp(
			payload.serviceAmount,
			'Service amount',
			SERVICE_TAGGING_MONEY_OPTS
		),
		serviceTaxAmount:
			payload.serviceTaxAmount != null &&
			String(payload.serviceTaxAmount).trim() !== ''
				? optionalMoneyDecimal2dp(
						payload.serviceTaxAmount,
						'Service tax amount',
						SERVICE_TAGGING_MONEY_OPTS
					)
				: null
	};
}

function normalizeServiceTaggingUpdatePayload(
	data: ServiceTaggingSchemaUpdate
): ServiceTaggingSchemaUpdate {
	const out: ServiceTaggingSchemaUpdate = { ...data };
	if (data.serviceAmount !== undefined) {
		out.serviceAmount = requireMoneyDecimal2dp(
			data.serviceAmount,
			'Service amount',
			SERVICE_TAGGING_MONEY_OPTS
		);
	}
	if (data.serviceTaxAmount !== undefined) {
		out.serviceTaxAmount =
			data.serviceTaxAmount == null ||
			String(data.serviceTaxAmount).trim() === ''
				? null
				: optionalMoneyDecimal2dp(
						data.serviceTaxAmount,
						'Service tax amount',
						SERVICE_TAGGING_MONEY_OPTS
					);
	}
	return out;
}

function moneyFilterValueForEq(value: number | string): string {
	return requireMoneyDecimal2dp(
		value,
		'Amount',
		SERVICE_TAGGING_MONEY_OPTS
	);
}

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

async function hospitalIdForTaggingId(
	id: number
): Promise<string | null> {
	const [row] = await ensureDb()
		.select({ hospitalId: table.hospitalBranchTable.hospitalId })
		.from(table.serviceTaggingTable)
		.innerJoin(
			table.hospitalBranchTable,
			eq(
				table.hospitalBranchTable.id,
				table.serviceTaggingTable.branchId
			)
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
		await ensureBranchBelongsToHospital(
			input.hospitalId,
			input.branchId
		);
	}

	let whereExpr: SQL = paginatedEntityStatusEq(
		table.serviceTaggingTable.statusId,
		input.statusId
	);

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
		whereExpr = and(
			whereExpr,
			eq(table.serviceTaggingTable.id, input.id)
		)!;
	}
	if (input.serviceAmount != null) {
		whereExpr = and(
			whereExpr,
			eq(
				table.serviceTaggingTable.serviceAmount,
				moneyFilterValueForEq(input.serviceAmount)
			)
		)!;
	}
	if (input.serviceTaxAmount != null) {
		whereExpr = and(
			whereExpr,
			eq(
				table.serviceTaggingTable.serviceTaxAmount,
				moneyFilterValueForEq(input.serviceTaxAmount)
			)
		)!;
	}
	const rows = await ensureDb()
		.select()
		.from(table.serviceTaggingTable)
		.where(whereExpr);
	return rows.map(normalizeServiceTaggingRow);
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
		await ensureBranchBelongsToHospital(
			params.hospitalId,
			params.branchId
		);
	}

	const { page, pageSize, limit, offset } =
		normalizePagination(params);

	let whereExpr: SQL = ne(
		table.serviceTaggingTable.statusId,
		StatusEnum.DELETED
	);

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
		whereExpr = and(
			whereExpr,
			eq(table.serviceTaggingTable.id, params.id)
		)!;
	}
	if (params.serviceAmount != null) {
		whereExpr = and(
			whereExpr,
			eq(
				table.serviceTaggingTable.serviceAmount,
				moneyFilterValueForEq(params.serviceAmount)
			)
		)!;
	}
	if (params.serviceTaxAmount != null) {
		whereExpr = and(
			whereExpr,
			eq(
				table.serviceTaggingTable.serviceTaxAmount,
				moneyFilterValueForEq(params.serviceTaxAmount)
			)
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
		data: data.map(normalizeServiceTaggingRow),
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
	await ensureBranchBelongsToHospital(
		input.hospitalId,
		input.branchId
	);

	const { hospitalId: _hid, ...rawPayload } = input;
	const payload = normalizeServiceTaggingWritePayload(rawPayload);
	const [row] = await ensureDb()
		.insert(table.serviceTaggingTable)
		.values(payload)
		.returning();
	if (!row) throw new Error('Failed to create service tagging');
	return normalizeServiceTaggingRow(row);
}

export async function updateServiceTagging(
	event: RequestEvent,
	input: ServiceTaggingSchemaUpdate & {
		id: number;
		hospitalId: string;
	}
): Promise<ServiceTaggingSchema> {
	await ensureCanAccessHospital(event, input.hospitalId);
	const hid = await hospitalIdForTaggingId(input.id);
	if (!hid) throw error(404, 'Service tagging not found');
	if (hid !== input.hospitalId) throw error(403, 'Forbidden');

	const { id, hospitalId: _hid, ...data } = input;
	const [row] = await ensureDb()
		.update(table.serviceTaggingTable)
		.set(normalizeServiceTaggingUpdatePayload(data))
		.where(eq(table.serviceTaggingTable.id, id))
		.returning();
	if (!row) throw error(404, 'Service tagging not found');
	return normalizeServiceTaggingRow(row);
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
			statusId: StatusEnum.INACTIVE,
			deletedAt: sql`now()`,
			deletedBy: event.locals.user?.id ?? null
		})
		.where(eq(table.serviceTaggingTable.id, input.id));
}
