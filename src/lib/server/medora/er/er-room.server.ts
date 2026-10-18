import { error } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	ErRoomSchema,
	ErRoomSchemaInsert,
	ErRoomSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { ErRoomRow } from '$lib/model/type/medora/er/er.type';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { and, count, eq, ilike, ne, sql } from 'drizzle-orm';

async function assertErWardInHospital(input: {
	hospitalId: string;
	erWardId: number;
}): Promise<void> {
	const [ward] = await ensureDb()
		.select({ id: table.erWardTable.id })
		.from(table.erWardTable)
		.where(
			and(
				eq(table.erWardTable.id, input.erWardId),
				eq(table.erWardTable.hospitalId, input.hospitalId),
				ne(table.erWardTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!ward) throw error(400, 'Ward not found for this hospital');
}

async function assertCategoryInHospital(input: {
	hospitalId: string;
	erRoomCategoryId: number;
}): Promise<void> {
	const [cat] = await ensureDb()
		.select({ id: table.erRoomCategoryTable.id })
		.from(table.erRoomCategoryTable)
		.where(
			and(
				eq(table.erRoomCategoryTable.id, input.erRoomCategoryId),
				eq(table.erRoomCategoryTable.hospitalId, input.hospitalId),
				ne(table.erRoomCategoryTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!cat) {
		throw error(400, 'Room category not found for this hospital');
	}
}

export async function getErRoomPaginated(
	params: PaginationParams & {
		hospitalId: string;
		wardId?: number;
		erRoomCategoryId?: number;
	}
): Promise<PaginatedResult<ErRoomRow>> {
	const { page, pageSize, limit, offset } =
		normalizePagination(params);
	const conditions = [
		eq(table.erRoomTable.hospitalId, params.hospitalId),
		ne(table.erRoomTable.statusId, StatusEnum.DELETED)
	];
	const nameFilter = params?.name?.trim();
	if (nameFilter) {
		conditions.push(ilike(table.erRoomTable.name, `%${nameFilter}%`));
	}
	const codeFilter = params?.code?.trim();
	if (codeFilter) {
		conditions.push(ilike(table.erRoomTable.code, `%${codeFilter}%`));
	}
	if (typeof params?.statusId === 'number') {
		conditions.push(eq(table.erRoomTable.statusId, params.statusId));
	}
	if (typeof params.erWardId === 'number') {
		conditions.push(eq(table.erRoomTable.erWardId, params.erWardId));
	}
	if (typeof params.erRoomCategoryId === 'number') {
		conditions.push(
			eq(table.erRoomTable.erRoomCategoryId, params.erRoomCategoryId)
		);
	}
	const whereClause = and(...conditions);
	const bedCountSq = ensureDb()
		.select({
			roomId: table.erBedTable.erRoomId,
			cnt: count().as('cnt')
		})
		.from(table.erBedTable)
		.where(ne(table.erBedTable.statusId, StatusEnum.DELETED))
		.groupBy(table.erBedTable.erRoomId)
		.as('bed_counts');

	const [data, countResult] = await Promise.all([
		ensureDb()
			.select({
				id: table.erRoomTable.id,
				hospitalId: table.erRoomTable.hospitalId,
				wardId: table.erRoomTable.erWardId,
				erRoomCategoryId: table.erRoomTable.erRoomCategoryId,
				name: table.erRoomTable.name,
				code: table.erRoomTable.code,
				capacity: table.erRoomTable.capacity,
				amenities: table.erRoomTable.amenities,
				statusId: table.erRoomTable.statusId,
				wardName: table.erWardTable.name,
				wardCode: table.erWardTable.code,
				roomCategoryName: table.erRoomCategoryTable.name,
				roomMarkup: table.erRoomCategoryTable.roomMarkup,
				bedCount: sql<number>`coalesce(${bedCountSq.cnt}, 0)`.mapWith(
					Number
				)
			})
			.from(table.erRoomTable)
			.leftJoin(
				table.erWardTable,
				eq(table.erRoomTable.erWardId, table.erWardTable.id)
			)
			.leftJoin(
				table.erRoomCategoryTable,
				eq(
					table.erRoomTable.erRoomCategoryId,
					table.erRoomCategoryTable.id
				)
			)
			.leftJoin(bedCountSq, eq(bedCountSq.roomId, table.erRoomTable.id))
			.where(whereClause)
			.orderBy(table.erRoomTable.name)
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.erRoomTable)
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

export async function listActiveErRooms(input: {
	hospitalId: string;
	erWardId?: number | null;
}): Promise<ErRoomSchema[]> {
	const conditions = [
		eq(table.erRoomTable.hospitalId, input.hospitalId),
		eq(table.erRoomTable.statusId, StatusEnum.ACTIVE)
	];
	if (typeof input.erWardId === 'number') {
		conditions.push(eq(table.erRoomTable.erWardId, input.erWardId));
	}
	return ensureDb()
		.select()
		.from(table.erRoomTable)
		.where(and(...conditions))
		.orderBy(table.erRoomTable.name);
}

export async function getErRoomById(input: {
	id: number;
}): Promise<ErRoomSchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.erRoomTable)
		.where(
			and(
				eq(table.erRoomTable.id, input.id),
				ne(table.erRoomTable.statusId, StatusEnum.DELETED)
			)
		);
	return row ?? null;
}

export async function countActiveBedsInErRoom(input: {
	erRoomId: number;
}): Promise<number> {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.erBedTable)
		.where(
			and(
				eq(table.erBedTable.erRoomId, input.erRoomId),
				ne(table.erBedTable.statusId, StatusEnum.DELETED)
			)
		);
	return row?.count ?? 0;
}

/** Keep room.capacity = count of non-deleted beds in the room. */
export async function syncErRoomCapacityFromBeds(input: {
	erRoomId: number;
}): Promise<void> {
	const bedCount = await countActiveBedsInErRoom({
		erRoomId: input.erRoomId
	});
	await ensureDb()
		.update(table.erRoomTable)
		.set({ capacity: bedCount })
		.where(eq(table.erRoomTable.id, input.erRoomId));
}

export async function createErRoom(
	payload: Omit<ErRoomSchemaInsert, 'capacity'> & {
		capacity?: number | null;
	}
): Promise<ErRoomSchema> {
	await assertErWardInHospital({
		hospitalId: payload.hospitalId,
		erWardId: payload.erWardId
	});
	await assertCategoryInHospital({
		hospitalId: payload.hospitalId,
		erRoomCategoryId: payload.erRoomCategoryId
	});
	const [row] = await ensureDb()
		.insert(table.erRoomTable)
		.values({
			...payload,
			/** Empty room until beds are assigned. */
			capacity: 0
		})
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updateErRoom(payload: {
	id: number;
	hospitalId: string;
	erWardId?: number;
	erRoomCategoryId?: number;
	name?: string | null;
	code?: string | null;
	amenities?: string | null;
	statusId?: number | null;
}): Promise<ErRoomSchema> {
	const { id, hospitalId, ...rest } = payload;
	if (typeof rest.erWardId === 'number') {
		await assertErWardInHospital({
			hospitalId,
			erWardId: rest.erWardId
		});
	}
	if (typeof rest.erRoomCategoryId === 'number') {
		await assertCategoryInHospital({
			hospitalId,
			erRoomCategoryId: rest.erRoomCategoryId
		});
	}
	const [row] = await ensureDb()
		.update(table.erRoomTable)
		.set(rest as ErRoomSchemaUpdate)
		.where(
			and(
				eq(table.erRoomTable.id, id),
				eq(table.erRoomTable.hospitalId, hospitalId)
			)
		)
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function deleteErRoom(input: {
	id: number;
	hospitalId: string;
}): Promise<void> {
	await ensureDb()
		.update(table.erRoomTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(
			and(
				eq(table.erRoomTable.id, input.id),
				eq(table.erRoomTable.hospitalId, input.hospitalId)
			)
		);
}
