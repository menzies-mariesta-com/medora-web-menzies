import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	RoomCategorySchema,
	RoomCategorySchemaInsert,
	RoomCategorySchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { RoomCategoryRow } from '$lib/model/type/medora/ipd/ipd.type';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { and, count, eq, ilike, ne } from 'drizzle-orm';

export async function getRoomCategoryPaginated(
	params: PaginationParams & { hospitalId: string }
): Promise<PaginatedResult<RoomCategoryRow>> {
	const { page, pageSize, limit, offset } =
		normalizePagination(params);
	const conditions = [
		eq(table.roomCategoryTable.hospitalId, params.hospitalId),
		ne(table.roomCategoryTable.statusId, StatusEnum.DELETED)
	];
	const nameFilter = params?.name?.trim();
	if (nameFilter) {
		conditions.push(
			ilike(table.roomCategoryTable.name, `%${nameFilter}%`)
		);
	}
	const codeFilter = params?.code?.trim();
	if (codeFilter) {
		conditions.push(
			ilike(table.roomCategoryTable.code, `%${codeFilter}%`)
		);
	}
	if (typeof params?.statusId === 'number') {
		conditions.push(
			eq(table.roomCategoryTable.statusId, params.statusId)
		);
	}
	const whereClause = and(...conditions);
	const [data, countResult] = await Promise.all([
		ensureDb()
			.select({
				id: table.roomCategoryTable.id,
				hospitalId: table.roomCategoryTable.hospitalId,
				name: table.roomCategoryTable.name,
				code: table.roomCategoryTable.code,
				roomMarkup: table.roomCategoryTable.roomMarkup,
				statusId: table.roomCategoryTable.statusId
			})
			.from(table.roomCategoryTable)
			.where(whereClause)
			.orderBy(table.roomCategoryTable.name)
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.roomCategoryTable)
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

export async function listActiveRoomCategories(input: {
	hospitalId: string;
}): Promise<RoomCategorySchema[]> {
	return ensureDb()
		.select()
		.from(table.roomCategoryTable)
		.where(
			and(
				eq(table.roomCategoryTable.hospitalId, input.hospitalId),
				eq(table.roomCategoryTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.orderBy(table.roomCategoryTable.name);
}

export async function getRoomCategoryById(input: {
	id: number;
}): Promise<RoomCategorySchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.roomCategoryTable)
		.where(
			and(
				eq(table.roomCategoryTable.id, input.id),
				ne(table.roomCategoryTable.statusId, StatusEnum.DELETED)
			)
		);
	return row ?? null;
}

export async function createRoomCategory(
	payload: RoomCategorySchemaInsert
): Promise<RoomCategorySchema> {
	const [row] = await ensureDb()
		.insert(table.roomCategoryTable)
		.values({
			...payload,
			roomMarkup: String(payload.roomMarkup ?? '0')
		})
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updateRoomCategory(payload: {
	id: number;
	hospitalId: string;
	name?: string | null;
	code?: string | null;
	roomMarkup?: string | null;
	statusId?: number | null;
}): Promise<RoomCategorySchema> {
	const { id, hospitalId, ...rest } = payload;
	const [row] = await ensureDb()
		.update(table.roomCategoryTable)
		.set(rest as RoomCategorySchemaUpdate)
		.where(
			and(
				eq(table.roomCategoryTable.id, id),
				eq(table.roomCategoryTable.hospitalId, hospitalId)
			)
		)
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function deleteRoomCategory(input: {
	id: number;
	hospitalId: string;
}): Promise<void> {
	await ensureDb()
		.update(table.roomCategoryTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(
			and(
				eq(table.roomCategoryTable.id, input.id),
				eq(table.roomCategoryTable.hospitalId, input.hospitalId)
			)
		);
}
