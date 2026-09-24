import { error } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	RoomSchema,
	RoomSchemaInsert,
	RoomSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { RoomRow } from '$lib/model/type/medora/ipd/ipd.type';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { and, count, eq, ilike, ne, sql } from 'drizzle-orm';

async function assertWardInHospital(input: {
	hospitalId: string;
	wardId: number;
}): Promise<void> {
	const [ward] = await ensureDb()
		.select({ id: table.wardTable.id })
		.from(table.wardTable)
		.where(
			and(
				eq(table.wardTable.id, input.wardId),
				eq(table.wardTable.hospitalId, input.hospitalId),
				ne(table.wardTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!ward) throw error(400, 'Ward not found for this hospital');
}

async function assertCategoryInHospital(input: {
	hospitalId: string;
	roomCategoryId: number;
}): Promise<void> {
	const [cat] = await ensureDb()
		.select({ id: table.roomCategoryTable.id })
		.from(table.roomCategoryTable)
		.where(
			and(
				eq(table.roomCategoryTable.id, input.roomCategoryId),
				eq(table.roomCategoryTable.hospitalId, input.hospitalId),
				ne(table.roomCategoryTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!cat) {
		throw error(400, 'Room category not found for this hospital');
	}
}

export async function getRoomPaginated(
	params: PaginationParams & {
		hospitalId: string;
		wardId?: number;
		roomCategoryId?: number;
	}
): Promise<PaginatedResult<RoomRow>> {
	const { page, pageSize, limit, offset } =
		normalizePagination(params);
	const conditions = [
		eq(table.roomTable.hospitalId, params.hospitalId),
		ne(table.roomTable.statusId, StatusEnum.DELETED)
	];
	const nameFilter = params?.name?.trim();
	if (nameFilter) {
		conditions.push(ilike(table.roomTable.name, `%${nameFilter}%`));
	}
	const codeFilter = params?.code?.trim();
	if (codeFilter) {
		conditions.push(ilike(table.roomTable.code, `%${codeFilter}%`));
	}
	if (typeof params?.statusId === 'number') {
		conditions.push(eq(table.roomTable.statusId, params.statusId));
	}
	if (typeof params.wardId === 'number') {
		conditions.push(eq(table.roomTable.wardId, params.wardId));
	}
	if (typeof params.roomCategoryId === 'number') {
		conditions.push(
			eq(table.roomTable.roomCategoryId, params.roomCategoryId)
		);
	}
	const whereClause = and(...conditions);
	const bedCountSq = ensureDb()
		.select({
			roomId: table.bedTable.roomId,
			cnt: count().as('cnt')
		})
		.from(table.bedTable)
		.where(ne(table.bedTable.statusId, StatusEnum.DELETED))
		.groupBy(table.bedTable.roomId)
		.as('bed_counts');

	const [data, countResult] = await Promise.all([
		ensureDb()
			.select({
				id: table.roomTable.id,
				hospitalId: table.roomTable.hospitalId,
				wardId: table.roomTable.wardId,
				roomCategoryId: table.roomTable.roomCategoryId,
				name: table.roomTable.name,
				code: table.roomTable.code,
				capacity: table.roomTable.capacity,
				amenities: table.roomTable.amenities,
				statusId: table.roomTable.statusId,
				wardName: table.wardTable.name,
				wardCode: table.wardTable.code,
				roomCategoryName: table.roomCategoryTable.name,
				roomMarkup: table.roomCategoryTable.roomMarkup,
				bedCount: sql<number>`coalesce(${bedCountSq.cnt}, 0)`.mapWith(
					Number
				)
			})
			.from(table.roomTable)
			.leftJoin(
				table.wardTable,
				eq(table.roomTable.wardId, table.wardTable.id)
			)
			.leftJoin(
				table.roomCategoryTable,
				eq(
					table.roomTable.roomCategoryId,
					table.roomCategoryTable.id
				)
			)
			.leftJoin(bedCountSq, eq(bedCountSq.roomId, table.roomTable.id))
			.where(whereClause)
			.orderBy(table.roomTable.name)
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.roomTable)
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

export async function listActiveRooms(input: {
	hospitalId: string;
	wardId?: number | null;
}): Promise<RoomSchema[]> {
	const conditions = [
		eq(table.roomTable.hospitalId, input.hospitalId),
		eq(table.roomTable.statusId, StatusEnum.ACTIVE)
	];
	if (typeof input.wardId === 'number') {
		conditions.push(eq(table.roomTable.wardId, input.wardId));
	}
	return ensureDb()
		.select()
		.from(table.roomTable)
		.where(and(...conditions))
		.orderBy(table.roomTable.name);
}

export async function getRoomById(input: {
	id: number;
}): Promise<RoomSchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.roomTable)
		.where(
			and(
				eq(table.roomTable.id, input.id),
				ne(table.roomTable.statusId, StatusEnum.DELETED)
			)
		);
	return row ?? null;
}

export async function countActiveBedsInRoom(input: {
	roomId: number;
}): Promise<number> {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.bedTable)
		.where(
			and(
				eq(table.bedTable.roomId, input.roomId),
				ne(table.bedTable.statusId, StatusEnum.DELETED)
			)
		);
	return row?.count ?? 0;
}

/** Keep room.capacity = count of non-deleted beds in the room. */
export async function syncRoomCapacityFromBeds(input: {
	roomId: number;
}): Promise<void> {
	const bedCount = await countActiveBedsInRoom({
		roomId: input.roomId
	});
	await ensureDb()
		.update(table.roomTable)
		.set({ capacity: bedCount })
		.where(eq(table.roomTable.id, input.roomId));
}

export async function createRoom(
	payload: Omit<RoomSchemaInsert, 'capacity'> & {
		capacity?: number | null;
	}
): Promise<RoomSchema> {
	await assertWardInHospital({
		hospitalId: payload.hospitalId,
		wardId: payload.wardId
	});
	await assertCategoryInHospital({
		hospitalId: payload.hospitalId,
		roomCategoryId: payload.roomCategoryId
	});
	const [row] = await ensureDb()
		.insert(table.roomTable)
		.values({
			...payload,
			/** Empty room until beds are assigned. */
			capacity: 0
		})
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updateRoom(payload: {
	id: number;
	hospitalId: string;
	wardId?: number;
	roomCategoryId?: number;
	name?: string | null;
	code?: string | null;
	amenities?: string | null;
	statusId?: number | null;
}): Promise<RoomSchema> {
	const { id, hospitalId, ...rest } = payload;
	if (typeof rest.wardId === 'number') {
		await assertWardInHospital({ hospitalId, wardId: rest.wardId });
	}
	if (typeof rest.roomCategoryId === 'number') {
		await assertCategoryInHospital({
			hospitalId,
			roomCategoryId: rest.roomCategoryId
		});
	}
	const [row] = await ensureDb()
		.update(table.roomTable)
		.set(rest as RoomSchemaUpdate)
		.where(
			and(
				eq(table.roomTable.id, id),
				eq(table.roomTable.hospitalId, hospitalId)
			)
		)
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function deleteRoom(input: {
	id: number;
	hospitalId: string;
}): Promise<void> {
	await ensureDb()
		.update(table.roomTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(
			and(
				eq(table.roomTable.id, input.id),
				eq(table.roomTable.hospitalId, input.hospitalId)
			)
		);
}
