import { error } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	BedSchema,
	BedSchemaInsert,
	BedSchemaUpdate
} from '$lib/server/db/schema-type';
import {
	IpdBedStatusEnum,
	StatusEnum
} from '$lib/model/enum/db-link';
import type { BedRow } from '$lib/model/type/medora/ipd/ipd.type';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { and, count, eq, ilike, ne, sql } from 'drizzle-orm';
import { syncRoomCapacityFromBeds } from '$lib/server/medora/ipd/room.server';

async function assertRoomInHospital(input: {
	hospitalId: string;
	roomId: number;
}): Promise<void> {
	const [room] = await ensureDb()
		.select({ id: table.roomTable.id })
		.from(table.roomTable)
		.where(
			and(
				eq(table.roomTable.id, input.roomId),
				eq(table.roomTable.hospitalId, input.hospitalId),
				ne(table.roomTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!room) throw error(400, 'Room not found for this hospital');
}

export async function getBedPaginated(
	params: PaginationParams & {
		hospitalId: string;
		wardId?: number;
		roomId?: number;
		bedStatus?: number;
	}
): Promise<PaginatedResult<BedRow>> {
	const { page, pageSize, limit, offset } =
		normalizePagination(params);
	const conditions = [
		eq(table.bedTable.hospitalId, params.hospitalId),
		ne(table.bedTable.statusId, StatusEnum.DELETED)
	];
	const nameFilter = params?.name?.trim();
	if (nameFilter) {
		conditions.push(ilike(table.bedTable.name, `%${nameFilter}%`));
	}
	const codeFilter = params?.code?.trim();
	if (codeFilter) {
		conditions.push(ilike(table.bedTable.code, `%${codeFilter}%`));
	}
	if (typeof params?.statusId === 'number') {
		conditions.push(eq(table.bedTable.statusId, params.statusId));
	}
	if (typeof params.roomId === 'number') {
		conditions.push(eq(table.bedTable.roomId, params.roomId));
	}
	if (typeof params.wardId === 'number') {
		conditions.push(eq(table.roomTable.wardId, params.wardId));
	}
	if (typeof params.bedStatus === 'number') {
		conditions.push(eq(table.bedTable.bedStatus, params.bedStatus));
	}
	const whereClause = and(...conditions);
	const [data, countResult] = await Promise.all([
		ensureDb()
			.select({
				id: table.bedTable.id,
				roomId: table.bedTable.roomId,
				hospitalId: table.bedTable.hospitalId,
				name: table.bedTable.name,
				code: table.bedTable.code,
				basePrice: table.bedTable.basePrice,
				bedStatus: table.bedTable.bedStatus,
				statusId: table.bedTable.statusId,
				roomName: table.roomTable.name,
				roomCode: table.roomTable.code,
				wardId: table.wardTable.id,
				wardName: table.wardTable.name,
				wardCode: table.wardTable.code,
				dailyTariff: sql<string>`(
					coalesce(${table.bedTable.basePrice}, 0)
					* (1 + coalesce(${table.roomCategoryTable.roomMarkup}, 0) / 100.0)
					* (1 + coalesce(${table.wardCategoryTable.wardMarkup}, 0) / 100.0)
				)::text`
			})
			.from(table.bedTable)
			.innerJoin(
				table.roomTable,
				eq(table.bedTable.roomId, table.roomTable.id)
			)
			.innerJoin(
				table.roomCategoryTable,
				eq(
					table.roomTable.roomCategoryId,
					table.roomCategoryTable.id
				)
			)
			.innerJoin(
				table.wardTable,
				eq(table.roomTable.wardId, table.wardTable.id)
			)
			.innerJoin(
				table.wardCategoryTable,
				eq(
					table.wardTable.wardCategoryId,
					table.wardCategoryTable.id
				)
			)
			.where(whereClause)
			.orderBy(table.bedTable.name)
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.bedTable)
			.innerJoin(
				table.roomTable,
				eq(table.bedTable.roomId, table.roomTable.id)
			)
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

export async function listFreeBeds(input: {
	hospitalId: string;
	wardId?: number;
	roomId?: number;
}): Promise<
	Array<
		BedSchema & {
			roomName: string | null;
			wardId: number;
			wardName: string | null;
			dailyTariff: string;
		}
	>
> {
	const conditions = [
		eq(table.bedTable.hospitalId, input.hospitalId),
		eq(table.bedTable.bedStatus, IpdBedStatusEnum.FREE),
		eq(table.bedTable.statusId, StatusEnum.ACTIVE),
		eq(table.roomTable.statusId, StatusEnum.ACTIVE),
		eq(table.roomCategoryTable.statusId, StatusEnum.ACTIVE),
		eq(table.wardTable.statusId, StatusEnum.ACTIVE),
		eq(table.wardCategoryTable.statusId, StatusEnum.ACTIVE)
	];
	if (typeof input.roomId === 'number') {
		conditions.push(eq(table.bedTable.roomId, input.roomId));
	}
	if (typeof input.wardId === 'number') {
		conditions.push(eq(table.roomTable.wardId, input.wardId));
	}
	const rows = await ensureDb()
		.select({
			id: table.bedTable.id,
			roomId: table.bedTable.roomId,
			hospitalId: table.bedTable.hospitalId,
			name: table.bedTable.name,
			code: table.bedTable.code,
			basePrice: table.bedTable.basePrice,
			bedStatus: table.bedTable.bedStatus,
			statusId: table.bedTable.statusId,
			createdAt: table.bedTable.createdAt,
			updatedAt: table.bedTable.updatedAt,
			deletedAt: table.bedTable.deletedAt,
			createdBy: table.bedTable.createdBy,
			updatedBy: table.bedTable.updatedBy,
			deletedBy: table.bedTable.deletedBy,
			roomName: table.roomTable.name,
			wardId: table.wardTable.id,
			wardName: table.wardTable.name,
			dailyTariff: sql<string>`(
				coalesce(${table.bedTable.basePrice}, 0)
				* (1 + coalesce(${table.roomCategoryTable.roomMarkup}, 0) / 100.0)
				* (1 + coalesce(${table.wardCategoryTable.wardMarkup}, 0) / 100.0)
			)::text`
		})
		.from(table.bedTable)
		.innerJoin(
			table.roomTable,
			eq(table.bedTable.roomId, table.roomTable.id)
		)
		.innerJoin(
			table.roomCategoryTable,
			eq(
				table.roomTable.roomCategoryId,
				table.roomCategoryTable.id
			)
		)
		.innerJoin(
			table.wardTable,
			eq(table.roomTable.wardId, table.wardTable.id)
		)
		.innerJoin(
			table.wardCategoryTable,
			eq(
				table.wardTable.wardCategoryId,
				table.wardCategoryTable.id
			)
		)
		.where(and(...conditions))
		.orderBy(table.bedTable.name);
	return rows;
}

export async function getBedById(input: {
	id: number;
}): Promise<BedSchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.bedTable)
		.where(
			and(
				eq(table.bedTable.id, input.id),
				ne(table.bedTable.statusId, StatusEnum.DELETED)
			)
		);
	return row ?? null;
}

export async function createBed(
	payload: BedSchemaInsert
): Promise<BedSchema> {
	await assertRoomInHospital({
		hospitalId: payload.hospitalId,
		roomId: payload.roomId
	});
	const [row] = await ensureDb()
		.insert(table.bedTable)
		.values({
			...payload,
			basePrice: String(payload.basePrice ?? '0'),
			bedStatus: payload.bedStatus ?? IpdBedStatusEnum.FREE
		})
		.returning();
	if (!row) throw new Error('Insert failed');
	await syncRoomCapacityFromBeds({ roomId: payload.roomId });
	return row;
}

export async function updateBed(payload: {
	id: number;
	hospitalId: string;
	roomId?: number;
	name?: string | null;
	code?: string | null;
	basePrice?: string | null;
	bedStatus?: number | null;
	statusId?: number | null;
}): Promise<BedSchema> {
	const { id, hospitalId, ...rest } = payload;
	const [current] = await ensureDb()
		.select({ roomId: table.bedTable.roomId })
		.from(table.bedTable)
		.where(
			and(
				eq(table.bedTable.id, id),
				eq(table.bedTable.hospitalId, hospitalId)
			)
		)
		.limit(1);
	if (!current) throw error(404, 'Bed not found');

	const previousRoomId = current.roomId;
	if (typeof rest.roomId === 'number') {
		await assertRoomInHospital({
			hospitalId,
			roomId: rest.roomId
		});
	}
	const [row] = await ensureDb()
		.update(table.bedTable)
		.set(rest as BedSchemaUpdate)
		.where(
			and(
				eq(table.bedTable.id, id),
				eq(table.bedTable.hospitalId, hospitalId)
			)
		)
		.returning();
	if (!row) throw new Error('Update failed');

	const nextRoomId = row.roomId;
	await syncRoomCapacityFromBeds({ roomId: nextRoomId });
	if (previousRoomId !== nextRoomId) {
		await syncRoomCapacityFromBeds({ roomId: previousRoomId });
	}
	return row;
}

export async function deleteBed(input: { id: number }): Promise<void> {
	const [current] = await ensureDb()
		.select({ roomId: table.bedTable.roomId })
		.from(table.bedTable)
		.where(eq(table.bedTable.id, input.id))
		.limit(1);
	await ensureDb()
		.update(table.bedTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(eq(table.bedTable.id, input.id));
	if (current) {
		await syncRoomCapacityFromBeds({ roomId: current.roomId });
	}
}

export async function markBedAvailable(input: {
	id: number;
	hospitalId: string;
}): Promise<BedSchema> {
	const [bed] = await ensureDb()
		.select()
		.from(table.bedTable)
		.where(
			and(
				eq(table.bedTable.id, input.id),
				eq(table.bedTable.hospitalId, input.hospitalId),
				ne(table.bedTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!bed) throw error(404, 'Bed not found');
	if (bed.bedStatus === IpdBedStatusEnum.OCCUPIED) {
		throw error(400, 'Cannot mark an occupied bed as available');
	}
	const [row] = await ensureDb()
		.update(table.bedTable)
		.set({ bedStatus: IpdBedStatusEnum.FREE })
		.where(eq(table.bedTable.id, input.id))
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function markBedCleaning(input: {
	id: number;
	hospitalId: string;
}): Promise<BedSchema> {
	const [row] = await ensureDb()
		.update(table.bedTable)
		.set({ bedStatus: IpdBedStatusEnum.CLEANING })
		.where(
			and(
				eq(table.bedTable.id, input.id),
				eq(table.bedTable.hospitalId, input.hospitalId)
			)
		)
		.returning();
	if (!row) throw error(404, 'Bed not found');
	return row;
}
