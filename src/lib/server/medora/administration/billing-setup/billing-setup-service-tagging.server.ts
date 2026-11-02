import { error, type RequestEvent } from '@sveltejs/kit';
import { and, asc, count, desc, eq, ilike, ne, notInArray, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { BillingSetupCareSettingEnum } from '$lib/model/enum/billing-setup-care-setting.enum';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/model/type/pagination.type';
import { normalizePagination } from '$lib/model/type/pagination.type';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { normalizeMoneyDecimal2dpOrNull } from '$lib/server/medora/money-field.server';
import type {
	BillingSetupAvailableTaggingRow,
	BillingSetupServiceTaggingLinkRow
} from '$lib/model/type/medora/ui-rows.type';
import type { ServiceTaggingSchema } from '$lib/server/db/schema-type';

export type BillingSetupTaggingQueryFilters = {
	taggingId?: number | null;
	categoryId?: number | null;
	subCategoryId?: number | null;
	service?: string | null;
};

function appendBillingSetupTaggingFilters(
	whereExpr: SQL,
	filters: BillingSetupTaggingQueryFilters | undefined
): SQL {
	if (!filters) return whereExpr;
	let expr = whereExpr;

	if (filters.taggingId != null) {
		expr = and(
			expr,
			eq(table.serviceTaggingTable.id, filters.taggingId)
		)!;
	}
	if (filters.categoryId != null) {
		expr = and(
			expr,
			eq(table.categoryTable.id, filters.categoryId)
		)!;
	}
	if (filters.subCategoryId != null) {
		expr = and(
			expr,
			eq(table.subCategoryTable.id, filters.subCategoryId)
		)!;
	}
	const serviceTerm = filters.service?.trim();
	if (serviceTerm) {
		const pattern = `%${serviceTerm}%`;
		expr = and(
			expr,
			or(
				ilike(table.serviceItemTable.serviceName, pattern),
				ilike(table.serviceItemTable.serviceCode, pattern)
			)
		)!;
	}
	return expr;
}

async function assertTaggingBelongsToHospital(
	hospitalId: string,
	serviceTaggingId: number
): Promise<void> {
	const [row] = await ensureDb()
		.select({ id: table.serviceTaggingTable.id })
		.from(table.serviceTaggingTable)
		.innerJoin(
			table.hospitalBranchTable,
			eq(
				table.hospitalBranchTable.id,
				table.serviceTaggingTable.branchId
			)
		)
		.where(
			and(
				eq(table.serviceTaggingTable.id, serviceTaggingId),
				eq(table.hospitalBranchTable.hospitalId, hospitalId),
				eq(table.serviceTaggingTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.limit(1);
	if (!row) throw error(400, 'Invalid service tagging for this hospital');
}

export async function listBillingSetupLinksPaginated(
	event: RequestEvent,
	params: PaginationParams & {
		hospitalId: string;
		careSetting: BillingSetupCareSettingEnum;
		branchId?: string | null;
		filters?: BillingSetupTaggingQueryFilters;
	}
): Promise<PaginatedResult<BillingSetupServiceTaggingLinkRow>> {
	await ensureCanAccessHospital(event, params.hospitalId);

	const { page, pageSize, limit, offset } =
		normalizePagination(params);

	let whereExpr: SQL = and(
		eq(table.billingSetupServiceTaggingTable.hospitalId, params.hospitalId),
		eq(
			table.billingSetupServiceTaggingTable.careSetting,
			params.careSetting
		),
		eq(
			table.billingSetupServiceTaggingTable.statusId,
			StatusEnum.ACTIVE
		),
		eq(table.serviceTaggingTable.statusId, StatusEnum.ACTIVE),
		eq(table.serviceItemTable.statusId, StatusEnum.ACTIVE)
	)!;

	if (params.branchId) {
		whereExpr = and(
			whereExpr,
			eq(table.serviceTaggingTable.branchId, params.branchId)
		)!;
	}
	whereExpr = appendBillingSetupTaggingFilters(
		whereExpr,
		params.filters
	);

	const baseQuery = ensureDb()
		.select({
			id: table.billingSetupServiceTaggingTable.id,
			hospitalId: table.billingSetupServiceTaggingTable.hospitalId,
			careSetting: table.billingSetupServiceTaggingTable.careSetting,
			serviceTaggingId:
				table.billingSetupServiceTaggingTable.serviceTaggingId,
			statusId: table.billingSetupServiceTaggingTable.statusId,
			createdAt: table.billingSetupServiceTaggingTable.createdAt,
			updatedAt: table.billingSetupServiceTaggingTable.updatedAt,
			deletedAt: table.billingSetupServiceTaggingTable.deletedAt,
			branchId: table.serviceTaggingTable.branchId,
			serviceId: table.serviceTaggingTable.serviceId,
			validDate: table.serviceTaggingTable.validDate,
			serviceAmount: table.serviceTaggingTable.serviceAmount,
			serviceTaxAmount: table.serviceTaggingTable.serviceTaxAmount,
			allowEdit: table.serviceTaggingTable.allowEdit,
			taggingStatusId: table.serviceTaggingTable.statusId,
			serviceName: table.serviceItemTable.serviceName,
			serviceCode: table.serviceItemTable.serviceCode,
			branchName: table.hospitalBranchTable.name,
			subCategoryName: table.subCategoryTable.subCategoryName,
			categoryName: table.categoryTable.categoryName
		})
		.from(table.billingSetupServiceTaggingTable)
		.innerJoin(
			table.serviceTaggingTable,
			eq(
				table.billingSetupServiceTaggingTable.serviceTaggingId,
				table.serviceTaggingTable.id
			)
		)
		.innerJoin(
			table.serviceItemTable,
			eq(table.serviceTaggingTable.serviceId, table.serviceItemTable.id)
		)
		.innerJoin(
			table.subCategoryTable,
			eq(table.serviceItemTable.subCategoryId, table.subCategoryTable.id)
		)
		.innerJoin(
			table.categoryTable,
			eq(table.subCategoryTable.categoryId, table.categoryTable.id)
		)
		.innerJoin(
			table.hospitalBranchTable,
			eq(
				table.serviceTaggingTable.branchId,
				table.hospitalBranchTable.id
			)
		)
		.where(whereExpr);

	const [rows, countResult] = await Promise.all([
		baseQuery
			.orderBy(desc(table.billingSetupServiceTaggingTable.id))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.billingSetupServiceTaggingTable)
			.innerJoin(
				table.serviceTaggingTable,
				eq(
					table.billingSetupServiceTaggingTable.serviceTaggingId,
					table.serviceTaggingTable.id
				)
			)
			.innerJoin(
				table.serviceItemTable,
				eq(table.serviceTaggingTable.serviceId, table.serviceItemTable.id)
			)
			.innerJoin(
				table.subCategoryTable,
				eq(table.serviceItemTable.subCategoryId, table.subCategoryTable.id)
			)
			.innerJoin(
				table.categoryTable,
				eq(table.subCategoryTable.categoryId, table.categoryTable.id)
			)
			.where(whereExpr)
	]);

	const data: BillingSetupServiceTaggingLinkRow[] = rows.map((r) => ({
		id: r.id,
		hospitalId: r.hospitalId,
		careSetting: r.careSetting,
		serviceTaggingId: r.serviceTaggingId,
		statusId: r.statusId,
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
		deletedAt: r.deletedAt,
		branchId: r.branchId,
		branchName: r.branchName,
		serviceId: r.serviceId,
		serviceName: r.serviceName,
		serviceCode: r.serviceCode,
		validDate: r.validDate,
		serviceAmount: normalizeMoneyDecimal2dpOrNull(r.serviceAmount),
		serviceTaxAmount: normalizeMoneyDecimal2dpOrNull(r.serviceTaxAmount),
		allowEdit: r.allowEdit,
		taggingStatusId: r.taggingStatusId,
		categoryName: r.categoryName,
		subCategoryName: r.subCategoryName
	}));

	const total = countResult[0]?.count ?? 0;
	return {
		data,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize) || 1
	};
}

export async function listAvailableServiceTaggingsForBillingSetup(
	event: RequestEvent,
	params: PaginationParams & {
		hospitalId: string;
		careSetting: BillingSetupCareSettingEnum;
		branchId: string;
		filters?: BillingSetupTaggingQueryFilters;
	}
): Promise<PaginatedResult<BillingSetupAvailableTaggingRow>> {
	await ensureCanAccessHospital(event, params.hospitalId);

	const [branch] = await ensureDb()
		.select({ id: table.hospitalBranchTable.id })
		.from(table.hospitalBranchTable)
		.where(
			and(
				eq(table.hospitalBranchTable.id, params.branchId),
				eq(table.hospitalBranchTable.hospitalId, params.hospitalId)
			)
		)
		.limit(1);
	if (!branch) throw error(400, 'Invalid branch for this hospital');

	const { page, pageSize, limit, offset } =
		normalizePagination(params);

	const linkedRows = await ensureDb()
		.select({
			id: table.billingSetupServiceTaggingTable.serviceTaggingId
		})
		.from(table.billingSetupServiceTaggingTable)
		.where(
			and(
				eq(
					table.billingSetupServiceTaggingTable.hospitalId,
					params.hospitalId
				),
				eq(
					table.billingSetupServiceTaggingTable.careSetting,
					params.careSetting
				),
				eq(
					table.billingSetupServiceTaggingTable.statusId,
					StatusEnum.ACTIVE
				)
			)
		);
	const linkedIdList = linkedRows.map((r) => r.id);

	let whereExpr: SQL = and(
		eq(table.serviceTaggingTable.branchId, params.branchId),
		eq(table.serviceItemTable.hospitalId, params.hospitalId),
		eq(table.serviceTaggingTable.statusId, StatusEnum.ACTIVE),
		eq(table.serviceItemTable.statusId, StatusEnum.ACTIVE)
	)!;
	if (linkedIdList.length > 0) {
		whereExpr = and(
			whereExpr,
			notInArray(table.serviceTaggingTable.id, linkedIdList)
		)!;
	}
	whereExpr = appendBillingSetupTaggingFilters(whereExpr, params.filters);

	const baseFrom = ensureDb()
		.select({
			id: table.serviceTaggingTable.id,
			branchId: table.serviceTaggingTable.branchId,
			serviceId: table.serviceTaggingTable.serviceId,
			validDate: table.serviceTaggingTable.validDate,
			serviceAmount: table.serviceTaggingTable.serviceAmount,
			serviceTaxAmount: table.serviceTaggingTable.serviceTaxAmount,
			allowEdit: table.serviceTaggingTable.allowEdit,
			statusId: table.serviceTaggingTable.statusId,
			serviceName: table.serviceItemTable.serviceName,
			serviceCode: table.serviceItemTable.serviceCode,
			subCategoryName: table.subCategoryTable.subCategoryName,
			categoryName: table.categoryTable.categoryName
		})
		.from(table.serviceTaggingTable)
		.innerJoin(
			table.serviceItemTable,
			eq(table.serviceTaggingTable.serviceId, table.serviceItemTable.id)
		)
		.innerJoin(
			table.subCategoryTable,
			eq(table.serviceItemTable.subCategoryId, table.subCategoryTable.id)
		)
		.innerJoin(
			table.categoryTable,
			eq(table.subCategoryTable.categoryId, table.categoryTable.id)
		)
		.where(whereExpr);

	const [rows, countResult] = await Promise.all([
		baseFrom
			.orderBy(desc(table.serviceTaggingTable.id))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.serviceTaggingTable)
			.innerJoin(
				table.serviceItemTable,
				eq(table.serviceTaggingTable.serviceId, table.serviceItemTable.id)
			)
			.innerJoin(
				table.subCategoryTable,
				eq(table.serviceItemTable.subCategoryId, table.subCategoryTable.id)
			)
			.innerJoin(
				table.categoryTable,
				eq(table.subCategoryTable.categoryId, table.categoryTable.id)
			)
			.where(whereExpr)
	]);

	const data: BillingSetupAvailableTaggingRow[] = rows.map((r) => ({
		id: r.id,
		branchId: r.branchId,
		serviceId: r.serviceId,
		validDate: r.validDate,
		serviceAmount: normalizeMoneyDecimal2dpOrNull(r.serviceAmount),
		serviceTaxAmount: normalizeMoneyDecimal2dpOrNull(r.serviceTaxAmount),
		allowEdit: r.allowEdit,
		statusId: r.statusId,
		serviceName: r.serviceName,
		serviceCode: r.serviceCode,
		categoryName: r.categoryName,
		subCategoryName: r.subCategoryName
	}));

	const total = countResult[0]?.count ?? 0;
	return {
		data,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize) || 1
	};
}

