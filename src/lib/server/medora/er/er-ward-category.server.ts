import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	ErWardCategorySchema,
	ErWardCategorySchemaInsert,
	ErWardCategorySchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { ErWardCategoryRow } from '$lib/model/type/medora/er/er.type';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { and, count, eq, ilike, ne } from 'drizzle-orm';

export async function getErWardCategoryPaginated(
	params: PaginationParams & { hospitalId: string }
): Promise<PaginatedResult<ErWardCategoryRow>> {
	const { page, pageSize, limit, offset } =
		normalizePagination(params);
	const conditions = [
		eq(table.erWardCategoryTable.hospitalId, params.hospitalId),
		ne(table.erWardCategoryTable.statusId, StatusEnum.DELETED)
	];
	const nameFilter = params?.name?.trim();
	if (nameFilter) {
		conditions.push(
			ilike(table.erWardCategoryTable.name, `%${nameFilter}%`)
		);
	}
	const codeFilter = params?.code?.trim();
	if (codeFilter) {
		conditions.push(
			ilike(table.erWardCategoryTable.code, `%${codeFilter}%`)
		);
	}
	if (typeof params?.statusId === 'number') {
		conditions.push(
			eq(table.erWardCategoryTable.statusId, params.statusId)
		);
	}
	const whereClause = and(...conditions);
	const [data, countResult] = await Promise.all([
		ensureDb()
			.select({
				id: table.erWardCategoryTable.id,
				hospitalId: table.erWardCategoryTable.hospitalId,
				name: table.erWardCategoryTable.name,
				code: table.erWardCategoryTable.code,
				wardMarkup: table.erWardCategoryTable.wardMarkup,
				statusId: table.erWardCategoryTable.statusId
			})
			.from(table.erWardCategoryTable)
			.where(whereClause)
			.orderBy(table.erWardCategoryTable.name)
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.erWardCategoryTable)
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

export async function listActiveErWardCategories(input: {
	hospitalId: string;
}): Promise<ErWardCategorySchema[]> {
	return ensureDb()
		.select()
		.from(table.erWardCategoryTable)
		.where(
			and(
				eq(table.erWardCategoryTable.hospitalId, input.hospitalId),
				eq(table.erWardCategoryTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.orderBy(table.erWardCategoryTable.name);
}

export async function getErWardCategoryById(input: {
	id: number;
}): Promise<ErWardCategorySchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.erWardCategoryTable)
		.where(
			and(
				eq(table.erWardCategoryTable.id, input.id),
				ne(table.erWardCategoryTable.statusId, StatusEnum.DELETED)
			)
		);
	return row ?? null;
}

export async function createErWardCategory(
	payload: ErWardCategorySchemaInsert
): Promise<ErWardCategorySchema> {
	const [row] = await ensureDb()
		.insert(table.erWardCategoryTable)
		.values({
			...payload,
			wardMarkup: String(payload.wardMarkup ?? '0')
		})
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updateErWardCategory(payload: {
	id: number;
	hospitalId: string;
	name?: string | null;
	code?: string | null;
	wardMarkup?: string | null;
	statusId?: number | null;
}): Promise<ErWardCategorySchema> {
	const { id, hospitalId, ...rest } = payload;
	const [row] = await ensureDb()
		.update(table.erWardCategoryTable)
		.set(rest as ErWardCategorySchemaUpdate)
		.where(
			and(
				eq(table.erWardCategoryTable.id, id),
				eq(table.erWardCategoryTable.hospitalId, hospitalId)
			)
		)
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function deleteErWardCategory(input: {
	id: number;
	hospitalId: string;
}): Promise<void> {
	await ensureDb()
		.update(table.erWardCategoryTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(
			and(
				eq(table.erWardCategoryTable.id, input.id),
				eq(table.erWardCategoryTable.hospitalId, input.hospitalId)
			)
		);
}
