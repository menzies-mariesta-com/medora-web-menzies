import { ensureDb } from '$lib/server/db';
import { notifyHospitalMasterWrite } from '$lib/server/cache/notify-master-write.server';
import * as table from '$lib/server/db/schema';
import type {
	WardCategorySchema,
	WardCategorySchemaInsert,
	WardCategorySchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { WardCategoryRow } from '$lib/model/type/medora/ipd/ipd.type';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { and, count, eq, ilike, ne } from 'drizzle-orm';
import { careSettingScopeCondition } from '$lib/server/medora/ipd/master-care-setting.util';
import type { CareSettingEnum } from '$lib/model/enum/care-setting.enum';
import { paginatedEntityStatusEq } from '$lib/server/medora/paginated-entity-status-filter.server';

export async function getWardCategoryPaginated(
	params: PaginationParams & {
		hospitalId: string;
		careSetting?: CareSettingEnum;
	}
): Promise<PaginatedResult<WardCategoryRow>> {
	const { page, pageSize, limit, offset } =
		normalizePagination(params);
	const conditions = [
		eq(table.wardCategoryTable.hospitalId, params.hospitalId),
		paginatedEntityStatusEq(
			table.wardCategoryTable.statusId,
			params.statusId
		)
	];
	const nameFilter = params?.name?.trim();
	if (nameFilter) {
		conditions.push(
			ilike(table.wardCategoryTable.name, `%${nameFilter}%`)
		);
	}
	const codeFilter = params?.code?.trim();
	if (codeFilter) {
		conditions.push(
			ilike(table.wardCategoryTable.code, `%${codeFilter}%`)
		);
	}
	const careSettingCond = careSettingScopeCondition(
		table.wardCategoryTable,
		params.careSetting
	);
	if (careSettingCond) conditions.push(careSettingCond);
	const whereClause = and(...conditions);
	const [data, countResult] = await Promise.all([
		ensureDb()
			.select({
				id: table.wardCategoryTable.id,
				hospitalId: table.wardCategoryTable.hospitalId,
				name: table.wardCategoryTable.name,
				code: table.wardCategoryTable.code,
				wardMarkup: table.wardCategoryTable.wardMarkup,
				statusId: table.wardCategoryTable.statusId
			})
			.from(table.wardCategoryTable)
			.where(whereClause)
			.orderBy(table.wardCategoryTable.name)
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.wardCategoryTable)
			.where(whereClause)
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

export async function listActiveWardCategories(input: {
	hospitalId: string;
	careSetting?: CareSettingEnum;
}): Promise<WardCategorySchema[]> {
	const conditions = [
		eq(table.wardCategoryTable.hospitalId, input.hospitalId),
		eq(table.wardCategoryTable.statusId, StatusEnum.ACTIVE)
	];
	const careSettingCond = careSettingScopeCondition(
		table.wardCategoryTable,
		input.careSetting
	);
	if (careSettingCond) conditions.push(careSettingCond);
	return ensureDb()
		.select()
		.from(table.wardCategoryTable)
		.where(and(...conditions))
		.orderBy(table.wardCategoryTable.name);
}

export async function getWardCategoryById(input: {
	id: number;
}): Promise<WardCategorySchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.wardCategoryTable)
		.where(
			and(
				eq(table.wardCategoryTable.id, input.id),
				ne(table.wardCategoryTable.statusId, StatusEnum.DELETED)
			)
		);
	return row ?? null;
}

export async function createWardCategory(
	payload: WardCategorySchemaInsert
): Promise<WardCategorySchema> {
	const [row] = await ensureDb()
		.insert(table.wardCategoryTable)
		.values({
			...payload,
			wardMarkup: String(payload.wardMarkup ?? '0')
		})
		.returning();
	if (!row) throw new Error('Insert failed');
	void notifyHospitalMasterWrite(payload.hospitalId);

	return row;
}

export async function updateWardCategory(payload: {
	id: number;
	hospitalId: string;
	name?: string | null;
	code?: string | null;
	wardMarkup?: string | null;
	careSetting?: CareSettingEnum;
	statusId?: number | null;
}): Promise<WardCategorySchema> {
	const { id, hospitalId, ...rest } = payload;
	const [row] = await ensureDb()
		.update(table.wardCategoryTable)
		.set(rest as WardCategorySchemaUpdate)
		.where(
			and(
				eq(table.wardCategoryTable.id, id),
				eq(table.wardCategoryTable.hospitalId, hospitalId)
			)
		)
		.returning();
	if (!row) throw new Error('Update failed');
	void notifyHospitalMasterWrite(hospitalId);

	return row;
}

export async function deleteWardCategory(input: {
	id: number;
	hospitalId: string;
}): Promise<void> {
	await ensureDb()
		.update(table.wardCategoryTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(
			and(
				eq(table.wardCategoryTable.id, input.id),
				eq(table.wardCategoryTable.hospitalId, input.hospitalId)
			)
		);
}