export async function linkBillingSetupServiceTaggings(
	event: RequestEvent,
	input: {
		hospitalId: string;
		careSetting: BillingSetupCareSettingEnum;
		serviceTaggingIds: number[];
	}
): Promise<{ inserted: number }> {
	await ensureCanAccessHospital(event, input.hospitalId);
	const ids = [
		...new Set(
			input.serviceTaggingIds.filter(
				(id) => Number.isFinite(id) && id > 0
			)
		)
	];
	if (ids.length === 0) throw error(400, 'serviceTaggingIds is required');

	for (const id of ids) {
		await assertTaggingBelongsToHospital(input.hospitalId, id);
	}

	const userId = event.locals.user?.id ?? null;
	let inserted = 0;
	for (const serviceTaggingId of ids) {
		const [row] = await ensureDb()
			.insert(table.billingSetupServiceTaggingTable)
			.values({
				hospitalId: input.hospitalId,
				careSetting: input.careSetting,
				serviceTaggingId,
				statusId: StatusEnum.ACTIVE,
				createdBy: userId,
				updatedBy: userId
			})
			.onConflictDoNothing()
			.returning({ id: table.billingSetupServiceTaggingTable.id });
		if (row) inserted += 1;
	}
	return { inserted };
}

export async function unlinkBillingSetupLink(
	event: RequestEvent,
	input: {
		hospitalId: string;
		careSetting: BillingSetupCareSettingEnum;
		id: number;
	}
): Promise<void> {
	await ensureCanAccessHospital(event, input.hospitalId);
	const [link] = await ensureDb()
		.select({ id: table.billingSetupServiceTaggingTable.id })
		.from(table.billingSetupServiceTaggingTable)
		.where(
			and(
				eq(table.billingSetupServiceTaggingTable.id, input.id),
				eq(
					table.billingSetupServiceTaggingTable.hospitalId,
					input.hospitalId
				),
				eq(
					table.billingSetupServiceTaggingTable.careSetting,
					input.careSetting
				)
			)
		)
		.limit(1);
	if (!link) throw error(404, 'Link not found');

	await ensureDb()
		.update(table.billingSetupServiceTaggingTable)
		.set({
			statusId: StatusEnum.INACTIVE,
			deletedAt: sql`now()`,
			deletedBy: event.locals.user?.id ?? null
		})
		.where(eq(table.billingSetupServiceTaggingTable.id, input.id));
}

/** Active links with joined tagging rows for visit-close auto bill lines. */
export async function getActiveBillingSetupTaggingsForCareSetting(input: {
	hospitalId: string;
	careSetting: BillingSetupCareSettingEnum;
	branchId: string;
}): Promise<{ linkId: number; tagging: ServiceTaggingSchema }[]> {
	const rows = await ensureDb()
		.select({
			linkId: table.billingSetupServiceTaggingTable.id,
			tagging: table.serviceTaggingTable
		})
		.from(table.billingSetupServiceTaggingTable)
		.innerJoin(
			table.serviceTaggingTable,
			eq(
				table.billingSetupServiceTaggingTable.serviceTaggingId,
				table.serviceTaggingTable.id
			)
		)
		.where(
			and(
				eq(
					table.billingSetupServiceTaggingTable.hospitalId,
					input.hospitalId
				),
				eq(
					table.billingSetupServiceTaggingTable.careSetting,
					input.careSetting
				),
				eq(
					table.billingSetupServiceTaggingTable.statusId,
					StatusEnum.ACTIVE
				),
				eq(table.serviceTaggingTable.branchId, input.branchId),
				eq(table.serviceTaggingTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.orderBy(asc(table.billingSetupServiceTaggingTable.id));

	return rows;
}
