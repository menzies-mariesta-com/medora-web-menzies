import { error, type RequestEvent } from '@sveltejs/kit';
import {
	and,
	count,
	desc,
	eq,
	ilike,
	inArray,
	ne
} from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	ServiceItemSchema,
	ServiceItemSchemaInsert,
	ServiceItemSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/model/type/pagination.type';
import { normalizePagination } from '$lib/model/type/pagination.type';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';

export async function getServiceItems(
	event: RequestEvent,
	input: {
		hospitalId: string;
		subCategoryId?: number | null;
		subCategoryIds?: number[] | null;
		serviceName?: string | null;
		serviceCode?: string | null;
		statusId?: number | null;
		id?: number | null;
	}
): Promise<ServiceItemSchema[]> {
	await ensureCanAccessHospital(event, input.hospitalId);

	let whereExpr = and(
		eq(table.serviceItemTable.hospitalId, input.hospitalId)
	);

	if (input.id != null) {
		whereExpr = and(
			whereExpr,
			eq(table.serviceItemTable.id, input.id)
		);
	} else if (input.statusId != null) {
		whereExpr = and(
			whereExpr,
			eq(table.serviceItemTable.statusId, input.statusId)
		);
	} else {
		whereExpr = and(
			whereExpr,
			eq(table.serviceItemTable.statusId, StatusEnum.ACTIVE)
		);
	}

	if (input.subCategoryId != null) {
		whereExpr = and(
			whereExpr,
			eq(table.serviceItemTable.subCategoryId, input.subCategoryId)
		);
	}

	if (input.subCategoryIds != null) {
		if (input.subCategoryIds.length === 0) return [];
		whereExpr = and(
			whereExpr,
			inArray(
				table.serviceItemTable.subCategoryId,
				input.subCategoryIds
			)
		);
	}

	const nameTerm = input.serviceName?.trim();
	if (nameTerm) {
		whereExpr = and(
			whereExpr,
			ilike(table.serviceItemTable.serviceName, `%${nameTerm}%`)
		);
	}

	const codeTerm = input.serviceCode?.trim();
	if (codeTerm) {
		whereExpr = and(
			whereExpr,
			ilike(table.serviceItemTable.serviceCode, `%${codeTerm}%`)
		);
	}

	return ensureDb()
		.select()
		.from(table.serviceItemTable)
		.where(whereExpr)
		.orderBy(table.serviceItemTable.serviceName);
}

export async function getServiceItemsPaginated(
	event: RequestEvent,
	params: PaginationParams & {
		hospitalId: string;
		subCategoryId?: number | null;
		subCategoryIds?: number[] | null;
		serviceName?: string | null;
		serviceCode?: string | null;
		statusId?: number | null;
		id?: number | null;
	}
): Promise<PaginatedResult<ServiceItemSchema>> {
	await ensureCanAccessHospital(event, params.hospitalId);
	const { page, pageSize, limit, offset } =
		normalizePagination(params);

	let whereExpr = and(
		eq(table.serviceItemTable.hospitalId, params.hospitalId)
	);

	if (params.id != null) {
		whereExpr = and(
			whereExpr,
			eq(table.serviceItemTable.id, params.id)
		);
	} else if (params.statusId != null) {
		whereExpr = and(
			whereExpr,
			eq(table.serviceItemTable.statusId, params.statusId)
		);
	} else {
		whereExpr = and(
			whereExpr,
			eq(table.serviceItemTable.statusId, StatusEnum.ACTIVE)
		);
	}

	if (params.subCategoryId != null) {
		whereExpr = and(
			whereExpr,
			eq(table.serviceItemTable.subCategoryId, params.subCategoryId)
		);
	}

	if (params.subCategoryIds != null) {
		if (params.subCategoryIds.length === 0) {
			return { data: [], total: 0, page, pageSize, totalPages: 1 };
		}
		whereExpr = and(
			whereExpr,
			inArray(
				table.serviceItemTable.subCategoryId,
				params.subCategoryIds
			)
		);
	}

	const nameTerm = params.serviceName?.trim();
	if (nameTerm) {
		whereExpr = and(
			whereExpr,
			ilike(table.serviceItemTable.serviceName, `%${nameTerm}%`)
		);
	}

	const codeTerm = params.serviceCode?.trim();
	if (codeTerm) {
		whereExpr = and(
			whereExpr,
			ilike(table.serviceItemTable.serviceCode, `%${codeTerm}%`)
		);
	}

	const [data, countResult] = await Promise.all([
		ensureDb()
			.select()
			.from(table.serviceItemTable)
			.where(whereExpr)
			.orderBy(desc(table.serviceItemTable.id))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.serviceItemTable)
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

export async function createServiceItem(
	event: RequestEvent,
	input: ServiceItemSchemaInsert & { hospitalId: string }
): Promise<ServiceItemSchema> {
	await ensureCanAccessHospital(event, input.hospitalId);

	const [row] = await ensureDb()
		.insert(table.serviceItemTable)
		.values(input)
		.returning();
	if (!row) throw new Error('Failed to create service item');
	return row;
}

export async function updateServiceItem(
	event: RequestEvent,
	input: ServiceItemSchemaUpdate & { id: number; hospitalId: string }
): Promise<ServiceItemSchema> {
	await ensureCanAccessHospital(event, input.hospitalId);

	const [existing] = await ensureDb()
		.select({ hospitalId: table.serviceItemTable.hospitalId })
		.from(table.serviceItemTable)
		.where(eq(table.serviceItemTable.id, input.id))
		.limit(1);
	if (!existing) throw error(404, 'Service item not found');
	if (existing.hospitalId !== input.hospitalId)
		throw error(403, 'Forbidden');

	const { id, hospitalId: _hid, ...data } = input;
	const [row] = await ensureDb()
		.update(table.serviceItemTable)
		.set(data)
		.where(eq(table.serviceItemTable.id, id))
		.returning();
	if (!row) throw error(404, 'Service item not found');
	return row;
}

export async function deleteServiceItem(
	event: RequestEvent,
	input: { hospitalId: string; id: number }
): Promise<void> {
	await ensureCanAccessHospital(event, input.hospitalId);

	const [existing] = await ensureDb()
		.select({ hospitalId: table.serviceItemTable.hospitalId })
		.from(table.serviceItemTable)
		.where(eq(table.serviceItemTable.id, input.id))
		.limit(1);
	if (!existing) throw error(404, 'Service item not found');
	if (existing.hospitalId !== input.hospitalId)
		throw error(403, 'Forbidden');

	await ensureDb()
		.update(table.serviceItemTable)
		.set({ statusId: StatusEnum.INACTIVE })
		.where(eq(table.serviceItemTable.id, input.id));
}
