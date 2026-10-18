import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	ErRoomCategorySchema,
	ErRoomCategorySchemaInsert,
	ErRoomCategorySchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { ErRoomCategoryRow } from '$lib/model/type/medora/er/er.type';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { and, count, eq, ilike, ne } from 'drizzle-orm';

export async function getErRoomCategoryPaginated(
	params: PaginationParams & { hospitalId: string }
): Promise<PaginatedResult<ErRoomCategoryRow>> {
	const { page, pageSize, limit, offset } =
		normalizePagination(params);
	const conditions = [
		eq(table.erRoomCategoryTable.hospitalId, params.hospitalId),
		ne(table.erRoomCategoryTable.statusId, StatusEnum.DELETED)
	];
	const nameFilter = params?.name?.trim();
	if (nameFilter) {
		conditions.push(
			ilike(table.erRoomCategoryTable.name, `%${nameFilter}%`)
		);
	}
	const codeFilter = params?.code?.trim();
	if (codeFilter) {
		conditions.push(
			ilike(table.erRoomCategoryTable.code, `%${codeFilter}%`)
		);
	}
	if (typeof params?.statusId === 'number') {
		conditions.push(
			eq(table.erRoomCategoryTable.statusId, params.statusId)
		);
	}
	const whereClause = and(...conditions);
	const [data, countResult] = await Promise.all([
		ensureDb()
			.select({
				id: table.erRoomCategoryTable.id,
				hospitalId: table.erRoomCategoryTable.hospitalId,
				name: table.erRoomCategoryTable.name,
				code: table.erRoomCategoryTable.code,
				roomMarkup: table.erRoomCategoryTable.roomMarkup,
				statusId: table.erRoomCategoryTable.statusId
			})
			.from(table.erRoomCategoryTable)
			.where(whereClause)
			.orderBy(table.erRoomCategoryTable.name)
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.erRoomCategoryTable)
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

export async function listActiveErRoomCategories(input: {
	hospitalId: string;
}): Promise<ErRoomCategorySchema[]> {
	return ensureDb()
		.select()
		.from(table.erRoomCategoryTable)
		.where(
			and(
				eq(table.erRoomCategoryTable.hospitalId, input.hospitalId),
				eq(table.erRoomCategoryTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.orderBy(table.erRoomCategoryTable.name);
}

export async function getErRoomCategoryById(input: {
	id: number;
}): Promise<ErRoomCategorySchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.erRoomCategoryTable)
		.where(
			and(
				eq(table.erRoomCategoryTable.id, input.id),
				ne(table.erRoomCategoryTable.statusId, StatusEnum.DELETED)
			)
		);
	return row ?? null;
}

export async function createErRoomCategory(
	payload: ErRoomCategorySchemaInsert
): Promise<ErRoomCategorySchema> {
	const [row] = await ensureDb()
		.insert(table.erRoomCategoryTable)
		.values({
			...payload,
			roomMarkup: String(payload.roomMarkup ?? '0')
		})
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updateErRoomCategory(payload: {
	id: number;
	hospitalId: string;
	name?: string | null;
	code?: string | null;
	roomMarkup?: string | null;
	statusId?: number | null;
}): Promise<ErRoomCategorySchema> {
	const { id, hospitalId, ...rest } = payload;
	const [row] = await ensureDb()
		.update(table.erRoomCategoryTable)
		.set(rest as ErRoomCategorySchemaUpdate)
		.where(
			and(
				eq(table.erRoomCategoryTable.id, id),
				eq(table.erRoomCategoryTable.hospitalId, hospitalId)
			)
		)
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function deleteErRoomCategory(input: {
	id: number;
	hospitalId: string;
}): Promise<void> {
	await ensureDb()
		.update(table.erRoomCategoryTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(
			and(
				eq(table.erRoomCategoryTable.id, input.id),
				eq(table.erRoomCategoryTable.hospitalId, input.hospitalId)
			)
		);
}
