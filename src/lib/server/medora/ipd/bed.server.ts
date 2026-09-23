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
import { and, count, eq, ilike, ne } from 'drizzle-orm';

export async function getBedPaginated(
	params: PaginationParams & {
		hospitalId: string;
		wardId?: number;
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
	if (typeof params.wardId === 'number') {
		conditions.push(eq(table.bedTable.wardId, params.wardId));
	}
	if (typeof params.bedStatus === 'number') {
		conditions.push(eq(table.bedTable.bedStatus, params.bedStatus));
	}
	const whereClause = and(...conditions);
	const [data, countResult] = await Promise.all([
		ensureDb()
			.select({
				id: table.bedTable.id,
				wardId: table.bedTable.wardId,
				hospitalId: table.bedTable.hospitalId,
				name: table.bedTable.name,
				code: table.bedTable.code,
				bedStatus: table.bedTable.bedStatus,
				statusId: table.bedTable.statusId,
				wardName: table.wardTable.name,
				wardCode: table.wardTable.code
			})
			.from(table.bedTable)
			.leftJoin(
				table.wardTable,
				eq(table.bedTable.wardId, table.wardTable.id)
			)
			.where(whereClause)
			.orderBy(table.bedTable.name)
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.bedTable)
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
	wardId: number;
}): Promise<BedSchema[]> {
	return ensureDb()
		.select()
		.from(table.bedTable)
		.where(
			and(
				eq(table.bedTable.hospitalId, input.hospitalId),
				eq(table.bedTable.wardId, input.wardId),
				eq(table.bedTable.bedStatus, IpdBedStatusEnum.FREE),
				eq(table.bedTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.orderBy(table.bedTable.name);
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
	const [row] = await ensureDb()
		.insert(table.bedTable)
		.values({
			...payload,
			bedStatus: payload.bedStatus ?? IpdBedStatusEnum.FREE
		})
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updateBed(payload: {
	id: number;
	wardId?: number;
	name?: string | null;
	code?: string | null;
	bedStatus?: number | null;
	statusId?: number | null;
}): Promise<BedSchema> {
	const { id, ...rest } = payload;
	const [row] = await ensureDb()
		.update(table.bedTable)
		.set(rest as BedSchemaUpdate)
		.where(eq(table.bedTable.id, id))
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function deleteBed(input: { id: number }): Promise<void> {
	await ensureDb()
		.update(table.bedTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(eq(table.bedTable.id, input.id));
}
