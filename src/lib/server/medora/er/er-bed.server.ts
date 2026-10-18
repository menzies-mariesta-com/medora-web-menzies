import { error } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	ErBedSchema,
	ErBedSchemaInsert,
	ErBedSchemaUpdate
} from '$lib/server/db/schema-type';
import {
	BillingStatusTaggingEnum,
	IpdAdmissionStatusEnum,
	IpdBedStatusEnum,
	StatusEnum
} from '$lib/model/enum/db-link';
import type { ErBedRow } from '$lib/model/type/medora/er/er.type';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { and, count, desc, eq, ilike, ne, sql } from 'drizzle-orm';
import { syncErRoomCapacityFromBeds } from '$lib/server/medora/er/er-room.server';

async function assertErRoomInHospital(input: {
	hospitalId: string;
	erRoomId: number;
}): Promise<void> {
	const [room] = await ensureDb()
		.select({ id: table.erRoomTable.id })
		.from(table.erRoomTable)
		.where(
			and(
				eq(table.erRoomTable.id, input.erRoomId),
				eq(table.erRoomTable.hospitalId, input.hospitalId),
				ne(table.erRoomTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!room) throw error(400, 'Room not found for this hospital');
}

export async function getErBedPaginated(
	params: PaginationParams & {
		hospitalId: string;
		erWardId?: number;
		erRoomId?: number;
		bedStatus?: number;
	}
): Promise<PaginatedResult<ErBedRow>> {
	const { page, pageSize, limit, offset } =
		normalizePagination(params);
	const conditions = [
		eq(table.erBedTable.hospitalId, params.hospitalId),
		ne(table.erBedTable.statusId, StatusEnum.DELETED)
	];
	const nameFilter = params?.name?.trim();
	if (nameFilter) {
		conditions.push(ilike(table.erBedTable.name, `%${nameFilter}%`));
	}
	const codeFilter = params?.code?.trim();
	if (codeFilter) {
		conditions.push(ilike(table.erBedTable.code, `%${codeFilter}%`));
	}
	if (typeof params?.statusId === 'number') {
		conditions.push(eq(table.erBedTable.statusId, params.statusId));
	}
	if (typeof params.erRoomId === 'number') {
		conditions.push(eq(table.erBedTable.erRoomId, params.erRoomId));
	}
	if (typeof params.erWardId === 'number') {
		conditions.push(eq(table.erRoomTable.erWardId, params.erWardId));
	}
	if (typeof params.bedStatus === 'number') {
		conditions.push(eq(table.erBedTable.bedStatus, params.bedStatus));
	}
	const whereClause = and(...conditions);
	const [data, countResult] = await Promise.all([
		ensureDb()
			.select({
				id: table.erBedTable.id,
				roomId: table.erBedTable.erRoomId,
				hospitalId: table.erBedTable.hospitalId,
				name: table.erBedTable.name,
				code: table.erBedTable.code,
				basePrice: table.erBedTable.basePrice,
				bedStatus: table.erBedTable.bedStatus,
				statusId: table.erBedTable.statusId,
				roomName: table.erRoomTable.name,
				roomCode: table.erRoomTable.code,
				wardId: table.erWardTable.id,
				wardName: table.erWardTable.name,
				wardCode: table.erWardTable.code,
				dailyTariff: sql<string>`(
					coalesce(${table.erBedTable.basePrice}, 0)
					* (1 + coalesce(${table.erRoomCategoryTable.roomMarkup}, 0) / 100.0)
					* (1 + coalesce(${table.erWardCategoryTable.wardMarkup}, 0) / 100.0)
				)::text`
			})
			.from(table.erBedTable)
			.innerJoin(
				table.erRoomTable,
				eq(table.erBedTable.erRoomId, table.erRoomTable.id)
			)
			.innerJoin(
				table.erRoomCategoryTable,
				eq(
					table.erRoomTable.erRoomCategoryId,
					table.erRoomCategoryTable.id
				)
			)
			.innerJoin(
				table.erWardTable,
				eq(table.erRoomTable.erWardId, table.erWardTable.id)
			)
			.innerJoin(
				table.erWardCategoryTable,
				eq(
					table.erWardTable.erWardCategoryId,
					table.erWardCategoryTable.id
				)
			)
			.where(whereClause)
			.orderBy(table.erBedTable.name)
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.erBedTable)
			.innerJoin(
				table.erRoomTable,
				eq(table.erBedTable.erRoomId, table.erRoomTable.id)
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

export async function listFreeErBeds(input: {
	hospitalId: string;
	erWardId?: number;
	erRoomId?: number;
}): Promise<
	Array<
		ErBedSchema & {
			roomName: string | null;
			wardId: number;
			wardName: string | null;
			dailyTariff: string;
		}
	>
> {
	const conditions = [
		eq(table.erBedTable.hospitalId, input.hospitalId),
		eq(table.erBedTable.bedStatus, IpdBedStatusEnum.FREE),
		eq(table.erBedTable.statusId, StatusEnum.ACTIVE),
		eq(table.erRoomTable.statusId, StatusEnum.ACTIVE),
		eq(table.erRoomCategoryTable.statusId, StatusEnum.ACTIVE),
		eq(table.erWardTable.statusId, StatusEnum.ACTIVE),
		eq(table.erWardCategoryTable.statusId, StatusEnum.ACTIVE)
	];
	if (typeof input.erRoomId === 'number') {
		conditions.push(eq(table.erBedTable.erRoomId, input.erRoomId));
	}
	if (typeof input.erWardId === 'number') {
		conditions.push(eq(table.erRoomTable.erWardId, input.erWardId));
	}
	const rows = await ensureDb()
		.select({
			id: table.erBedTable.id,
			roomId: table.erBedTable.erRoomId,
			hospitalId: table.erBedTable.hospitalId,
			name: table.erBedTable.name,
			code: table.erBedTable.code,
			basePrice: table.erBedTable.basePrice,
			bedStatus: table.erBedTable.bedStatus,
			statusId: table.erBedTable.statusId,
			createdAt: table.erBedTable.createdAt,
			updatedAt: table.erBedTable.updatedAt,
			deletedAt: table.erBedTable.deletedAt,
			createdBy: table.erBedTable.createdBy,
			updatedBy: table.erBedTable.updatedBy,
			deletedBy: table.erBedTable.deletedBy,
			roomName: table.erRoomTable.name,
			wardId: table.erWardTable.id,
			wardName: table.erWardTable.name,
			dailyTariff: sql<string>`(
				coalesce(${table.erBedTable.basePrice}, 0)
				* (1 + coalesce(${table.erRoomCategoryTable.roomMarkup}, 0) / 100.0)
				* (1 + coalesce(${table.erWardCategoryTable.wardMarkup}, 0) / 100.0)
			)::text`
		})
		.from(table.erBedTable)
		.innerJoin(
			table.erRoomTable,
			eq(table.erBedTable.erRoomId, table.erRoomTable.id)
		)
		.innerJoin(
			table.erRoomCategoryTable,
			eq(
				table.erRoomTable.erRoomCategoryId,
				table.erRoomCategoryTable.id
			)
		)
		.innerJoin(
			table.erWardTable,
			eq(table.erRoomTable.erWardId, table.erWardTable.id)
		)
		.innerJoin(
			table.erWardCategoryTable,
			eq(
				table.erWardTable.erWardCategoryId,
				table.erWardCategoryTable.id
			)
		)
		.where(and(...conditions))
		.orderBy(table.erBedTable.name);
	return rows;
}

export async function getErBedById(input: {
	id: number;
}): Promise<ErBedSchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.erBedTable)
		.where(
			and(
				eq(table.erBedTable.id, input.id),
				ne(table.erBedTable.statusId, StatusEnum.DELETED)
			)
		);
	return row ?? null;
}

export async function createErBed(
	payload: ErBedSchemaInsert
): Promise<ErBedSchema> {
	await assertErRoomInHospital({
		hospitalId: payload.hospitalId,
		erRoomId: payload.erRoomId
	});
	const [row] = await ensureDb()
		.insert(table.erBedTable)
		.values({
			...payload,
			basePrice: String(payload.basePrice ?? '0'),
			bedStatus: payload.bedStatus ?? IpdBedStatusEnum.FREE
		})
		.returning();
	if (!row) throw new Error('Insert failed');
	await syncErRoomCapacityFromBeds({ erRoomId: payload.erRoomId });
	return row;
}

export async function updateErBed(payload: {
	id: number;
	hospitalId: string;
	erRoomId?: number;
	name?: string | null;
	code?: string | null;
	basePrice?: string | null;
	bedStatus?: number | null;
	statusId?: number | null;
}): Promise<ErBedSchema> {
	const { id, hospitalId, ...rest } = payload;
	const [current] = await ensureDb()
		.select({ erRoomId: table.erBedTable.erRoomId })
		.from(table.erBedTable)
		.where(
			and(
				eq(table.erBedTable.id, id),
				eq(table.erBedTable.hospitalId, hospitalId)
			)
		)
		.limit(1);
	if (!current) throw error(404, 'Bed not found');

	const previousRoomId = current.erRoomId;
	if (typeof rest.erRoomId === 'number') {
		await assertErRoomInHospital({
			hospitalId,
			erRoomId: rest.erRoomId
		});
	}
	const [row] = await ensureDb()
		.update(table.erBedTable)
		.set(rest as ErBedSchemaUpdate)
		.where(
			and(
				eq(table.erBedTable.id, id),
				eq(table.erBedTable.hospitalId, hospitalId)
			)
		)
		.returning();
	if (!row) throw new Error('Update failed');

	const nextRoomId = row.erRoomId;
	await syncErRoomCapacityFromBeds({ erRoomId: nextRoomId });
	if (previousRoomId !== nextRoomId) {
		await syncErRoomCapacityFromBeds({ erRoomId: previousRoomId });
	}
	return row;
}

export async function deleteErBed(input: { id: number }): Promise<void> {
	const [current] = await ensureDb()
		.select({ erRoomId: table.erBedTable.erRoomId })
		.from(table.erBedTable)
		.where(eq(table.erBedTable.id, input.id))
		.limit(1);
	await ensureDb()
		.update(table.erBedTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(eq(table.erBedTable.id, input.id));
	if (current) {
		await syncErRoomCapacityFromBeds({ erRoomId: current.erRoomId });
	}
}

export async function markBedAvailable(input: {
	id: number;
	hospitalId: string;
}): Promise<ErBedSchema> {
	const db = ensureDb();
	const [bed] = await db
		.select()
		.from(table.erBedTable)
		.where(
			and(
				eq(table.erBedTable.id, input.id),
				eq(table.erBedTable.hospitalId, input.hospitalId),
				ne(table.erBedTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!bed) throw error(404, 'Bed not found');
	if (bed.bedStatus === IpdBedStatusEnum.OCCUPIED) {
		throw error(400, 'Cannot mark an occupied bed as available');
	}

	// Clearance gate: last admission on this bed must be discharged and IP bill closed.
	const [lastAdmission] = await db
		.select({
			id: table.ipdAdmissionTable.id,
			visitId: table.ipdAdmissionTable.visitId,
			admissionStatus: table.ipdAdmissionTable.admissionStatus
		})
		.from(table.ipdAdmissionTable)
		.where(
			and(
				eq(table.ipdAdmissionTable.bedId, input.id),
				eq(table.ipdAdmissionTable.hospitalId, input.hospitalId),
				ne(table.ipdAdmissionTable.statusId, StatusEnum.DELETED)
			)
		)
		.orderBy(desc(table.ipdAdmissionTable.id))
		.limit(1);

	if (lastAdmission) {
		if (
			lastAdmission.admissionStatus !== IpdAdmissionStatusEnum.DISCHARGED
		) {
			throw error(
				400,
				'Bed cannot be freed until the admission is discharged'
			);
		}
		const [ipBill] = await db
			.select({
				id: table.ipBillingTable.id,
				statusTaggingId: table.ipBillingTable.statusTaggingId
			})
			.from(table.ipBillingTable)
			.where(
				and(
					eq(table.ipBillingTable.visitId, lastAdmission.visitId),
					eq(table.ipBillingTable.hospitalId, input.hospitalId),
					ne(table.ipBillingTable.statusId, StatusEnum.DELETED)
				)
			)
			.orderBy(desc(table.ipBillingTable.id))
			.limit(1);
		if (
			!ipBill ||
			ipBill.statusTaggingId !== BillingStatusTaggingEnum.CLOSED
		) {
			throw error(
				400,
				'Bed cannot be freed until the IP bill is closed (finance clearance)'
			);
		}
	}

	const [row] = await db
		.update(table.erBedTable)
		.set({ bedStatus: IpdBedStatusEnum.FREE })
		.where(eq(table.erBedTable.id, input.id))
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function markBedCleaning(input: {
	id: number;
	hospitalId: string;
}): Promise<ErBedSchema> {
	const [row] = await ensureDb()
		.update(table.erBedTable)
		.set({ bedStatus: IpdBedStatusEnum.CLEANING })
		.where(
			and(
				eq(table.erBedTable.id, input.id),
				eq(table.erBedTable.hospitalId, input.hospitalId)
			)
		)
		.returning();
	if (!row) throw error(404, 'Bed not found');
	return row;
}
